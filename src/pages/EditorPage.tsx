import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDoc, useFolder, updateDoc } from '../store/useDocs'
import { RichEditor } from '../components/editor/RichEditor'
import { AnnotationContext } from '../components/annotation/AnnotationContext'
import { AnnotationModal } from '../components/annotation/AnnotationModal'
import { TypeBadge } from '../components/ui/TypeBadge'
import { ShareModal } from '../components/share/ShareModal'
import { ViewerContext } from '../context/ViewerContext'
import { exportDocPdf } from '../lib/exportPdf'
import { tiptapToMarkdown, downloadMarkdown } from '../lib/exportMarkdown'
import { useAuth } from '../context/AuthContext'

const SAVE_DEBOUNCE_MS = 600

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const doc = useDoc(id!)
  const folder = useFolder(doc?.folderId)
  const [annotatingImageId, setAnnotatingImageId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const titleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [localTitle, setLocalTitle] = useState('')
  useEffect(() => {
    if (doc && localTitle === '') setLocalTitle(doc.title)
  }, [doc])

  const saveTitle = useCallback((title: string) => {
    if (!id) return
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      updateDoc(id, { title }).catch(console.error)
    }, SAVE_DEBOUNCE_MS)
  }, [id])

  const saveContent = useCallback((content: Record<string, unknown>) => {
    if (!id) return
    if (contentTimer.current) clearTimeout(contentTimer.current)
    contentTimer.current = setTimeout(() => {
      updateDoc(id, { content }).catch(console.error)
    }, SAVE_DEBOUNCE_MS)
  }, [id])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const t = e.target.value
    setLocalTitle(t)
    saveTitle(t)
  }

  async function handleExport() {
    if (!doc) return
    setExporting(true)
    try { await exportDocPdf({ ...doc, title: localTitle }) }
    finally { setExporting(false) }
  }

  function handleExportMarkdown() {
    if (!doc) return
    const md = tiptapToMarkdown(doc.content)
    downloadMarkdown(md, localTitle || 'document')
  }

  if (doc === undefined) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 14 }}>Loading…</div>
  }

  if (doc === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-2)' }}>
        Document not found.{' '}
        <button onClick={() => navigate('/')} style={{ color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: 4, fontSize: 14 }}>Go home</button>
      </div>
    )
  }

  return (
    <ViewerContext.Provider value={{ imageBlocks: {}, isReadOnly: false }}>
      <AnnotationContext.Provider value={{ openAnnotation: setAnnotatingImageId }}>
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
          {/* Topbar */}
          <header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
              <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <img src="/logo.png" alt="Baton" className="app-logo" style={{ height: 20, width: 'auto' }} />
              </button>
              <span style={{ color: 'var(--border)', fontSize: 16 }}>/</span>
              {folder && (
                <>
                  <button
                    onClick={() => navigate('/', { state: { folderId: folder.id } })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, color: 'var(--text-2)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
                  >
                    {folder.name}
                  </button>
                  <span style={{ color: 'var(--border)', fontSize: 16 }}>/</span>
                </>
              )}
              <span style={{ color: 'var(--text-1)' }}>{doc.title || 'Untitled'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user && (
                <button onClick={() => setSharing(true)} style={{ height: 30, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-1)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Share
                </button>
              )}
              <button onClick={handleExportMarkdown} style={{ height: 30, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', backgroundColor: 'var(--bg)', color: 'var(--text-1)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Export MD
              </button>
              <button onClick={handleExport} disabled={exporting} style={{ height: 30, padding: '0 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', backgroundColor: 'var(--bg)', color: exporting ? 'var(--text-3)' : 'var(--text-1)', fontSize: 13, fontWeight: 500, cursor: exporting ? 'not-allowed' : 'pointer' }}>
                {exporting ? 'Exporting…' : 'Export PDF'}
              </button>
            </div>
          </header>

          {/* Content */}
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '52px 32px 80px' }}>
            <input
              type="text" value={localTitle} onChange={handleTitleChange} placeholder="Untitled"
              style={{ display: 'block', width: '100%', fontSize: 24, fontWeight: 500, color: 'var(--text-1)', background: 'transparent', border: 'none', outline: 'none', marginBottom: 10, lineHeight: 1.3 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
              <TypeBadge type={doc.type} />
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Last edited {timeAgo(doc.updatedAt)}</span>
            </div>
            <RichEditor docId={doc.id} initialContent={doc.content} onChange={saveContent} />
          </div>

          {annotatingImageId && <AnnotationModal imageId={annotatingImageId} onClose={() => setAnnotatingImageId(null)} />}

          {sharing && (
            <ShareModal
              resourceType="doc"
              resourceId={doc.id}
              resourceTitle={localTitle}
              onClose={() => setSharing(false)}
            />
          )}
        </div>
      </AnnotationContext.Provider>
    </ViewerContext.Provider>
  )
}
