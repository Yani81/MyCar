import { useEffect, useRef } from 'react'
import { toCanvas } from 'qrcode'

export function QRCode({ value }: { value: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (ref.current && value) toCanvas(ref.current, value, { width: 220, margin: 1 })
  }, [value])

  return <canvas ref={ref} style={{ width: '100%', maxWidth: 220, height: 'auto', margin: '0 auto', display: 'block' }} />
}
