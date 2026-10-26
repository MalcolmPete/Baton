import { useEffect, useState } from 'react'
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react'
import { getImageUrl } from '../../lib/supabase'
import { useImageBlock } from '../../store/useDocs'
import { useAnnotationContext } from '../annotation/AnnotationContext'
import { useViewer } from '../../context/ViewerContext'
import { renderAnnotatedImage } from '../../lib/renderAnnotatedImage'
import type { Annotation } from '../../types'

const WIDTHS = [25, 50, 75, 100] as const
type Align = 'left' | 'center' | 'right'

const ALIGN_ICONS: Record<Align, string> = { left: '←', center: '↔', right: '→' }

export function ImageNodeView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const { imageId, caption, width, align } = node.attrs as {
    imageId: string; caption: string; width: number; align: Align
  }
  const { openAnnotation } = useAnnotationContext()
  const { imageBlocks: viewerBlocks, isReadOnly } = useViewer()

  // Pre-fetched data is a snapshot, so editors read the live row to see annotation changes
  const viewerData = isReadOnly ? viewerBlocks[imageId] : undefined
  const dbBlock = useImageBlock(viewerData ? null : imageId)

  const storagePath = viewerData?.storagePath ?? dbBlock?.storagePath ?? null
  const annotations = (viewerData?.annotations ?? dbBlock?.annotations ?? []) as Annotation[]
  const rawUrl = storagePath ? getImageUrl(storagePath) : null

  const [displayUrl, setDisplayUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!rawUrl) { setDisplayUrl(null); return }
    if (annotations.length === 0) { setDisplayUrl(rawUrl); return }
    renderAnnotatedImage({ imgSrc: rawUrl, annotations })
      .then(url => setDisplayUrl(url))
      .catch(() => setDisplayUrl(rawUrl))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawUrl, JSON.stringify(annotations)])

  const hasAnnotations = annotations.length > 0
  const isLoading = !rawUrl

  const justification =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'

  return (
    <NodeViewWrapper className="my-6 group" data-drag-handle="">
      {/* Alignment wrapper */}
      <div style={{ display: 'flex', justifyContent: justification }}>
        {/* Sized container */}
        <div style={{ width: `${width ?? 100}%`, position: 'relative' }}>
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {isLoading ? (
              <div style={{ height: 96, backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                Loading image…
              </div>
            ) : (
              <img
                src={displayUrl ?? rawUrl}
                alt={caption}
                style={{ width: '100%', display: 'block' }}
                draggable={false}
                crossOrigin="anonymous"
              />
            )}

            {/* Top-right: annotate + delete */}
            {!isReadOnly && !isLoading && (
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}
              >
                <button
                  onClick={() => openAnnotation(imageId)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: 'var(--text-1)', fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  {hasAnnotations ? `✎ ${annotations.length} annotation${annotations.length !== 1 ? 's' : ''}` : '✎ Annotate'}
                </button>
                <button
                  onClick={deleteNode}
                  style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: '#c0392b', fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
                >×</button>
              </div>
            )}

            {/* Bottom centre: resize + align controls */}
            {!isReadOnly && !isLoading && (
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', alignItems: 'center', gap: 2,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, padding: '3px 6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {/* Width presets */}
                {WIDTHS.map(pct => (
                  <button
                    key={pct}
                    onClick={() => updateAttributes({ width: pct })}
                    style={{
                      fontSize: 10, padding: '2px 5px', borderRadius: 4, border: 'none', cursor: 'pointer',
                      backgroundColor: (width ?? 100) === pct ? 'var(--text-1)' : 'transparent',
                      color: (width ?? 100) === pct ? 'var(--bg)' : 'var(--text-2)',
                      fontWeight: 500,
                    }}
                  >{pct}%</button>
                ))}

                <div style={{ width: 1, height: 12, backgroundColor: 'var(--border)', margin: '0 3px' }} />

                {/* Alignment */}
                {(['left', 'center', 'right'] as Align[]).map(a => (
                  <button
                    key={a}
                    onClick={() => updateAttributes({ align: a })}
                    title={`Align ${a}`}
                    style={{
                      fontSize: 12, padding: '2px 5px', borderRadius: 4, border: 'none', cursor: 'pointer',
                      backgroundColor: (align ?? 'center') === a ? 'var(--text-1)' : 'transparent',
                      color: (align ?? 'center') === a ? 'var(--bg)' : 'var(--text-2)',
                    }}
                  >{ALIGN_ICONS[a]}</button>
                ))}
              </div>
            )}
          </div>

          {/* Caption */}
          {isReadOnly ? (
            caption && (
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>
                {caption}
              </div>
            )
          ) : (
            <input
              type="text"
              value={caption ?? ''}
              onChange={e => updateAttributes({ caption: e.target.value })}
              placeholder="Add a caption…"
              style={{ width: '100%', textAlign: 'center', fontSize: 13, color: 'var(--text-2)', background: 'transparent', border: 'none', outline: 'none', marginTop: 6 }}
            />
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
