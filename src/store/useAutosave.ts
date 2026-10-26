import { useCallback, useEffect, useRef, useState } from 'react'
import { updateDoc, getDocVersion, DocConflictError, type DocUpdates } from './useDocs'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error' | 'conflict'

const SAVE_DEBOUNCE_MS = 600

// Debounced title/content saving with status, conflict detection, and no lost edits:
// pending changes are flushed when the editor unmounts, and closing the tab warns first.
export function useAutosave(docId: string, initialVersion: number) {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [error, setError] = useState<string | null>(null)
  // The version this editor last loaded or saved. Kept separate from the query cache,
  // which can refetch someone else's version without the editor content changing.
  const version = useRef(initialVersion)
  const pending = useRef<DocUpdates>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const conflicted = useRef(false)

  const flush = useCallback(async () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    while (inFlight.current) await inFlight.current
    const updates = pending.current
    if (conflicted.current || Object.keys(updates).length === 0) return
    pending.current = {}
    setStatus('saving')
    const save = updateDoc(docId, updates, version.current)
      .then(v => {
        version.current = v
        setError(null)
        setStatus(Object.keys(pending.current).length ? 'pending' : 'saved')
      })
      .catch((err: unknown) => {
        // Keep the unsaved changes (newer edits win) so a retry sends them
        pending.current = { ...updates, ...pending.current }
        if (err instanceof DocConflictError) conflicted.current = true
        setError(err instanceof Error ? err.message : String(err))
        setStatus(err instanceof DocConflictError ? 'conflict' : 'error')
      })
      .finally(() => { inFlight.current = null })
    inFlight.current = save
    await save
  }, [docId])

  const schedule = useCallback((updates: DocUpdates) => {
    pending.current = { ...pending.current, ...updates }
    if (conflicted.current) return
    setStatus('pending')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, SAVE_DEBOUNCE_MS)
  }, [flush])

  // Conflict: save this editor's version over the other one
  const overwrite = useCallback(async () => {
    const current = await getDocVersion(docId)
    if (current === null) return
    version.current = current
    conflicted.current = false
    await flush()
  }, [docId, flush])

  // Conflict: drop this editor's changes and load the latest
  const discardAndReload = useCallback(() => {
    pending.current = {}
    window.location.reload()
  }, [])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (Object.keys(pending.current).length || inFlight.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      void flush()
    }
  }, [flush])

  return { status, error, schedule, flush, overwrite, discardAndReload }
}
