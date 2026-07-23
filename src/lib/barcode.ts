import JsBarcode from 'jsbarcode'

export function drawBarcode(canvas: HTMLCanvasElement, value: string) {
  if (!value) return
  JsBarcode(canvas, value, { format: 'CODE128', width: 2, height: 80, displayValue: false, margin: 8 })
}
