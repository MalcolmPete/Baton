import { DOC_TYPE_LABELS, type DocType } from '../../types'

const CLASS_MAP: Record<DocType, string> = {
  handoff:        'badge-handoff',
  installation:   'badge-installation',
  'account-setup':'badge-account-setup',
}

export function TypeBadge({ type }: { type: DocType }) {
  return (
    <span
      className={CLASS_MAP[type]}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        padding: '2px 9px',
        whiteSpace: 'nowrap',
        lineHeight: 1.6,
      }}
    >
      {DOC_TYPE_LABELS[type]}
    </span>
  )
}
