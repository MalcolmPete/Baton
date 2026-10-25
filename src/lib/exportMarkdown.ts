type Mark = { type: string; attrs?: Record<string, unknown> }
type Node = { type: string; text?: string; content?: Node[]; marks?: Mark[]; attrs?: Record<string, unknown> }

function applyMarks(text: string, marks: Mark[] = []): string {
  let s = text
  for (const m of marks) {
    switch (m.type) {
      case 'bold':      s = `**${s}**`; break
      case 'italic':    s = `*${s}*`;   break
      case 'strike':    s = `~~${s}~~`; break
      case 'code':      s = `\`${s}\``; break
      case 'highlight': s = `==${s}==`; break
      case 'link':      s = `[${s}](${m.attrs?.href ?? ''})`; break
    }
  }
  return s
}

function inlineContent(nodes: Node[]): string {
  return nodes.map(n => {
    if (n.type === 'text')      return applyMarks(n.text ?? '', n.marks)
    if (n.type === 'hardBreak') return '  \n'
    return ''
  }).join('')
}

function tableRow(node: Node, isHeader: boolean): string {
  const cells = (node.content ?? []).map(cell => {
    const text = inlineContent(
      (cell.content ?? []).flatMap(p => p.content ?? [])
    ).replace(/\|/g, '\\|').trim()
    return ` ${text} `
  })
  const row = `|${cells.join('|')}|`
  if (!isHeader) return row
  const sep = `|${cells.map(() => ' --- ').join('|')}|`
  return `${row}\n${sep}`
}

function nodeToMd(node: Node, listDepth = 0, listIndex = 0): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(n => nodeToMd(n)).join('\n')

    case 'paragraph':
      return (node.content ? inlineContent(node.content) : '') + '\n'

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1
      return `${'#'.repeat(level)} ${inlineContent(node.content ?? [])}\n`
    }

    case 'bulletList':
      return (node.content ?? []).map(n => nodeToMd(n, listDepth, -1)).join('')

    case 'orderedList':
      return (node.content ?? []).map((n, i) => nodeToMd(n, listDepth, i + 1)).join('')

    case 'listItem': {
      const indent = '  '.repeat(listDepth)
      const bullet = listIndex < 0 ? '-' : `${listIndex}.`
      const inner = (node.content ?? []).map(n => {
        if (n.type === 'bulletList' || n.type === 'orderedList')
          return nodeToMd(n, listDepth + 1, -1)
        return inlineContent(n.content ?? [])
      }).join('').trim()
      return `${indent}${bullet} ${inner}\n`
    }

    case 'blockquote':
      return (node.content ?? [])
        .map(n => `> ${inlineContent(n.content ?? [])}\n`)
        .join('')

    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? ''
      const code = (node.content ?? []).map(n => n.text ?? '').join('')
      return `\`\`\`${lang}\n${code}\n\`\`\`\n`
    }

    case 'horizontalRule':
      return '---\n'

    case 'table': {
      const rows = node.content ?? []
      return rows.map((row, i) => tableRow(row, i === 0) + '\n').join('')
    }

    case 'imageBlock': {
      const caption = (node.attrs?.caption as string) || 'image'
      return `![${caption}](image)\n`
    }

    default:
      return ''
  }
}

export function tiptapToMarkdown(doc: Record<string, unknown>): string {
  return nodeToMd(doc as Node).trim()
}

export function downloadMarkdown(markdown: string, filename: string) {
  const blob = new Blob([markdown], { type: 'text/markdown; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`
  a.click()
  URL.revokeObjectURL(url)
}
