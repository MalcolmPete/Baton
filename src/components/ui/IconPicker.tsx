import { useRef, useState } from 'react'
import { Modal } from './Modal'
import { DocIcon } from './DocIcon'
import { STANDARD_ICONS, BRAND_ICONS, type IconDef } from '../../lib/icons'
import type { DocIcon as DocIconData, DocType } from '../../types'

type Tab = 'icons' | 'brands' | 'image'

interface IconPickerProps {
  docType: DocType
  current?: DocIconData
  onSelect: (icon: DocIconData) => void
  onClose: () => void
}

function IconGrid({
  icons,
  current,
  docType,
  type,
  onSelect,
}: {
  icons: IconDef[]
  current?: DocIconData
  docType: DocType
  type: 'standard' | 'brand'
  onSelect: (icon: DocIconData) => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 8,
      padding: 20,
    }}>
      {icons.map(({ id, label }) => {
        const active = current?.type === type && current.id === id
        return (
          <button
            key={id}
            onClick={() => onSelect({ type, id })}
            title={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '10px 4px 8px',
              borderRadius: 10,
              border: `1.5px solid ${active ? 'var(--text-1)' : 'transparent'}`,
              backgroundColor: active ? 'var(--bg-subtle)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.1s, border-color 0.1s',
            }}
            onMouseEnter={e => {
              if (!active) e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'
            }}
            onMouseLeave={e => {
              if (!active) e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <DocIcon
              icon={{ type, id }}
              docType={docType}
              size={44}
            />
            <span style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.3, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ImageUploadTab({ onSelect }: { onSelect: (icon: DocIconData) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      onSelect({ type: 'image', dataUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ padding: 20 }}>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        style={{
          border: `1.5px dashed ${dragging ? 'var(--text-2)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: '36px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          cursor: 'pointer',
          backgroundColor: dragging ? 'var(--bg-subtle)' : 'transparent',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
        onMouseLeave={e => { if (!dragging) e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <span style={{ fontSize: 28 }}>⬆</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>Click to upload</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>or drag and drop · PNG, JPG, SVG, GIF</span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

export function IconPicker({ docType, current, onSelect, onClose }: IconPickerProps) {
  const [tab, setTab] = useState<Tab>('icons')

  function tabBtn(id: Tab, label: string) {
    const active = tab === id
    return (
      <button
        key={id}
        onClick={() => setTab(id)}
        style={{
          height: 32,
          padding: '0 14px',
          borderRadius: 6,
          border: 'none',
          backgroundColor: active ? 'var(--text-1)' : 'transparent',
          color: active ? 'var(--bg)' : 'var(--text-2)',
          fontSize: 13,
          fontWeight: active ? 500 : 400,
          cursor: 'pointer',
          transition: 'background 0.1s, color 0.1s',
        }}
      >
        {label}
      </button>
    )
  }

  function handleSelect(icon: DocIconData) {
    onSelect(icon)
    onClose()
  }

  return (
    <Modal title="Change icon" onClose={onClose} maxWidth={540}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 2,
        padding: '12px 16px 0',
        borderBottom: '1px solid var(--border)',
        paddingBottom: 12,
      }}>
        {tabBtn('icons',  'Icons')}
        {tabBtn('brands', 'Brands')}
        {tabBtn('image',  'Custom image')}
      </div>

      {tab === 'icons'  && <IconGrid icons={STANDARD_ICONS} current={current} docType={docType} type="standard" onSelect={handleSelect} />}
      {tab === 'brands' && <IconGrid icons={BRAND_ICONS}    current={current} docType={docType} type="brand"    onSelect={handleSelect} />}
      {tab === 'image'  && <ImageUploadTab onSelect={handleSelect} />}
    </Modal>
  )
}
