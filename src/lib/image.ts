import { supabase } from './supabase'
import { uid } from './id'

/** Свива снимка до макс 1000px и я връща като JPEG data URL. */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1000
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Компресира бележка и я качва в Supabase Storage (bucket „receipts").
 * Връща публичен URL; при неуспех (няма bucket, офлайн, без акаунт) — base64,
 * както работеше досега. Рендерът приема и двата формата.
 */
/** Трие снимка от Storage, ако е качена там (URL). Старите base64 снимки се игнорират. */
export function deleteReceipt(url: string | undefined): void {
  if (!url || !url.startsWith('http')) return
  const marker = '/receipts/'
  const i = url.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(url.slice(i + marker.length))
  supabase.storage.from('receipts').remove([path]).catch(() => {})
}

export async function processReceipt(file: File): Promise<string> {
  const dataUrl = await compressImage(file)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return dataUrl

    const blob = await (await fetch(dataUrl)).blob()
    const path = `${user.id}/${uid()}.jpg`
    const { error } = await supabase.storage
      .from('receipts')
      .upload(path, blob, { contentType: 'image/jpeg' })
    if (error) return dataUrl

    const { data } = supabase.storage.from('receipts').getPublicUrl(path)
    return data.publicUrl || dataUrl
  } catch {
    return dataUrl
  }
}
