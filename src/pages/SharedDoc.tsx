import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ViewerContext, type ViewerImageBlock } from '../context/ViewerContext'
import { RichEditor } from '../components/editor/RichEditor'
import { TypeBadge } from '../components/ui/TypeBadge'
import { AnnotationContext } from '../components/annotation/AnnotationContext'
import { AnnotationModal } from '../components/annotation/AnnotationModal'
import type { Doc, DocType } from '../types'

interface SharedImageBlock {
  id: string
  storage_path: string
  annotations: unknown[]
}

interface SharedFolderDoc {
  id: string
  type: string
  title: string
  content: Record<string, unknown>
  folder_id: string | null
  icon: unknown
  created_at: string
  updated_at: string
  image_blocks: SharedImageBlock[]
}

interface SharedPayload {
  permission: 'view' | 'edit'
  resource_type: 'doc' | 'folder'
  // doc share fields
  doc?: Record<string, unknown>
  image_blocks?: SharedImageBlock[]
  // folder share fields
  folder?: Record<string, unknown>
  docs?: SharedFolderDoc[]
}

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function SharedDoc() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [payload, setPayload] = useState<SharedPayload | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [annotatingImageId, setAnnotatingImageId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    supabase.rpc('get_shared_resource', { p_token: token }).then(({ data, error }) => {
      if (error || !data) { setNotFound(true); return }
      setPayload(data as SharedPayload)
    })
  }, [token])

  // When a logged-in user arrives via an edit link, claim edit access
  useEffect(() => {
    if (!payload || !user || payload.permission !== 'edit' || claimed) return
    supabase.rpc('claim_edit_share', { p_token: token }).then(() => setClaimed(true))
  }, [payload, user, token, claimed])

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-2)', fontSize: 14 }}>
        <div style={{ fontSize: 32 }}>🔗</div>
        <div>This share link is invalid or has been revoked.</div>
        <button onClick={() => navigate('/')} style={{ color: '#0C447C', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
          Go to Baton
        </button>
      </div>
    )
  }

  if (!payload) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  if (payload.resource_type === 'folder') {
    return <SharedFolderView payload={payload} />
  }

  if (!payload.doc) return null

  const doc = payload.doc as Record<string, unknown>
  const permission = payload.permission
  const canEdit = permission === 'edit' && !!user && claimed

  const docObj: Doc = {
    id: doc.id as string,
    type: doc.type as DocType,
    title: doc.title as string,
    content: doc.content as Record<string, unknown>,
    folderId: (doc.folder_id as string) ?? null,
    icon: doc.icon as Doc['icon'],
    createdAt: new Date(doc.created_at as string).getTime(),
    updatedAt: new Date(doc.updated_at as string).getTime(),
  }

  // Build viewer image block map
  const viewerImageBlocks: Record<string, ViewerImageBlock> = {}
  for (const ib of payload.image_blocks ?? []) {
    viewerImageBlocks[ib.id] = { storagePath: ib.storage_path, annotations: ib.annotations as import('../types').Annotation[] }
  }

  return (
    <ViewerContext.Provider value={{ imageBlocks: viewerImageBlocks, isReadOnly: !canEdit }}>
      <AnnotationContext.Provider value={{ openAnnotation: canEdit ? setAnnotatingImageId : () => {} }}>
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
          {/* Topbar */}
          <header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/logo.png" alt="Baton" className="app-logo" style={{ height: 20, width: 'auto' }} />
              <span style={{ color: 'var(--border)', fontSize: 16 }}>/</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{docObj.title || 'Untitled'}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {permission === 'edit' && !user && (
                <button
                  onClick={() => navigate('/login')}
                  style={{ height: 30, padding: '0 14px', borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text-1)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  Sign in to edit
                </button>
              )}
              {user && (
                <button
                  onClick={() => navigate('/')}
                  style={{ fontSize: 13, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ← My docs
                </button>
              )}
            </div>
          </header>

          {/* Edit-permission banner for logged-out users */}
          {permission === 'edit' && !user && (
            <div style={{ backgroundColor: '#E6F1FB', borderBottom: '1px solid #BDDAF5', padding: '10px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#0C447C' }}>
                You have been invited to edit this document. Sign in to make changes.
              </span>
              <button onClick={() => navigate('/login')} style={{ fontSize: 12, color: '#0C447C', background: 'none', border: '1px solid #BDDAF5', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 500 }}>
                Sign in
              </button>
            </div>
          )}

          {/* Content */}
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '52px 32px 80px' }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--text-1)', marginBottom: 10, lineHeight: 1.3 }}>
              {docObj.title || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Untitled</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
              <TypeBadge type={docObj.type} />
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Last edited {timeAgo(docObj.updatedAt)}</span>
              {!canEdit && (
                <span style={{ fontSize: 11, color: 'var(--text-3)', backgroundColor: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)' }}>
                  Read only
                </span>
              )}
            </div>

            <RichEditor
              docId={docObj.id}
              initialContent={docObj.content}
              onChange={() => {/* handled by EditorPage; SharedDoc is read-only or edit-via-claim */}}
              readOnly={!canEdit}
            />
          </div>

          {annotatingImageId && canEdit && (
            <AnnotationModal imageId={annotatingImageId} onClose={() => setAnnotatingImageId(null)} />
          )}
        </div>
      </AnnotationContext.Provider>
    </ViewerContext.Provider>
  )
}

function SharedFolderView({ payload }: { payload: SharedPayload }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedDoc, setSelectedDoc] = useState<SharedFolderDoc | null>(null)
  const folderName = (payload.folder as Record<string, unknown> | undefined)?.name as string | undefined
  const docs = payload.docs ?? []

  if (selectedDoc) {
    const docObj: Doc = {
      id: selectedDoc.id,
      type: selectedDoc.type as DocType,
      title: selectedDoc.title,
      content: selectedDoc.content,
      folderId: selectedDoc.folder_id,
      icon: selectedDoc.icon as Doc['icon'],
      createdAt: new Date(selectedDoc.created_at).getTime(),
      updatedAt: new Date(selectedDoc.updated_at).getTime(),
    }

    const viewerImageBlocks: Record<string, ViewerImageBlock> = {}
    for (const ib of selectedDoc.image_blocks ?? []) {
      viewerImageBlocks[ib.id] = {
        storagePath: ib.storage_path,
        annotations: ib.annotations as import('../types').Annotation[],
      }
    }

    return (
      <ViewerContext.Provider value={{ imageBlocks: viewerImageBlocks, isReadOnly: true }}>
        <AnnotationContext.Provider value={{ openAnnotation: () => {} }}>
          <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
            <header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src="/logo.png" alt="Baton" className="app-logo" style={{ height: 20, width: 'auto' }} />
                <span style={{ color: 'var(--border)', fontSize: 16 }}>/</span>
                <button
                  onClick={() => setSelectedDoc(null)}
                  style={{ fontSize: 13, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {folderName || 'Shared folder'}
                </button>
                <span style={{ color: 'var(--border)', fontSize: 16 }}>/</span>
                <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{docObj.title || 'Untitled'}</span>
              </div>
              {user && (
                <button
                  onClick={() => navigate('/')}
                  style={{ fontSize: 13, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  ← My docs
                </button>
              )}
            </header>

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '52px 32px 80px' }}>
              <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--text-1)', marginBottom: 10, lineHeight: 1.3 }}>
                {docObj.title || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>Untitled</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
                <TypeBadge type={docObj.type} />
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Last edited {timeAgo(docObj.updatedAt)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)', backgroundColor: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 999, border: '1px solid var(--border)' }}>
                  Read only
                </span>
              </div>
              <RichEditor
                docId={docObj.id}
                initialContent={docObj.content}
                onChange={() => {}}
                readOnly
              />
            </div>
          </div>
        </AnnotationContext.Provider>
      </ViewerContext.Provider>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-subtle)' }}>
      <header style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="Baton" className="app-logo" style={{ height: 20, width: 'auto' }} />
          <span style={{ color: 'var(--border)', fontSize: 16 }}>/</span>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{folderName || 'Shared folder'}</span>
        </div>
        {user && (
          <button
            onClick={() => navigate('/')}
            style={{ fontSize: 13, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← My docs
          </button>
        )}
      </header>
      <div style={{ maxWidth: 680, margin: '40px auto', padding: '0 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
          {docs.length} document{docs.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDoc(d)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{d.title || 'Untitled'}</div>
              </div>
              <TypeBadge type={d.type as DocType} />
            </button>
          ))}
          {docs.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>This folder is empty.</div>
          )}
        </div>
      </div>
    </div>
  )
}
