const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { egn = '', license = '' } = await req.json()
    const url = `https://e-uslugi.mvr.bg/api/Obligations/AND?mode=1&obligedPersonIdent=${encodeURIComponent(egn)}&drivingLicenceNumber=${encodeURIComponent(license)}`

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
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
