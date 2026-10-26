import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDoc, useFolder, cleanupOrphanImages } from '../store/useDocs'
import { useAutosave } from '../store/useAutosave'
import { RichEditor } from '../components/editor/RichEditor'
import { SaveStatus } from '../components/editor/SaveStatus'
import { AnnotationContext } from '../components/annotation/AnnotationContext'
import { AnnotationModal } from '../components/annotation/AnnotationModal'
import { TypeBadge } from '../components/ui/TypeBadge'
import { ShareModal } from '../components/share/ShareModal'
import { ViewerContext } from '../context/ViewerContext'
import { exportDocPdf } from '../lib/exportPdf'
import { tiptapToMarkdown, downloadMarkdown } from '../lib/exportMarkdown'
import { useAuth } from '../context/AuthContext'
import type { Doc } from '../types'

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
  const doc = useDoc(id!)

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

  // Keyed so switching docs starts a fresh editor and autosave
  return <DocEditor key={doc.id} doc={doc} />
}

function DocEditor({ doc }: { doc: Doc }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const folder = useFolder(doc.folderId)
  const [annotatingImageId, setAnnotatingImageId] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [localTitle, setLocalTitle] = useState(doc.title)
  // Latest editor content, which can be up to one debounce ahead of the cached doc
  const latestContent = useRef(doc.content)
  const autosave = useAutosave(doc.id, doc.version)

  useEffect(() => { void cleanupOrphanImages(doc.id).catch(console.error) }, [doc.id])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalTitle(e.target.value)
    autosave.schedule({ title: e.target.value })
  }

  function handleContentChange(content: Record<string, unknown>) {
    latestContent.current = content
    autosave.schedule({ content })
  }

  async function handleExport() {
    setExporting(true)
    try { await exportDocPdf({ ...doc, title: localTitle, content: latestContent.current }) }
    finally { setExporting(false) }
  }

  function handleExportMarkdown() {
    const md = tiptapToMarkdown(latestContent.current)
    downloadMarkdown(md, localTitle || 'document')
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
              <span style={{ color: 'var(--border)' }}>·</span>
              <SaveStatus status={autosave.status} error={autosave.error} onRetry={autosave.flush} onOverwrite={autosave.overwrite} onReload={autosave.discardAndReload} />
            </div>
            <RichEditor docId={doc.id} initialContent={doc.content} onChange={handleContentChange} />
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
