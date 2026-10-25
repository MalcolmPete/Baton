import type { ImageBlock, Annotation } from '../types'

function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, headLen: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
}

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation, w: number, h: number) {
  ctx.strokeStyle = '#EF4444'
  ctx.fillStyle = '#EF4444'
  ctx.lineWidth = Math.max(2, w * 0.003)

  if (ann.type === 'circle' && ann.radius != null) {
    ctx.beginPath()
    ctx.arc((ann.x / 100) * w, (ann.y / 100) * h, (ann.radius / 100) * w, 0, Math.PI * 2)
    ctx.stroke()
  } else if (ann.type === 'arrow' && ann.x2 != null && ann.y2 != null) {
    const x1 = (ann.x / 100) * w, y1 = (ann.y / 100) * h
    const x2 = (ann.x2 / 100) * w, y2 = (ann.y2 / 100) * h
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    drawArrowHead(ctx, x1, y1, x2, y2, Math.max(12, w * 0.015))
  }
}

// Accepts either a block (with storagePath → resolved to imgSrc externally)
// or a direct { imgSrc, annotations } for the read-only viewer.
export function renderAnnotatedImage(
  block: Pick<ImageBlock, 'annotations'> & { imgSrc: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (block.annotations.length === 0) { resolve(block.imgSrc); return }
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      for (const ann of block.annotations) drawAnnotation(ctx, ann, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = block.imgSrc
  })
}
