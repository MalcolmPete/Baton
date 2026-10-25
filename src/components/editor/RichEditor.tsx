import React, { useCallback, useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Highlight } from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { ImageBlockExtension } from './imageExtension'
import { BubbleToolbar } from './BubbleToolbar'
import { addImageBlock } from '../../store/useDocs'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { v4 as uuidv4 } from 'uuid'

interface RichEditorProps {
  docId: string
  initialContent: Record<string, unknown>
  onChange: (json: Record<string, unknown>) => void
  readOnly?: boolean
}

// ─── Toolbar primitives ───────────────────────────────────────────────────────

function Btn({ active, onClick, title, style, children }: {
  active: boolean; onClick: () => void; title?: string; style?: React.CSSProperties; children: React.ReactNode
}) {
  return (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', backgroundColor: active ? 'rgba(0,0,0,0.07)' : 'transparent', color: active ? 'var(--text-1)' : 'var(--text-3)', fontSize: 13, cursor: 'pointer', flexShrink: 0, transition: 'background 0.1s, color 0.1s', ...style }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--text-1)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' } }}
    >{children}</button>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 18, backgroundColor: 'rgba(0,0,0,0.1)', margin: '0 5px', flexShrink: 0 }} />
}

// ─── RichEditor ───────────────────────────────────────────────────────────────

export function RichEditor({ docId, initialContent, onChange, readOnly = false }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // editorProps are bound when the editor is created, before handleImageFile exists
  const imageFileHandlerRef = useRef<(file: File) => Promise<void>>(async () => {})
  const { user } = useAuth()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      Highlight,
      ImageBlockExtension,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'tiptap-editor' },
      handlePaste(_view, event) {
        const images = Array.from(event.clipboardData?.files ?? []).filter(f => f.type.startsWith('image/'))
        if (readOnly || images.length === 0) return false
        event.preventDefault()
        // Upload sequentially so images land in the order they were pasted
        void images.reduce((prev, file) => prev.then(() => imageFileHandlerRef.current(file)), Promise.resolve())
        return true
      },
    },
    onUpdate({ editor }) {
      if (!readOnly) onChange(editor.getJSON() as Record<string, unknown>)
    },
  })

  const handleImageFile = useCallback(async (file: File) => {
    if (!editor || !user) return
    // Use a separate UUID just for the storage path; the DB record ID comes back from addImageBlock
    const storageName = uuidv4()
    const path = `${user.id}/${docId}/${storageName}`
    const { error } = await supabase.storage.from('baton-images').upload(path, file, { contentType: file.type })
    if (error) { console.error('Image upload failed:', error.message); return }
    // addImageBlock returns the actual DB record ID — this is what ImageNodeView queries by
    const imageId = await addImageBlock(docId, path)
    editor.chain().focus().insertContent({ type: 'imageBlock', attrs: { imageId, caption: '' } }).run()
  }, [editor, docId, user])
  useEffect(() => { imageFileHandlerRef.current = handleImageFile }, [handleImageFile])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleImageFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) { e.preventDefault(); handleImageFile(file) }
  }

  if (!editor) return null

  return (
    <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
      {/* Slim toolbar — hidden in read-only mode */}
      {!readOnly && (
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 24 }}>
          {/* Main toolbar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Btn active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()}      title="Bold (Ctrl+B)"      style={{ fontWeight: 500 }}>B</Btn>
            <Btn active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()}    title="Italic (Ctrl+I)"    style={{ fontStyle: 'italic' }}>I</Btn>
            <Btn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)" style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>U</Btn>
            <Sep />
            <Btn active={editor.isActive('heading',{level:1})} onClick={() => editor.chain().focus().toggleHeading({level:1}).run()} title="Heading 1">H1</Btn>
            <Btn active={editor.isActive('heading',{level:2})} onClick={() => editor.chain().focus().toggleHeading({level:2}).run()} title="Heading 2">H2</Btn>
            <Btn active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Bullet list"    style={{ fontSize: 15 }}>•</Btn>
            <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"  style={{ fontSize: 11 }}>1.</Btn>
            <Sep />
            <Btn active={false}                          onClick={() => fileInputRef.current?.click()}                    title="Insert image"   style={{ fontSize: 12 }}>⬆</Btn>
            <Btn active={editor.isActive('codeBlock')}   onClick={() => editor.chain().focus().toggleCodeBlock().run()}   title="Code block"     style={{ fontFamily: 'monospace', fontSize: 11 }}>&lt;/&gt;</Btn>
            <Btn active={editor.isActive('blockquote')}  onClick={() => editor.chain().focus().toggleBlockquote().run()}  title="Callout"        style={{ fontSize: 15, lineHeight: 1 }}>❝</Btn>
            <Btn active={editor.isActive('highlight')}   onClick={() => editor.chain().focus().toggleHighlight().run()}   title="Highlight">
              <span style={{ background: '#fef08a', borderRadius: 2, padding: '0 3px', fontSize: 12, color: '#111', lineHeight: 1.4 }}>A</span>
            </Btn>
            <Sep />
            <Btn active={editor.isActive('table')} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table" style={{ fontSize: 11, letterSpacing: 0.5 }}>⊞ Table</Btn>
          </div>

          {/* Table context controls — only visible when cursor is inside a table */}
          {editor.isActive('table') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginRight: 4 }}>Table</span>
              <Btn active={false} onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add column left"  style={{ fontSize: 11 }}>+Col ←</Btn>
              <Btn active={false} onClick={() => editor.chain().focus().addColumnAfter().run()}  title="Add column right" style={{ fontSize: 11 }}>+Col →</Btn>
              <Btn active={false} onClick={() => editor.chain().focus().deleteColumn().run()}    title="Delete column"    style={{ fontSize: 11 }}>−Col</Btn>
              <Sep />
              <Btn active={false} onClick={() => editor.chain().focus().addRowBefore().run()}    title="Add row above"    style={{ fontSize: 11 }}>+Row ↑</Btn>
              <Btn active={false} onClick={() => editor.chain().focus().addRowAfter().run()}     title="Add row below"    style={{ fontSize: 11 }}>+Row ↓</Btn>
              <Btn active={false} onClick={() => editor.chain().focus().deleteRow().run()}       title="Delete row"       style={{ fontSize: 11 }}>−Row</Btn>
              <Sep />
              <Btn active={false} onClick={() => editor.chain().focus().deleteTable().run()}     title="Delete table"     style={{ fontSize: 11, color: '#c0392b' }}>✕ Delete</Btn>
            </div>
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      <BubbleToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
