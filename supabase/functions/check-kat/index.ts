const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const BROWSER_HEADERS = {
  'User-Agent': UA,
  'Accept-Language': 'bg-BG,bg;q=0.9,en;q=0.8',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { egn = '', license = '' } = await req.json()
    const url = `https://e-uslugi.mvr.bg/api/Obligations/AND?mode=1&obligedPersonIdent=${encodeURIComponent(egn)}&drivingLicenceNumber=${encodeURIComponent(license)}`

    // Имитация на браузърна сесия: първо страницата (сесийна бисквитка), после API-то
    let cookie = ''
    try {
      const pageResp = await fetch('https://e-uslugi.mvr.bg/services/obligations', {
        headers: { ...BROWSER_HEADERS, Accept: 'text/html,application/xhtml+xml', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Site': 'none' },
        signal: AbortSignal.timeout(10000),
      })
      cookie = pageResp.headers.get('set-cookie')?.match(/EAUSessionID=[^;]+/)?.[0] ?? ''
      await pageResp.body?.cancel()
    } catch {
      // страницата не е задължителна — API-то се опитва и без бисквитка
    }

    const resp = await fetch(url, {
      headers: {
        ...BROWSER_HEADERS,
        Accept: 'application/json',
        Referer: 'https://e-uslugi.mvr.bg/services/obligations',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      signal: AbortSignal.timeout(20000),
    }).catch(() => {
      throw new Error('__mvr_down__')
    })

    const data = await resp.json() as {
      obligationsData?: Array<{
        unitGroup: number
        errorNoDataFound: boolean
        errorReadingData: boolean
        obligations: unknown[]
      }>
    }

    const groups = data?.obligationsData ?? []

    if (groups.length === 0 || groups.every((g) => g.errorReadingData)) {
      return Response.json(
        { hasObligations: false, count: 0, message: 'Невалидни данни.' },
        { headers: CORS }
      )
    }

    let count = 0
    for (const g of groups) {
      if (!g.errorReadingData && g.obligations) {
        count += g.obligations.length
      }
    }

    const message = count === 0 ? 'Няма задължения' : `${count} ${count === 1 ? 'задължение' : 'задължения'}`
    return Response.json({ hasObligations: count > 0, count, message }, { headers: CORS })
  } catch (err) {
    if (err instanceof Error && err.message === '__mvr_down__') {
      return Response.json(
        { hasObligations: false, count: 0, message: 'Грешка: сайтът на МВР не отговаря — опитай по-късно.' },
        { headers: CORS }
      )
    }
    return new Response(
      JSON.stringify({ hasObligations: false, count: 0, message: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
