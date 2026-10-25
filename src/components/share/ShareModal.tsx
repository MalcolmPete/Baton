import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { getShares, upsertShare, deleteShare, type ShareRecord } from '../../store/useDocs'

interface ShareModalProps {
  resourceType: 'doc' | 'folder'
  resourceId: string
  resourceTitle: string
  onClose: () => void
}

// ─── Folder share confirmation ────────────────────────────────────────────────

function FolderShareConfirmation({ folderTitle, onConfirm, onCancel }: {
  folderTitle: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div style={{ padding: '4px 20px 20px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
        Folder: <strong style={{ color: 'var(--text-1)', fontWeight: 500 }}>{folderTitle || 'Untitled'}</strong>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 20,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>📂</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 6 }}>
            Sharing a folder shares all its contents
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            Anyone with a link to this folder will be able to browse and read every document currently inside it — without needing an account.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            height: 34, padding: '0 16px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: 'pointer',
            fontSize: 13, fontWeight: 500,
            backgroundColor: 'var(--bg)', color: 'var(--text-2)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          style={{
            height: 34, padding: '0 16px', borderRadius: 8,
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 500,
            backgroundColor: 'var(--text-1)', color: 'var(--bg)',
          }}
        >
          Share folder
        </button>
      </div>
    </div>
  )
}

// ─── Reusable link row ────────────────────────────────────────────────────────

function LinkSection({
  label,
  description,
  note,
  share,
  generating,
  onGenerate,
  onRevoke,
}: {
  label: string
  description: string
  note?: string
  share: ShareRecord | null
  generating: boolean
  onGenerate: () => void
  onRevoke: () => void
}) {
  const [copied, setCopied] = useState(false)
  const url = share ? `${window.location.origin}/share/${share.token}` : null

  function handleCopy() {
    if (!url) return
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{description}</div>
        {note && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{note}</div>}
      </div>

      {/* Link row or generate button */}
      {url && share ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              readOnly
              value={url}
              style={{
                flex: 1, height: 32, borderRadius: 8,
                border: '1px solid var(--border)', padding: '0 10px',
                fontSize: 12, color: 'var(--text-2)',
                backgroundColor: 'var(--bg-subtle)', outline: 'none',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                height: 32, padding: '0 14px', borderRadius: 8, flexShrink: 0,
                border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                backgroundColor: copied ? '#EAF3DE' : 'var(--bg)',
                color: copied ? '#27500A' : 'var(--text-1)',
                transition: 'background 0.12s, color 0.12s',
              }}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onGenerate}
              disabled={generating}
              style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button
              onClick={onRevoke}
              style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#c0392b')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              Revoke
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onGenerate}
          disabled={generating}
          style={{
            alignSelf: 'flex-start', height: 32, padding: '0 14px', borderRadius: 8,
            border: '1px solid var(--border)', cursor: generating ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 500,
            backgroundColor: 'var(--bg)', color: generating ? 'var(--text-3)' : 'var(--text-1)',
          }}
        >
          {generating ? 'Generating…' : `Generate ${label.toLowerCase()}`}
        </button>
      )}
    </div>
  )
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

export function ShareModal({ resourceType, resourceId, resourceTitle, onClose }: ShareModalProps) {
  const [loading, setLoading] = useState(true)
  const [viewShare, setViewShare] = useState<ShareRecord | null>(null)
  const [editShare, setEditShare] = useState<ShareRecord | null>(null)
  const [generatingView, setGeneratingView] = useState(false)
  const [generatingEdit, setGeneratingEdit] = useState(false)
  // For folders: require the user to confirm they understand sharing exposes all contents.
  // Skip confirmation if shares already exist (they confirmed when first generating a link).
  const [folderConfirmed, setFolderConfirmed] = useState(resourceType !== 'folder')

  useEffect(() => {
    getShares(resourceType, resourceId).then(({ view, edit }) => {
      setViewShare(view)
      setEditShare(edit)
      // If this folder already has active share links, skip the confirmation step.
      if (resourceType === 'folder' && (view || edit)) setFolderConfirmed(true)
      setLoading(false)
    })
  }, [resourceType, resourceId])

  async function handleGenerate(permission: 'view' | 'edit') {
    if (permission === 'view') setGeneratingView(true)
    else setGeneratingEdit(true)
    try {
      const record = await upsertShare(resourceType, resourceId, permission)
      if (permission === 'view') setViewShare(record)
      else setEditShare(record)
    } finally {
      if (permission === 'view') setGeneratingView(false)
      else setGeneratingEdit(false)
    }
  }

  async function handleRevoke(permission: 'view' | 'edit') {
    const share = permission === 'view' ? viewShare : editShare
    if (!share) return
    if (!confirm(`Revoke this ${permission} link? Anyone using it will lose access.`)) return
    await deleteShare(share.id)
    if (permission === 'view') setViewShare(null)
    else setEditShare(null)
  }

  return (
    <Modal title="Share" onClose={onClose} maxWidth={460}>
      {/* Folder confirmation step — shown before generating any links */}
      {!loading && !folderConfirmed ? (
        <FolderShareConfirmation
          folderTitle={resourceTitle}
          onConfirm={() => setFolderConfirmed(true)}
          onCancel={onClose}
        />
      ) : (
      <div style={{ padding: '4px 20px 20px' }}>
        {/* Resource label */}
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
          {resourceType === 'folder' ? 'Folder' : 'Document'}:{' '}
          <strong style={{ color: 'var(--text-1)', fontWeight: 500 }}>
            {resourceTitle || 'Untitled'}
          </strong>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <LinkSection
              label="View link"
              description="Anyone with this link can read the document without signing in."
              share={viewShare}
              generating={generatingView}
              onGenerate={() => handleGenerate('view')}
              onRevoke={() => handleRevoke('view')}
            />

            <div style={{ borderTop: '1px solid var(--border)' }} />

            <LinkSection
              label="Edit link"
              description="Recipients can edit after signing into a Baton account."
              note="Without an account, edit-link recipients can still read the document."
              share={editShare}
              generating={generatingEdit}
              onGenerate={() => handleGenerate('edit')}
              onRevoke={() => handleRevoke('edit')}
            />
          </div>
        )}
      </div>
      )}
    </Modal>
  )
}
