import { createContext, useContext } from 'react'

interface AnnotationContextValue {
  openAnnotation: (imageId: string) => void
}

export const AnnotationContext = createContext<AnnotationContextValue>({
  openAnnotation: () => {},
})

export function useAnnotationContext() {
  return useContext(AnnotationContext)
}
