import { useEffect, useRef } from 'react'
import { drawBarcode } from '../../lib/barcode'

export function Barcode({ value }: { value: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (ref.current) drawBarcode(ref.current, value)
  }, [value])

  return <canvas ref={ref} style={{ width: '100%', height: 'auto' }} />
}
