import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  useAllDocs,
  useFolders,
  createDoc,
  createFolder,
  renameFolder,
  deleteFolder,
  moveDocToFolder,
  deleteDoc,
  updateDocIcon,
} from '../store/useDocs'
import { DOC_TYPE_LABELS, type Doc, type DocType, type DocIcon, type Folder } from '../types'
import { DocIcon as DocIconDisplay } from '../components/ui/DocIcon'
import { IconPicker } from '../components/ui/IconPicker'
import { ShareModal } from '../components/share/ShareModal'
import { useAuth } from '../context/AuthContext'
import type React from 'react'

const DOC_TYPES: DocType[] = ['handoff', 'installation', 'account-setup']

function timeAgo(ts: number): string {
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
  sidebarItem: (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    height: 32,
    width: '100%',
    textAlign: 'left' as const,
    fontSize: 13,
    color: active ? 'var(--text-1)' : 'var(--text-2)',
    backgroundColor: active ? 'rgba(0,0,0,0.06)' : 'transparent',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: active ? 500 : 400,
    border: 'none',
    transition: 'background 0.1s, color 0.1s',
    lineHeight: 1,
  }),
  sectionLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-3)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    padding: '16px 14px 6px',
  } as React.CSSProperties,
}

// ─── Doc list row ─────────────────────────────────────────────────────────────

function DocListRow({
  doc,
  folders,
  onIconClick,
}: {
  doc: Doc
  folders: Folder[]
  onIconClick: (docId: string) => void
}) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const folder = folders.find(f => f.id === doc.folderId)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm('Delete this document?')) await deleteDoc(doc.id)
  }

  const moveTargets = [
    { id: '__unfiled__', name: 'Unfiled' },
    ...folders.map(f => ({ id: f.id, name: f.name })),
  ].filter(t => t.id !== (doc.folderId ?? '__unfiled__'))

  async function handleMove(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    const val = e.target.value
    if (val === '__sentinel__') return
    await moveDocToFolder(doc.id, val === '__unfiled__' ? null : val)
  }

  return (
    <div
      onClick={() => navigate(`/editor/${doc.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        backgroundColor: hovered ? 'var(--bg-subtle)' : 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      {/* Icon — click opens picker */}
      <div
        onClick={e => { e.stopPropagation(); onIconClick(doc.id) }}
        title="Change icon"
        style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
      >
        <DocIconDisplay icon={doc.icon} docType={doc.type} size={52} />
        {hovered && (
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: Math.round(52 * 0.2),
            backgroundColor: 'rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: 'white',
          }}>✎</div>
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: doc.title ? 'var(--text-1)' : 'var(--text-3)',
          fontStyle: doc.title ? 'normal' : 'italic',
          lineHeight: 1.3, marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {doc.title || 'Untitled'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{DOC_TYPE_LABELS[doc.type]}</span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span>{timeAgo(doc.updatedAt)}</span>
          {folder && (
            <>
              <span style={{ color: 'var(--text-3)' }}>·</span>
              <span>{folder.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Hover actions */}
      {hovered && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {moveTargets.length > 0 && (
            <select
              value="__sentinel__"
              onChange={handleMove}
              style={{ fontSize: 12, color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', appearance: 'none' as const }}
            >
              <option value="__sentinel__" disabled>Move…</option>
              {moveTargets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button
            onClick={handleDelete}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c0392b')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >Delete</button>
        </div>
      )}
    </div>
  )
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 13px',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--text-1)' : 'rgba(0,0,0,0.12)'}`,
        backgroundColor: active ? 'var(--text-1)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--text-2)',
        fontSize: 13,
        fontWeight: 400,
        cursor: 'pointer',
        transition: 'all 0.12s',
        lineHeight: 1.5,
      }}
    >
      {label}
    </button>
  )
}

// ─── Sidebar folder item ──────────────────────────────────────────────────────

function FolderItem({
  folder,
  docCount,
  active,
  onClick,
  onShare,
}: {
  folder: Folder
  docCount: number
  active: boolean
  onShare: (f: Folder) => void
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function startEdit() {
    setEditName(folder.name)
    setEditing(true)
    setMenuOpen(false)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commitEdit() {
    const name = editName.trim()
    if (name && name !== folder.name) await renameFolder(folder.id, name)
    setEditing(false)
  }

  async function handleDelete() {
    setMenuOpen(false)
    const msg = docCount > 0
      ? `Delete "${folder.name}"? Its ${docCount} doc${docCount !== 1 ? 's' : ''} will become unfiled.`
      : `Delete folder "${folder.name}"?`
    if (confirm(msg)) await deleteFolder(folder.id)
  }

  function handleShare() {
    setMenuOpen(false)
    onShare(folder)
  }

  return (
    <div
      style={{ position: 'relative', margin: '1px 8px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <div style={{ ...S.sidebarItem(active), gap: 0, padding: '0 10px' }}>
          <input
            ref={inputRef}
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-1)',
            }}
          />
        </div>
      ) : (
        <button style={S.sidebarItem(active)} onClick={onClick}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folder.name}
          </span>
        </button>
      )}

      {(hovered || menuOpen) && !editing && (
        <div ref={menuRef} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}>
          {/* Hamburger trigger */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); setMenuOpen(m => !m) }}
            style={{
              width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4, border: 'none',
              background: menuOpen ? 'rgba(0,0,0,0.07)' : 'transparent',
              color: 'var(--text-3)', cursor: 'pointer',
              fontSize: 14, lineHeight: 1, letterSpacing: 1,
            }}
            title="Folder options"
          >
            ···
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', marginTop: 4,
              zIndex: 200,
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              minWidth: 130,
              padding: '4px 0',
              overflow: 'hidden',
            }}>
              {[
                { label: 'Rename', action: startEdit, danger: false },
                { label: 'Share', action: handleShare, danger: false },
                { label: 'Delete', action: handleDelete, danger: true },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={e => { e.stopPropagation(); item.action() }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '7px 14px', fontSize: 13,
                    color: item.danger ? '#c0392b' : 'var(--text-1)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── New folder inline input ──────────────────────────────────────────────────

function NewFolderInput({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')

  async function commit() {
    const trimmed = name.trim()
    if (trimmed) await createFolder(trimmed)
    onDone()
  }

  return (
    <div style={{ margin: '2px 8px', padding: '0 10px', height: 32, display: 'flex', alignItems: 'center', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', backgroundColor: 'var(--bg)' }}>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onDone()
        }}
        placeholder="Folder name…"
        style={{ flex: 1, fontSize: 13, fontWeight: 400, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)' }}
      />
    </div>
  )
}

// ─── New Document button ──────────────────────────────────────────────────────

function NewDocButton({ folderId }: { folderId: string | null }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [creating, setCreating] = useState(false)

  async function handleCreate(type: DocType) {
    if (creating) return
    setCreating(true)
    const id = await createDoc(type, folderId)
    navigate(`/editor/${id}`)
  }

  return (
    <div style={{ padding: '12px 12px 0' }}>
      {expanded ? (
        <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--radius-btn)', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
          <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            New document
          </div>
          {DOC_TYPES.map(type => (
            <button
              key={type}
              onClick={() => handleCreate(type)}
              disabled={creating}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', fontSize: 13, color: 'var(--text-1)', background: 'transparent', border: 'none', cursor: 'pointer', borderTop: '1px solid rgba(0,0,0,0.05)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {DOC_TYPE_LABELS[type]}
            </button>
          ))}
          <button
            onClick={() => setExpanded(false)}
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: '6px', fontSize: 12, color: 'var(--text-3)', background: 'transparent', border: 'none', borderTop: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            height: 34,
            borderRadius: 'var(--radius-btn)',
            border: '1px solid rgba(0,0,0,0.12)',
            backgroundColor: 'var(--bg)',
            color: 'var(--text-1)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span> New Document
        </button>
      )}
    </div>
  )
}

// ─── Settings / sign-out links ────────────────────────────────────────────────

function BottomLinks() {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  return (
    <>
      <button onClick={() => navigate('/settings')} style={S.sidebarItem(false)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>⚙</span>Settings
        </span>
      </button>
      {user && (
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          style={{ ...S.sidebarItem(false), marginTop: 2 }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-3)' }}>
            <span style={{ fontSize: 11 }}>↩</span>Sign out
          </span>
        </button>
      )}
    </>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  folders: Folder[]
  allDocs: Doc[]
  selectedFolderId: string | null | 'all'
  onSelectFolder: (id: string | null | 'all') => void
  creatingFolder: boolean
  onCreateFolder: () => void
  onDoneCreatingFolder: () => void
  onShareFolder: (f: Folder) => void
}

function Sidebar({
  folders,
  allDocs,
  selectedFolderId,
  onSelectFolder,
  creatingFolder,
  onCreateFolder,
  onDoneCreatingFolder,
  onShareFolder,
}: SidebarProps) {
  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      backgroundColor: 'var(--bg-subtle)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    }}>
      {/* App name */}
      <div style={{ padding: '20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo.png" alt="" className="app-logo" style={{ height: 36, width: 'auto' }} />
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-1)' }}>Baton</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {/* All docs */}
        <div style={{ margin: '1px 8px' }}>
          <button style={S.sidebarItem(selectedFolderId === 'all')} onClick={() => onSelectFolder('all')}>
            All documents
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{allDocs.length}</span>
          </button>
        </div>

        {/* Folders */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 }}>
          <span style={S.sectionLabel}>Folders</span>
          <button
            onClick={onCreateFolder}
            title="New folder"
            style={{ fontSize: 16, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, paddingBottom: 2 }}
          >+</button>
        </div>

        {creatingFolder && <NewFolderInput onDone={onDoneCreatingFolder} />}

        {folders.map(f => (
          <FolderItem
            key={f.id}
            folder={f}
            docCount={allDocs.filter(d => d.folderId === f.id).length}
            active={selectedFolderId === f.id}
            onClick={() => onSelectFolder(f.id)}
            onShare={onShareFolder}
          />
        ))}

        {folders.length === 0 && !creatingFolder && (
          <div style={{ padding: '4px 14px', fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
            No folders yet
          </div>
        )}

        {/* Separator */}
        <div style={{ margin: '10px 14px', borderTop: '1px solid var(--border)' }} />

        {/* Unfiled */}
        <div style={{ margin: '1px 8px' }}>
          <button style={S.sidebarItem(selectedFolderId === null)} onClick={() => onSelectFolder(null)}>
            Unfiled
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {allDocs.filter(d => d.folderId == null).length}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom: Settings + Sign out + New Document */}
      <div style={{ borderTop: '1px solid var(--border)', paddingBottom: 16 }}>
        <div style={{ margin: '8px 8px 4px', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <BottomLinks />
        </div>
        <NewDocButton folderId={selectedFolderId === 'all' ? null : selectedFolderId} />
      </div>
    </aside>
  )
}

// ─── Home page ────────────────────────────────────────────────────────────────

export function Home() {
  const allDocs = useAllDocs()
  const folders = useFolders()
  const location = useLocation()
  // If navigated here from the editor's folder breadcrumb, open that folder
  const initialFolderId = (location.state as { folderId?: string } | null)?.folderId ?? 'all'
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'all'>(initialFolderId)
  const [selectedType, setSelectedType] = useState<DocType | 'all'>('all')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [iconPickerDocId, setIconPickerDocId] = useState<string | null>(null)
  const [sharingFolder, setSharingFolder] = useState<Folder | null>(null)

  const filteredDocs = useMemo(() => {
    if (!allDocs) return []
    let result = allDocs
    if (selectedFolderId !== 'all') result = result.filter(d => d.folderId === selectedFolderId)
    if (selectedType !== 'all') result = result.filter(d => d.type === selectedType)
    return result
  }, [allDocs, selectedFolderId, selectedType])

  if (allDocs === undefined || folders === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'var(--text-3)' }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-subtle)' }}>
      <Sidebar
        folders={folders}
        allDocs={allDocs}
        selectedFolderId={selectedFolderId}
        onSelectFolder={id => { setSelectedFolderId(id); setSelectedType('all') }}
        creatingFolder={creatingFolder}
        onCreateFolder={() => setCreatingFolder(true)}
        onDoneCreatingFolder={() => setCreatingFolder(false)}
        onShareFolder={setSharingFolder}
      />

      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
          <FilterChip label="All" active={selectedType === 'all'} onClick={() => setSelectedType('all')} />
          {DOC_TYPES.map(type => (
            <FilterChip
              key={type}
              label={DOC_TYPE_LABELS[type]}
              active={selectedType === type}
              onClick={() => setSelectedType(type)}
            />
          ))}
        </div>

        {/* Doc list */}
        {filteredDocs.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--text-3)', paddingTop: 16 }}>
            {allDocs.length === 0 ? 'No documents yet. Create one with "+ New Document" in the sidebar.' : 'No documents match this filter.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredDocs.map(doc => (
              <DocListRow
                key={doc.id}
                doc={doc}
                folders={folders}
                onIconClick={setIconPickerDocId}
              />
            ))}
          </div>
        )}
      </main>

      {/* Icon picker */}
      {iconPickerDocId && (() => {
        const doc = allDocs?.find(d => d.id === iconPickerDocId)
        if (!doc) return null
        return (
          <IconPicker
            docType={doc.type}
            current={doc.icon}
            onSelect={async (icon: DocIcon) => { await updateDocIcon(iconPickerDocId, icon) }}
            onClose={() => setIconPickerDocId(null)}
          />
        )
      })()}

      {/* Folder share modal */}
      {sharingFolder && (
        <ShareModal
          resourceType="folder"
          resourceId={sharingFolder.id}
          resourceTitle={sharingFolder.name}
          onClose={() => setSharingFolder(null)}
        />
      )}
    </div>
  )
}
