const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const GF_BASE = 'https://www.guaranteefund.org'
const CHECK_URL =
  GF_BASE +
  '/bg/%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D0%BD-%D1%86%D0%B5%D0%BD%D1%82%D1%8A%D1%80-%D0%B8-%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BA%D0%B8/%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8/%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0-%D0%B7%D0%B0-%D0%B2%D0%B0%D0%BB%D0%B8%D0%B4%D0%BD%D0%B0-%D0%B7%D0%B0%D1%81%D1%82%D1%80%D0%B0%D1%85%D0%BE%D0%B2%D0%BA%D0%B0-%D0%B3%D1%80a%D0%B6%D0%B4a%D0%BD%D1%81%D0%BAa-%D0%BE%D1%82%D0%B3%D0%BE%D0%B2%D0%BE%D1%80%D0%BD%D0%BE%D1%81%D1%82-%D0%BD%D0%B0-%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D0%B8%D1%81%D1%82%D0%B8%D1%82%D0%B5'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function solveAltcha(ch: {
  algorithm: string
  challenge: string
  maxnumber: number
  salt: string
  signature: string
}): Promise<string> {
  for (let n = 0; n <= ch.maxnumber; n++) {
    if ((await sha256hex(ch.salt + n)) === ch.challenge) {
      return btoa(
        JSON.stringify({
          algorithm: ch.algorithm,
          challenge: ch.challenge,
          number: n,
          salt: ch.salt,
          signature: ch.signature,
        })
      )
    }
  }
  throw new Error('CAPTCHA: solution not found within maxnumber')
}

function extractCookies(resp: Response): string {
  const raw = resp.headers.get('set-cookie') ?? ''
  if (!raw) return ''
  return raw
    .split(/,\s*(?=[A-Za-z_][^=]+=)/)
    .map((c) => c.trim().split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function bgDate(d: Date): string {
  return `${padTwo(d.getDate())}/${padTwo(d.getMonth() + 1)}/${d.getFullYear()}`
}

function bgTime(d: Date): string {
  return `${padTwo(d.getHours())}:${padTwo(d.getMinutes())}`
}

function parseResult(html: string): { valid: boolean; message: string } {
  const block = html.match(/id="printresult"[^>]*>([\s\S]*?)<\/div>/)
  if (!block) {
    return { valid: false, message: 'Не може да се прочете отговорът от сайта.' }
  }
  const text = block[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const valid = !text.toLowerCase().includes('няма валидна') // "няма валидна"
  return { valid, message: text }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { plate = '' } = await req.json()

    const now = new Date()

    // 1. Session cookie
    const pageResp = await fetch(CHECK_URL, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    })
    const cookie = extractCookies(pageResp)

    // 2. CAPTCHA challenge
    const chalResp = await fetch(`${GF_BASE}/ajax/altchagenchlange.php?code=1`, {
      headers: { Cookie: cookie, 'User-Agent': UA },
    })
    const challenge = await chalResp.json()

    // 3. Solve SHA-256 proof-of-work
    const altchaSolution = await solveAltcha(challenge)

    // 4. POST form
    const formBody = new URLSearchParams({
      dkn: plate,
      rama: '',
      stiker: '',
      seria: '',
      date: bgDate(now),
      datepickertime: bgTime(now),
      altcha_checkbox: altchaSolution,
      send: 'търси', // "търси"
    })

    const resultResp = await fetch(CHECK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        'User-Agent': UA,
        Origin: GF_BASE,
        Referer: CHECK_URL,
      },
      body: formBody.toString(),
      redirect: 'follow',
    })

    const html = await resultResp.text()
    const result = parseResult(html)

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
