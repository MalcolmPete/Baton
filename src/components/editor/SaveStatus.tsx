import type { CSSProperties } from 'react'
import type { SaveStatus as Status } from '../../store/useAutosave'

const linkStyle: CSSProperties = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', color: 'inherit' }

export function SaveStatus({ status, error, onRetry, onOverwrite, onReload }: {
  status: Status
  error: string | null
  onRetry: () => void
  onOverwrite: () => void
  onReload: () => void
}) {
  if (status === 'conflict') {
    return (
      <span style={{ fontSize: 12, color: '#b45309', display: 'flex', gap: 8 }}>
        Someone else changed this doc.
        <button onClick={onReload} style={linkStyle}>Load their version</button>
        <button onClick={onOverwrite} style={linkStyle}>Keep mine</button>
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span title={error ?? undefined} style={{ fontSize: 12, color: '#c0392b', display: 'flex', gap: 8 }}>
        Couldn't save.
        <button onClick={onRetry} style={linkStyle}>Retry</button>
      </span>
    )
  }
  const label = status === 'saved' ? 'Saved' : 'Saving…'
  return <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</span>
}
