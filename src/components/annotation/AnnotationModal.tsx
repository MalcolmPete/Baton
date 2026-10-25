import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Circle, Arrow } from 'react-konva'
import { v4 as uuidv4 } from 'uuid'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { supabase, getImageUrl } from '../../lib/supabase'
import { updateImageBlock } from '../../store/useDocs'
import type { Annotation, ImageBlock } from '../../types'

type Tool = 'circle' | 'arrow'
interface DrawState { startX: number; startY: number; currentX: number; currentY: number }

const MAX_STAGE_WIDTH = 680

export function AnnotationModal({ imageId, onClose }: { imageId: string; onClose: () => void }) {
  const [imageBlock, setImageBlock] = useState<ImageBlock | null>(null)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('circle')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [drawing, setDrawing] = useState<DrawState | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    supabase.from('image_blocks').select('*').eq('id', imageId).maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const block: ImageBlock = {
          id: data.id as string,
          docId: data.doc_id as string,
          storagePath: data.storage_path as string,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          annotations: (data.annotations as any[]) ?? [],
        }
        setImageBlock(block)
        setAnnotations([...block.annotations])
        setImgUrl(getImageUrl(block.storagePath))
      })
  }, [imageId])

  function handleImageLoad() {
    const img = imgRef.current!
    const scale = Math.min(1, MAX_STAGE_WIDTH / img.naturalWidth)
    setStageSize({ width: img.naturalWidth * scale, height: img.naturalHeight * scale })
  }

  function toPercent(px: number, dim: number) { return (px / dim) * 100 }
  function toPixels(pct: number, dim: number) { return (pct / 100) * dim }

  function handleMouseDown(e: { evt: MouseEvent }) {
    const { offsetX, offsetY } = e.evt
    setDrawing({ startX: offsetX, startY: offsetY, currentX: offsetX, currentY: offsetY })
  }
  function handleMouseMove(e: { evt: MouseEvent }) {
    if (!drawing) return
    setDrawing(d => d ? { ...d, currentX: e.evt.offsetX, currentY: e.evt.offsetY } : null)
  }
  function handleMouseUp() {
    if (!drawing || stageSize.width === 0) return
    const { startX, startY, currentX, currentY } = drawing
    const dist = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2)
    if (dist < 5) { setDrawing(null); return }
    const ann: Annotation = tool === 'circle'
      ? { id: uuidv4(), type: 'circle', x: toPercent(startX, stageSize.width), y: toPercent(startY, stageSize.height), radius: toPercent(dist, stageSize.width) }
      : { id: uuidv4(), type: 'arrow', x: toPercent(startX, stageSize.width), y: toPercent(startY, stageSize.height), x2: toPercent(currentX, stageSize.width), y2: toPercent(currentY, stageSize.height) }
    setAnnotations(prev => [...prev, ann])
    setDrawing(null)
  }

  async function handleSave() {
    await updateImageBlock(imageId, { annotations })
    onClose()
  }

  if (!imageBlock || !imgUrl) return null
  const { width: sw, height: sh } = stageSize

  let previewShape: React.ReactNode = null
  if (drawing && sw > 0) {
    const { startX, startY, currentX, currentY } = drawing
    const r = Math.sqrt((currentX - startX) ** 2 + (currentY - startY) ** 2)
    previewShape = tool === 'circle'
      ? <Circle x={startX} y={startY} radius={r} stroke="#EF4444" strokeWidth={2} dash={[6,3]} listening={false} />
      : <Arrow points={[startX,startY,currentX,currentY]} stroke="#EF4444" strokeWidth={2} fill="#EF4444" pointerLength={10} pointerWidth={8} dash={[6,3]} listening={false} />
  }

  return (
    <Modal title="Annotate Image" onClose={onClose} maxWidth={768}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Tool:</span>
          {(['circle', 'arrow'] as Tool[]).map(t => (
            <button key={t} onClick={() => setTool(t)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', backgroundColor: tool === t ? 'var(--text-1)' : 'var(--bg-subtle)', color: tool === t ? 'var(--bg)' : 'var(--text-2)' }}>
              {t === 'circle' ? '○ Circle' : '→ Arrow'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', alignSelf: 'center' }} >
          <img ref={imgRef} src={imgUrl} alt="" onLoad={handleImageLoad} style={sw > 0 ? { width: sw, height: sh, display: 'block' } : { maxWidth: '100%' }} draggable={false} crossOrigin="anonymous" />
          {sw > 0 && (
            <Stage width={sw} height={sh} style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
              <Layer>
                {annotations.map(ann => ann.type === 'circle' && ann.radius != null
                  ? <Circle key={ann.id} x={toPixels(ann.x,sw)} y={toPixels(ann.y,sh)} radius={toPixels(ann.radius,sw)} stroke="#EF4444" strokeWidth={2} listening={false} />
                  : ann.type === 'arrow' && ann.x2 != null && ann.y2 != null
                    ? <Arrow key={ann.id} points={[toPixels(ann.x,sw),toPixels(ann.y,sh),toPixels(ann.x2,sw),toPixels(ann.y2,sh)]} stroke="#EF4444" strokeWidth={2} fill="#EF4444" pointerLength={10} pointerWidth={8} listening={false} />
                    : null
                )}
                {previewShape}
              </Layer>
            </Stage>
          )}
        </div>

        {annotations.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {annotations.map((ann, i) => (
              <span key={ann.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--bg-subtle)', color: 'var(--text-2)', fontSize: 12, padding: '3px 8px', borderRadius: 6 }}>
                {ann.type === 'circle' ? '○' : '→'} #{i+1}
                <button onClick={() => setAnnotations(p => p.filter(a => a.id !== ann.id))} style={{ color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <Button variant="ghost" onClick={() => setAnnotations([])}>Clear all</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save annotations</Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
