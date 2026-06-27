const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const GTP_BASE = 'https://rta.government.bg/services/check-inspection'
const CHECK_URL = GTP_BASE + '/checkinsp.php'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function solveCaptcha(): Promise<{ captcha: string; session: string }> {
  const rand = Math.round(Math.random() * 9999)

  const captchaResp = await fetch(
    `${CHECK_URL}?captcha/inspection=1&rand=${rand}`,
    { headers: { 'User-Agent': UA, Accept: 'image/*,*/*' } }
  )

  // deno-lint-ignore no-explicit-any
  const setCookieHeaders: string[] =
    typeof (captchaResp.headers as any).getSetCookie === 'function'
      // deno-lint-ignore no-explicit-any
      ? (captchaResp.headers as any).getSetCookie()
      : [captchaResp.headers.get('set-cookie') ?? '']
  const sessionCookie =
    setCookieHeaders.find((h) => h.includes('PHPSESSID'))?.match(/PHPSESSID=[^;]+/)?.[0] ?? ''

  const captchaBytes = await captchaResp.arrayBuffer()
  const captchaBase64 = arrayBufferToBase64(captchaBytes)

  // OCR.space free tier — no registration needed
  const ocrBody = new URLSearchParams({
    base64Image: 'data:image/jpeg;base64,' + captchaBase64,
    OCREngine: '2',
    isOverlayRequired: 'false',
    scale: 'true',
  })

  const ocrResp = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: 'helloworld',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: ocrBody.toString(),
  })

  const ocrJson = await ocrResp.json() as { ParsedResults?: Array<{ ParsedText: string }> }
  const rawText = ocrJson.ParsedResults?.[0]?.ParsedText ?? ''
  const captcha = rawText.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4)

  return { captcha, session: sessionCookie }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { plate = '' } = await req.json()

    // Retry up to 4 times in case of OCR misread
    for (let attempt = 0; attempt < 4; attempt++) {
      const { captcha, session } = await solveCaptcha()

      if (captcha.length !== 4) continue

      const checkResp = await fetch(CHECK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: session,
          'User-Agent': UA,
          Referer: GTP_BASE + '/index.html',
          Origin: 'https://rta.government.bg',
        },
        body: new URLSearchParams({ regNum: plate, captcha }).toString(),
      })

      const rawText = await checkResp.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(rawText)
      } catch {
        throw new Error('Non-JSON response: ' + rawText.slice(0, 200))
      }

      // Wrong captcha — retry
      if (data.validation && (data.validation as Record<string, unknown>).captchaValid === false) continue

      // No inspection found
      if (data.error === 'InspectionNotFoundException' || data.rvIdentNum === '') {
        return new Response(
          JSON.stringify({ valid: false, message: `Няма намерен ГТП за ${plate}` }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      // Has result
      if (data.rvIdentNum !== undefined) {
        const valid = !!data.isValid
        const validUntil: string | undefined = (data.nextInspectionDate as string) || undefined
        const message = valid
          ? `Превозно средство ${plate} има валиден ГТП`
          : `Превозно средство ${plate} няма валиден ГТП`
        return new Response(
          JSON.stringify({ valid, validUntil, message }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      throw new Error('Неочакван отговор: ' + JSON.stringify(data).slice(0, 100))
    }

    throw new Error('Не успяхме да решим CAPTCHA след 4 опита')
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
