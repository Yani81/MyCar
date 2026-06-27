const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

const GF_BASE = 'https://www.guaranteefund.org'
const CHECK_URL =
  GF_BASE +
  '/bg/%D0%B8%D0%BD%D1%84%D0%BE%D1%80%D0%BC%D0%B0%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D0%BD-%D1%86%D0%B5%D0%BD%D1%82%D1%8A%D1%80-%D0%B8-%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BA%D0%B8/%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8/%D0%BF%D1%80%D0%BE%D0%B2%D0%B5%D1%80%D0%BA%D0%B0-%D0%B7%D0%B0-%D0%B2%D0%B0%D0%BB%D0%B8%D0%B4%D0%BD%D0%B0-%D0%B7%D0%B0%D1%81%D1%82%D1%80%D0%B0%D1%85%D0%BE%D0%B2%D0%BA%D0%B0-%D0%B3%D1%80a%D0%B6%D0%B4a%D0%BD%D1%81%D0%BAa-%D0%BE%D1%82%D0%B3%D0%BE%D0%B2%D0%BE%D1%80%D0%BD%D0%BE%D1%81%D1%82-%D0%BD%D0%B0-%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%BE%D0%B1%D0%B8%D0%BB%D0%B8%D1%81%D1%82%D0%B8%D1%82%D0%B5'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const SECTIGO_CA = `-----BEGIN CERTIFICATE-----
MIIGTDCCBDSgAwIBAgIQOXpmzCdWNi4NqofKbqvjsTANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNMzYwMzIxMjM1OTU5WjBgMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gQ0EgRFYgUjM2MIIBojANBgkqhkiG9w0B
AQEFAAOCAY8AMIIBigKCAYEAljZf2HIz7+SPUPQCQObZYcrxLTHYdf1ZtMRe7Yeq
RPSwygz16qJ9cAWtWNTcuICc++p8Dct7zNGxCpqmEtqifO7NvuB5dEVexXn9RFFH
12Hm+NtPRQgXIFjx6MSJcNWuVO3XGE57L1mHlcQYj+g4hny90aFh2SCZCDEVkAja
EMMfYPKuCjHuuF+bzHFb/9gV8P9+ekcHENF2nR1efGWSKwnfG5RawlkaQDpRtZTm
M64TIsv/r7cyFO4nSjs1jLdXYdz5q3a4L0NoabZfbdxVb+CUEHfB0bpulZQtH1Rv
38e/lIdP7OTTIlZh6OYL6NhxP8So0/sht/4J9mqIGxRFc0/pC8suja+wcIUna0HB
pXKfXTKpzgis+zmXDL06ASJf5E4A2/m+Hp6b84sfPAwQ766rI65mh50S0Di9E3Pn
2WcaJc+PILsBmYpgtmgWTR9eV9otfKRUBfzHUHcVgarub/XluEpRlTtZudU5xbFN
xx/DgMrXLUAPaI60fZ6wA+PTAgMBAAGjggGBMIIBfTAfBgNVHSMEGDAWgBRWc1hk
lfmSGrASKgRieaFAFYghSTAdBgNVHQ4EFgQUaMASFhgOr872h6YyV6NGUV3LBycw
DgYDVR0PAQH/BAQDAgGGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0lBBYwFAYI
KwYBBQUHAwEGCCsGAQUFBwMCMBsGA1UdIAQUMBIwBgYEVR0gADAIBgZngQwBAgEw
VAYDVR0fBE0wSzBJoEegRYZDaHR0cDovL2NybC5zZWN0aWdvLmNvbS9TZWN0aWdv
UHVibGljU2VydmVyQXV0aGVudGljYXRpb25Sb290UjQ2LmNybDCBhAYIKwYBBQUH
AQEEeDB2ME8GCCsGAQUFBzAChkNodHRwOi8vY3J0LnNlY3RpZ28uY29tL1NlY3Rp
Z29QdWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYucDdjMCMGCCsGAQUF
BzABhhdodHRwOi8vb2NzcC5zZWN0aWdvLmNvbTANBgkqhkiG9w0BAQwFAAOCAgEA
YtOC9Fy+TqECFw40IospI92kLGgoSZGPOSQXMBqmsGWZUQ7rux7cj1du6d9rD6C8
ze1B2eQjkrGkIL/OF1s7vSmgYVafsRoZd/IHUrkoQvX8FZwUsmPu7amgBfaY3g+d
q1x0jNGKb6I6Bzdl6LgMD9qxp+3i7GQOnd9J8LFSietY6Z4jUBzVoOoz8iAU84OF
h2HhAuiPw1ai0VnY38RTI+8kepGWVfGxfBWzwH9uIjeooIeaosVFvE8cmYUB4TSH
5dUyD0jHct2+8ceKEtIoFU/FfHq/mDaVnvcDCZXtIgitdMFQdMZaVehmObyhRdDD
4NQCs0gaI9AAgFj4L9QtkARzhQLNyRf87Kln+YU0lgCGr9HLg3rGO8q+Y4ppLsOd
unQZ6ZxPNGIfOApbPVf5hCe58EZwiWdHIMn9lPP6+F404y8NNugbQixBber+x536
WrZhFZLjEkhp7fFXf9r32rNPfb74X/U90Bdy4lzp3+X1ukh1BuMxA/EEhDoTOS3l
7ABvc7BYSQubQ2490OcdkIzUh3ZwDrakMVrbaTxUM2p24N6dB+ns2zptWCva6jzW
r8IWKIMxzxLPv5Kt3ePKcUdvkBU/smqujSczTzzSjIoR5QqQA6lN1ZRSnuHIWCvh
JEltkYnTAH41QJ6SAWO66GrrUESwN/cgZzL4JLEqz1Y=
-----END CERTIFICATE-----`

const httpClient = Deno.createHttpClient({ caCerts: [SECTIGO_CA] })

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
  maxNumber?: number
  maxnumber?: number
  salt: string
  signature: string
}): Promise<string> {
  const max = ch.maxNumber ?? ch.maxnumber ?? 100000
  const start = Date.now()
  for (let n = 0; n <= max; n++) {
    if ((await sha256hex(ch.salt + n)) === ch.challenge) {
      return btoa(
        JSON.stringify({
          algorithm: ch.algorithm,
          challenge: ch.challenge,
          number: n,
          salt: ch.salt,
          signature: ch.signature,
          took: Date.now() - start,
        })
      )
    }
  }
  throw new Error(`CAPTCHA: solution not found within ${max}`)
}

function parseCookieMap(resp: Response): Map<string, string> {
  const map = new Map<string, string>()
  // deno-lint-ignore no-explicit-any
  const setCookieHeaders: string[] =
    // deno-lint-ignore no-explicit-any
    typeof (resp.headers as any).getSetCookie === 'function'
      // deno-lint-ignore no-explicit-any
      ? (resp.headers as any).getSetCookie()
      : (resp.headers.get('set-cookie') ?? '').split(/,\s*(?=[A-Za-z_][^=]+=)/)
  for (const header of setCookieHeaders) {
    const pair = header.trim().split(';')[0].trim()
    const eq = pair.indexOf('=')
    if (eq > 0) {
      map.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim())
    }
  }
  return map
}

function mergeMaps(a: Map<string, string>, b: Map<string, string>): Map<string, string> {
  const result = new Map(a)
  for (const [k, v] of b) result.set(k, v)
  return result
}

function cookieString(map: Map<string, string>): string {
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

function parseResult(html: string): { valid: boolean; message: string; validUntil?: string } | null {
  const idx = html.search(/id=["']printresult["']/)
  if (idx < 0) return null
  const section = html.slice(idx, idx + 5000)

  const h6 = section.match(/<h6[^>]*>([\s\S]*?)<\/h6>/)
  if (!h6) {
    const text = section.slice(0, 500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return { valid: !text.toLowerCase().includes('няма валидна'), message: text }
  }
  const text = h6[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const valid = !text.toLowerCase().includes('няма валидна')

  let validUntil: string | undefined
  if (valid) {
    const tableMatch = section.match(/<table[^>]*class=["'][^"']*success-results[^"']*["'][^>]*>([\s\S]*?)<\/table>/i)
    if (tableMatch) {
      const tableHtml = tableMatch[1]
      const headers = [...tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
        .map((m) => m[1].replace(/<[^>]+>/g, '').trim().toLowerCase())
      const endIdx = headers.findIndex((h) => h.includes('край') || h.includes('до') || h.includes('end'))
      if (endIdx >= 0) {
        const cells = [...tableHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
          .map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
        if (cells[endIdx]) validUntil = cells[endIdx]
      }
    }
  }

  return { valid, message: text, validUntil }
}

const BASE_HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'bg,bg-BG;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const { plate = '' } = await req.json()

    // 1. GET page — establish session cookies + extract form fields
    const pageResp = await fetch(CHECK_URL, {
      headers: { ...BASE_HEADERS },
      redirect: 'follow',
      client: httpClient,
    } as RequestInit)
    const cookieMap = parseCookieMap(pageResp)
    const pageHtml = await pageResp.text()

    const formInputs: Record<string, string> = {}
    for (const m of pageHtml.matchAll(/<input([^>]*)>/gi)) {
      const attrs = m[1]
      const name = attrs.match(/name=["']([^"']+)["']/)?.[1]
      const value = attrs.match(/value=["']([^"']*?)["']/)?.[1] ?? ''
      if (name) formInputs[name] = value
    }

    // 2. Accept cookie policy
    const consentResp = await fetch(`${GF_BASE}/ajax/sendagreement.php`, {
      method: 'POST',
      headers: {
        ...BASE_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieString(cookieMap),
        Referer: CHECK_URL,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: 'agreewithcookiepolicy=1',
      client: httpClient,
    } as RequestInit)
    const postConsentCookies = mergeMaps(cookieMap, parseCookieMap(consentResp))
    await consentResp.body?.cancel()

    // 3. Fetch ALTCHA challenge
    const chalResp = await fetch(`${GF_BASE}/ajax/altchagenchlange.php?code=1`, {
      headers: {
        ...BASE_HEADERS,
        Cookie: cookieString(postConsentCookies),
        Referer: CHECK_URL,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/plain, */*',
      },
      client: httpClient,
    } as RequestInit)
    const finalCookieMap = mergeMaps(postConsentCookies, parseCookieMap(chalResp))
    const challengeText = await chalResp.text()
    let challenge: Record<string, unknown>
    try {
      challenge = JSON.parse(challengeText)
    } catch {
      throw new Error('Challenge parse failed: ' + challengeText.slice(0, 200))
    }
    const altchaSolution = await solveAltcha(challenge as Parameters<typeof solveAltcha>[0])

    // 4. POST form
    // The PHP ALTCHA library reads $_POST['altcha']; altcha_checkbox is the jQuery Validate field name
    const formBody = new URLSearchParams({
      ...formInputs,
      dkn: plate,
      rama: '',
      stiker: '',
      seria: '',
      altcha: altchaSolution,
      altcha_checkbox: altchaSolution,
      send: formInputs['send'] ?? 'търси',
    })

    const resultResp = await fetch(CHECK_URL, {
      method: 'POST',
      headers: {
        ...BASE_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieString(finalCookieMap),
        Origin: GF_BASE,
        Referer: CHECK_URL,
      },
      body: formBody.toString(),
      redirect: 'follow',
      client: httpClient,
    } as RequestInit)

    const html = await resultResp.text()
    const result = parseResult(html)

    if (result) {
      return new Response(JSON.stringify(result), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ valid: false, message: 'Не може да се прочете отговорът.' }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, message: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
