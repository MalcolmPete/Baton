import React from 'react'
import { pdf } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { supabase, getImageUrl } from './supabase'
import { renderAnnotatedImage } from './renderAnnotatedImage'
import type { Doc } from '../types'
import { DocPDF } from '../components/pdf/DocPDF'

export async function exportDocPdf(doc: Doc) {
  const { data: imageBlocks } = await supabase
    .from('image_blocks')
    .select('*')
    .eq('doc_id', doc.id)

  const imageDataMap: Record<string, string> = {}
  for (const block of imageBlocks ?? []) {
    const imgSrc = getImageUrl(block.storage_path as string)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const annotations = (block.annotations as any[]) ?? []
    imageDataMap[block.id as string] = await renderAnnotatedImage({ imgSrc, annotations })
  }

  const element = React.createElement(DocPDF, { doc, imageDataMap }) as React.ReactElement<DocumentProps>
  const blob = await pdf(element).toBlob()

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${doc.title || 'Untitled'}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
