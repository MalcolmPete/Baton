import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'

interface Pos { top: number; left: number }

export function BubbleToolbar({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<Pos | null>(null)

  useEffect(() => {
    function update() {
      const { selection } = editor.state
      if (selection.empty || !editor.view.hasFocus()) { setPos(null); return }
      const from = editor.view.coordsAtPos(selection.from)
      const to   = editor.view.coordsAtPos(selection.to)
      setPos({
        top: Math.min(from.top, to.top) - 42 + window.scrollY,
        left: (from.left + to.right) / 2,
      })
    }
    editor.on('selectionUpdate', update)
    editor.on('blur', () => setPos(null))
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('blur', () => setPos(null))
    }
  }, [editor])

  if (!pos) return null

  const btn = (label: string, active: boolean, onClick: () => void, style?: React.CSSProperties) => (
    <button
      key={label}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        height: 26,
        padding: '0 7px',
        borderRadius: 5,
        border: 'none',
        backgroundColor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
        fontSize: 12,
        cursor: 'pointer',
        ...style,
      }}
    >
      {label}
    </button>
  )

  const sep = <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 3px', flexShrink: 0 }} />

  return createPortal(
    <div
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: '#1A1A1A',
        borderRadius: 8,
        padding: '3px 6px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseDown={e => e.preventDefault()}
    >
      {btn('B', editor.isActive('bold'),      () => editor.chain().focus().toggleBold().run(),      { fontWeight: 500 })}
      {btn('I', editor.isActive('italic'),    () => editor.chain().focus().toggleItalic().run(),    { fontStyle: 'italic' })}
      {btn('U', editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), { textDecoration: 'underline', textUnderlineOffset: 2 })}
      {btn('S', editor.isActive('strike'),    () => editor.chain().focus().toggleStrike().run(),    { textDecoration: 'line-through' })}
      <button
        onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHighlight().run() }}
        style={{
          height: 26, padding: '0 7px', borderRadius: 5, border: 'none', cursor: 'pointer',
          backgroundColor: editor.isActive('highlight') ? 'rgba(255,255,255,0.15)' : 'transparent',
          color: 'rgba(255,255,255,0.65)',
        }}
        title="Highlight"
      >
        <span style={{ background: '#fef08a', borderRadius: 2, padding: '0 3px', fontSize: 11, color: '#111' }}>A</span>
      </button>
      {sep}
      {([1, 2, 3] as const).map(level =>
        btn(`H${level}`, editor.isActive('heading', { level }), () => editor.chain().focus().toggleHeading({ level }).run(), { fontWeight: 500 }),
      )}
    </div>,
    document.body,
  )
}
