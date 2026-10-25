import { createContext, useContext } from 'react'
import type { Annotation } from '../types'

// Populated by SharedDoc for anonymous/read-only viewing.
// ImageNodeView checks this first before querying Supabase.
export interface ViewerImageBlock {
  storagePath: string
  annotations: Annotation[]
}

interface ViewerContextValue {
  imageBlocks: Record<string, ViewerImageBlock>   // keyed by imageBlock id
  isReadOnly: boolean
}

export const ViewerContext = createContext<ViewerContextValue>({
  imageBlocks: {},
  isReadOnly: false,
})

export function useViewer() {
  return useContext(ViewerContext)
}
