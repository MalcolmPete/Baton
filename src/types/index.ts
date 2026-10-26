export type DocType = 'handoff' | 'installation' | 'account-setup'

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  handoff: 'Handoff',
  installation: 'Installation Guide',
  'account-setup': 'Account Setup',
}

export const DOC_TYPE_BADGES: Record<DocType, { bg: string; color: string }> = {
  handoff:        { bg: '#E6F1FB', color: '#0C447C' },
  installation:   { bg: '#EAF3DE', color: '#27500A' },
  'account-setup':{ bg: '#EEEDFE', color: '#3C3489' },
}

// Coordinates stored as percentages (0–100) relative to image dimensions
export interface Annotation {
  id: string
  type: 'circle' | 'arrow'
  x: number
  y: number
  radius?: number  // circle: % of image width
  x2?: number      // arrow end: % of image width
  y2?: number      // arrow end: % of image height
}

export interface ImageBlock {
  id: string
  docId: string
  storagePath: string
  annotations: Annotation[]
}

export interface Share {
  id: string
  ownerId: string
  resourceType: 'doc' | 'folder'
  resourceId: string
  permission: 'view' | 'edit'
  token: string
  createdAt: number
}

export interface Folder {
  id: string
  name: string
  createdAt: number
}

export type DocIcon =
  | { type: 'standard'; id: string }
  | { type: 'brand'; id: string }
  | { type: 'image'; dataUrl: string }

export interface Doc {
  id: string
  type: DocType
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>  // Tiptap JSON document
  folderId: string | null
  icon?: DocIcon
  version: number  // bumped by the DB on every title/content change
  createdAt: number
  updatedAt: number
}

// What the doc list needs: everything except the (potentially large) content
export type DocSummary = Omit<Doc, 'content'>
