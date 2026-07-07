/** Град от текущата локация (Geolocation + Nominatim). null при отказ/грешка/офлайн. */
export async function currentCity(): Promise<string | null> {
  if (!('geolocation' in navigator)) return null
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 300000 })
    )
    const { latitude, longitude } = pos.coords
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=bg&zoom=10`
    )
    if (!res.ok) return null
    const j = await res.json()
    const a = j.address ?? {}
    return a.city ?? a.town ?? a.village ?? a.municipality ?? null
  } catch {
    return null
  }
}
