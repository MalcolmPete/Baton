import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import type { Doc } from '../../types'
import { DOC_TYPE_LABELS } from '../../types'

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    paddingTop: 56,
    paddingBottom: 72,
    paddingHorizontal: 64,
    lineHeight: 1.6,
    color: '#44403c',
    backgroundColor: '#ffffff',
  },
  // Header
  docTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 26,
    lineHeight: 1.2,        // tighter line-height so the page 1.6 default doesn't push things around
    color: '#1c1917',
    marginBottom: 10,       // was 4 — gives the type label room to breathe
  },
  docType: {
    fontSize: 9,
    color: '#a8a29e',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    marginBottom: 24,
  },
  // Block elements
  h1: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: '#1c1917', marginTop: 24, marginBottom: 8 },
  h2: { fontFamily: 'Helvetica-Bold', fontSize: 16, color: '#1c1917', marginTop: 18, marginBottom: 6 },
  h3: { fontFamily: 'Helvetica-Bold', fontSize: 13, color: '#292524', marginTop: 14, marginBottom: 4 },
  paragraph: { marginBottom: 8, lineHeight: 1.7 },
  hr: { borderBottomWidth: 1, borderBottomColor: '#e7e5e4', marginVertical: 14 },
  // Code
  codeBlock: {
    backgroundColor: '#1c1917',
    borderRadius: 4,
    padding: 12,
    marginVertical: 10,
  },
  codeBlockText: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: '#f5f5f4',
    lineHeight: 1.5,
  },
  // Blockquote
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#d6d3d1',
    paddingLeft: 12,
    marginVertical: 8,
    color: '#78716c',
  },
  blockquoteText: { fontFamily: 'Helvetica-Oblique', fontSize: 11 },
  // Lists
  listItem: { flexDirection: 'row', marginBottom: 3 },
  listBullet: { width: 18, color: '#a8a29e' },
  listContent: { flex: 1 },
  // Image
  imageWrapper: { marginVertical: 10 },
  image: { maxWidth: '100%' },
  caption: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 10,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 4,
  },
  // Inline text styles (applied as nested Text)
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  boldItalic: { fontFamily: 'Helvetica-BoldOblique' },
  inlineCode: { fontFamily: 'Courier', fontSize: 10, backgroundColor: '#f5f5f4', color: '#292524' },
  link: { color: '#2563eb', textDecoration: 'underline' },
})

// ─── Types ───────────────────────────────────────────────────────────────────

interface TNode {
  type: string
  text?: string
  attrs?: Record<string, unknown>
  content?: TNode[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

// ─── Inline rendering ────────────────────────────────────────────────────────

function inlineStyle(marks?: Array<{ type: string; attrs?: Record<string, unknown> }>) {
  const bold = marks?.some(m => m.type === 'bold')
  const italic = marks?.some(m => m.type === 'italic')
  if (bold && italic) return S.boldItalic
  if (bold) return S.bold
  if (italic) return S.italic
  return undefined
}

function renderInlineNode(node: TNode, key: number): React.ReactElement | null {
  if (node.type === 'hardBreak') return <Text key={key}>{'\n'}</Text>

  if (node.type === 'text') {
    const isCode = node.marks?.some(m => m.type === 'code')
    const isLink = node.marks?.find(m => m.type === 'link')
    const baseStyle = inlineStyle(node.marks)

    if (isCode) return <Text key={key} style={S.inlineCode}>{node.text}</Text>
    if (isLink) return <Text key={key} style={[S.link, baseStyle ?? {}]}>{node.text}</Text>
    return <Text key={key} style={baseStyle}>{node.text}</Text>
  }

  return null
}

function renderInline(nodes: TNode[] = []): React.ReactElement[] {
  return nodes.map((n, i) => renderInlineNode(n, i)).filter(Boolean) as React.ReactElement[]
}

// ─── Block rendering ─────────────────────────────────────────────────────────

function renderBlock(
  node: TNode,
  key: number,
  imageDataMap: Record<string, string>,
): React.ReactElement | null {
  switch (node.type) {
    case 'paragraph':
      return (
        <Text key={key} style={S.paragraph}>
          {renderInline(node.content)}
        </Text>
      )

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1
      const style = level === 1 ? S.h1 : level === 2 ? S.h2 : S.h3
      return (
        <Text key={key} style={style}>
          {renderInline(node.content)}
        </Text>
      )
    }

    case 'horizontalRule':
      return <View key={key} style={S.hr} />

    case 'codeBlock':
      return (
        <View key={key} style={S.codeBlock}>
          <Text style={S.codeBlockText}>
            {node.content?.map(n => n.text ?? '').join('') ?? ''}
          </Text>
        </View>
      )

    case 'blockquote':
      return (
        <View key={key} style={S.blockquote}>
          {node.content?.map((child, i) => (
            <Text key={i} style={S.blockquoteText}>
              {renderInline(child.content)}
            </Text>
          ))}
        </View>
      )

    case 'bulletList':
      return (
        <View key={key}>
          {node.content?.map((item, i) =>
            renderListItem(item, i, 'bullet', imageDataMap),
          )}
        </View>
      )

    case 'orderedList':
      return (
        <View key={key}>
          {node.content?.map((item, i) =>
            renderListItem(item, i, 'ordered', imageDataMap, i + 1),
          )}
        </View>
      )

    case 'imageBlock': {
      const imageId = node.attrs?.imageId as string
      const caption = node.attrs?.caption as string | undefined
      const src = imageDataMap[imageId]
      if (!src) return null
      return (
        <View key={key} style={S.imageWrapper}>
          <Image style={S.image} src={src} />
          {caption && <Text style={S.caption}>{caption}</Text>}
        </View>
      )
    }

    default:
      return null
  }
}

function renderListItem(
  item: TNode,
  key: number,
  type: 'bullet' | 'ordered',
  imageDataMap: Record<string, string>,
  index?: number,
): React.ReactElement {
  const bullet = type === 'bullet' ? '•' : `${index}.`
  return (
    <View key={key} style={S.listItem}>
      <Text style={S.listBullet}>{bullet}</Text>
      <View style={S.listContent}>
        {item.content?.map((child, i) => renderBlock(child, i, imageDataMap))}
      </View>
    </View>
  )
}

// ─── Document ────────────────────────────────────────────────────────────────

interface DocPDFProps {
  doc: Doc
  imageDataMap: Record<string, string>
}

export function DocPDF({ doc, imageDataMap }: DocPDFProps) {
  const docContent = doc.content as { content?: TNode[] }
  const blocks: TNode[] = docContent?.content ?? []

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.docTitle}>{doc.title || 'Untitled'}</Text>
        <Text style={S.docType}>{DOC_TYPE_LABELS[doc.type]}</Text>
        <View style={S.headerDivider} />

        {blocks.map((node, i) => renderBlock(node, i, imageDataMap))}
      </Page>
    </Document>
  )
}
