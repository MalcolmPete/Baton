import type { DocIcon as DocIconData, DocType } from '../../types'
import { DOC_TYPE_BADGES } from '../../types'
import {
  STANDARD_ICONS, BRAND_ICONS, DOC_TYPE_DEFAULT_ICON,
} from '../../lib/icons'

interface DocIconProps {
  icon?: DocIconData
  docType: DocType
  size?: number
}

export function DocIcon({ icon, docType, size = 52 }: DocIconProps) {
  const { bg, color } = DOC_TYPE_BADGES[docType]
  const iconSize = Math.round(size * 0.46)

  // Custom uploaded image
  if (icon?.type === 'image') {
    return (
      <div style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.2),
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <img src={icon.dataUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }

  // Resolve the icon component
  let IconComponent: React.ComponentType<{ size?: number; color?: string }> | null = null

  if (icon?.type === 'standard') {
    IconComponent = STANDARD_ICONS.find(i => i.id === icon.id)?.component ?? null
  } else if (icon?.type === 'brand') {
    IconComponent = BRAND_ICONS.find(i => i.id === icon.id)?.component ?? null
  }

  // Fall back to default for this doc type
  if (!IconComponent) {
    const defaultId = DOC_TYPE_DEFAULT_ICON[docType]
    IconComponent = STANDARD_ICONS.find(i => i.id === defaultId)?.component ?? STANDARD_ICONS[0].component
  }

  return (
    <div style={{
      width: size, height: size,
      borderRadius: Math.round(size * 0.2),
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <IconComponent size={iconSize} color={color} />
    </div>
  )
}
