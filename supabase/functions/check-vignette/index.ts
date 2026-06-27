const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { plate = '', country = 'BG' } = await req.json()
    const url = `https://check.bgtoll.bg/check/vignette/plate/${country}/${encodeURIComponent(plate)}`

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    })
    const data = await resp.json() as {
      ok: boolean
      vignette?: {
        statusBoolean: boolean
        validityDateToFormated?: string
      }
    }

    if (!data.ok || !data.vignette) {
      return Response.json(
        { valid: false, message: `Няма намерена винетка за ${plate}` },
        { headers: CORS }
      )
    }

    const v = data.vignette
    const valid = v.statusBoolean === true
    const validUntil = v.validityDateToFormated?.split(' ')[0]
    const message = valid
      ? `Превозно средство ${plate} има валидна винетка`
      : `Превозно средство ${plate} няма валидна винетка`

    return Response.json({ valid, validUntil, message }, { headers: CORS })
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
