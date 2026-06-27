const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { plate = '', egn = '', country = 'BG' } = await req.json()
    const url = `https://check.bgtoll.bg/check/violation/v2/plate/${country}/${encodeURIComponent(plate)}/${encodeURIComponent(egn)}`

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
        Referer: 'https://check.bgtoll.bg/',
      },
    })

    const data = await resp.json() as {
      ok: boolean
      data?: { delictList?: unknown[] }
    }

    if (!data.ok) {
      return Response.json(
        { hasDelicts: false, count: 0, message: 'Невалидни данни или грешен ЕГН/ЕИК.' },
        { headers: CORS }
      )
    }

    const list = data?.data?.delictList ?? []
    const count = list.length
    const message = count === 0 ? 'Няма глоби' : `${count} ${count === 1 ? 'глоба' : 'глоби'}`

    return Response.json({ hasDelicts: count > 0, count, message }, { headers: CORS })
  } catch (err) {
    return new Response(
      JSON.stringify({ hasDelicts: false, count: 0, message: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
