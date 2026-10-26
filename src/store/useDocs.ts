import { useQuery } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'
import { useAuth } from '../context/AuthContext'
import type { Doc, DocIcon, DocType, Folder, ImageBlock } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

// PostgreSQL's encode() doesn't support 'base64url', so we generate share tokens
// here using the Web Crypto API instead of relying on a database DEFAULT.
function generateShareToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...Array.from(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function uid(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('Not authenticated')
  return session.user.id
}

// ─── Row mappers (Supabase snake_case → app camelCase) ────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDoc(r: any): Doc {
  return {
    id: r.id, type: r.type, title: r.title, content: r.content,
    folderId: r.folder_id, icon: r.icon ?? undefined, version: r.version ?? 1,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toFolder(r: any): Folder {
  return { id: r.id, name: r.name, createdAt: new Date(r.created_at).getTime() }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toImageBlock(r: any): ImageBlock {
  return { id: r.id, docId: r.doc_id, storagePath: r.storage_path, annotations: r.annotations ?? [] }
}

// ─── Folders ──────────────────────────────────────────────────────────────────

export function useFolders(): Folder[] | undefined {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['folders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('folders').select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map(toFolder)
    },
    enabled: !!user,
  })
  return q.data
}

export function useFolder(id: string | null | undefined): Folder | null | undefined {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['folder', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('folders').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? toFolder(data) : null
    },
    enabled: !!user && !!id,
  })
  if (!id) return null
  if (q.isLoading) return undefined
  return q.data ?? null
}

export async function createFolder(name: string): Promise<string> {
  const { data, error } = await supabase
    .from('folders').insert({ name, user_id: await uid() }).select('id').single()
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: ['folders'] })
  return data.id as string
}

export async function renameFolder(id: string, name: string) {
  const { error } = await supabase.from('folders').update({ name }).eq('id', id)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: ['folders'] })
}

export async function deleteFolder(id: string) {
  // Docs in this folder get folder_id = NULL via DB ON DELETE SET NULL
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: ['folders'] })
  await queryClient.invalidateQueries({ queryKey: ['docs'] })
}

// ─── Docs ─────────────────────────────────────────────────────────────────────

export function useAllDocs(): Doc[] | undefined {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['docs', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('docs').select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(toDoc)
    },
    enabled: !!user,
  })
  return q.data
}

export function useDoc(id: string): Doc | undefined | null {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['doc', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('docs').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? toDoc(data) : null
    },
    enabled: !!user && !!id,
  })
  if (q.isLoading) return undefined
  return q.data ?? null
}

export async function createDoc(type: DocType, folderId: string | null = null): Promise<string> {
  const { data, error } = await supabase
    .from('docs')
    .insert({ type, folder_id: folderId, user_id: await uid(), title: '', content: { type: 'doc', content: [{ type: 'paragraph' }] } })
    .select('id').single()
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: ['docs'] })
  return data.id as string
}

export type DocUpdates = Partial<Pick<Doc, 'title' | 'content'>>

// Thrown when the doc was saved elsewhere since `expectedVersion` was loaded
export class DocConflictError extends Error {
  constructor() { super('This document was changed somewhere else') }
}

// Saves only if nobody else has saved since `expectedVersion`; returns the new version
export async function updateDoc(id: string, updates: DocUpdates, expectedVersion: number): Promise<number> {
  const row: Record<string, unknown> = {}
  if (updates.title !== undefined) row.title = updates.title
  if (updates.content !== undefined) row.content = updates.content
  const { data, error } = await supabase.from('docs').update(row)
    .eq('id', id).eq('version', expectedVersion)
    .select('version').maybeSingle()
  if (error) throw error
  if (!data) {
    // No row matched: either the version moved on, or we can't write this doc
    const current = await getDocVersion(id)
    if (current !== null && current !== expectedVersion) throw new DocConflictError()
    throw new Error("You don't have permission to edit this document")
  }
  const version = data.version as number
  queryClient.setQueryData<Doc>(['doc', id], old =>
    old ? { ...old, ...updates, version, updatedAt: Date.now() } : old,
  )
  // Invalidate the list so Home page picks up the change on next render
  queryClient.invalidateQueries({ queryKey: ['docs'] })
  return version
}

export async function getDocVersion(id: string): Promise<number | null> {
  const { data, error } = await supabase.from('docs').select('version').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? data.version as number : null
}

export async function updateDocIcon(docId: string, icon: DocIcon | undefined) {
  const { error } = await supabase.from('docs').update({ icon: icon ?? null }).eq('id', docId)
  if (error) throw error
  queryClient.invalidateQueries({ queryKey: ['docs'] })
}

export async function moveDocToFolder(docId: string, folderId: string | null) {
  const { error } = await supabase.from('docs').update({ folder_id: folderId }).eq('id', docId)
  if (error) throw error
  queryClient.invalidateQueries({ queryKey: ['docs'] })
}

export async function deleteDoc(id: string) {
  // image_blocks rows cascade with the doc, but their files have to be removed from Storage here
  const { data: blocks } = await supabase.from('image_blocks').select('storage_path').eq('doc_id', id)
  const paths = (blocks ?? []).map(b => b.storage_path as string)
  if (paths.length) await supabase.storage.from('baton-images').remove(paths)
  const { error } = await supabase.from('docs').delete().eq('id', id)
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: ['docs'] })
}

// ─── Image blocks ─────────────────────────────────────────────────────────────

export function useDocImageBlocks(docId: string): ImageBlock[] | undefined {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['imageBlocks', docId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_blocks').select('*').eq('doc_id', docId)
      if (error) throw error
      return (data ?? []).map(toImageBlock)
    },
    enabled: !!user && !!docId,
  })
  return q.data
}

export async function addImageBlock(docId: string, storagePath: string): Promise<string> {
  const id = uuidv4()
  const { error } = await supabase.from('image_blocks').insert({
    id, doc_id: docId, user_id: await uid(), storage_path: storagePath, annotations: [],
  })
  if (error) throw error
  await queryClient.invalidateQueries({ queryKey: ['imageBlocks', docId] })
  return id
}

// Single-block hook used by ImageNodeView for live annotation updates
export function useImageBlock(id: string | null): ImageBlock | null | undefined {
  const { user } = useAuth()
  const q = useQuery({
    queryKey: ['imageBlock', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('image_blocks').select('*').eq('id', id!).maybeSingle()
      if (error) throw error
      return data ? toImageBlock(data) : null
    },
    enabled: !!user && !!id,
  })
  if (!id || q.isLoading) return undefined
  return q.data ?? null
}

export async function updateImageBlock(id: string, updates: Partial<Pick<ImageBlock, 'annotations'>>) {
  const row: Record<string, unknown> = {}
  if (updates.annotations !== undefined) row.annotations = updates.annotations
  const { error } = await supabase.from('image_blocks').update(row).eq('id', id)
  if (error) throw error
  // Invalidate both the list and the single-block cache so ImageNodeView re-renders
  queryClient.invalidateQueries({ queryKey: ['imageBlocks'] })
  queryClient.invalidateQueries({ queryKey: ['imageBlock', id] })
}

// Image nodes can leave a doc many ways (delete button, backspace, cut, undo), and an
// undo can bring one back, so blocks aren't deleted with the node. Instead, blocks the
// saved content no longer references are swept once they're older than the grace period.
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000

function collectImageIds(node: unknown, ids: Set<string>) {
  if (!node || typeof node !== 'object') return
  const n = node as { type?: string; attrs?: { imageId?: string }; content?: unknown[] }
  if (n.type === 'imageBlock' && n.attrs?.imageId) ids.add(n.attrs.imageId)
  n.content?.forEach(child => collectImageIds(child, ids))
}

export async function cleanupOrphanImages(docId: string) {
  const [{ data: doc }, { data: blocks }] = await Promise.all([
    supabase.from('docs').select('content').eq('id', docId).maybeSingle(),
    supabase.from('image_blocks').select('id, storage_path, created_at').eq('doc_id', docId),
  ])
  if (!doc || !blocks) return
  const referenced = new Set<string>()
  collectImageIds(doc.content, referenced)
  const cutoff = Date.now() - ORPHAN_GRACE_MS
  const orphans = blocks.filter(b => !referenced.has(b.id as string) && new Date(b.created_at as string).getTime() < cutoff)
  if (!orphans.length) return
  // Only drop rows whose file was actually removed (Storage policies may refuse some)
  const { data: removed } = await supabase.storage.from('baton-images').remove(orphans.map(b => b.storage_path as string))
  const removedPaths = new Set((removed ?? []).map(f => f.name))
  const ids = orphans.filter(b => removedPaths.has(b.storage_path as string)).map(b => b.id as string)
  if (ids.length) await supabase.from('image_blocks').delete().in('id', ids)
}

// ─── Shares ───────────────────────────────────────────────────────────────────

export interface ShareRecord {
  id: string
  token: string
}

// Returns both the view and edit share for a resource (either can be null if not yet created)
export async function getShares(
  resourceType: 'doc' | 'folder',
  resourceId: string,
): Promise<{ view: ShareRecord | null; edit: ShareRecord | null }> {
  const { data } = await supabase.from('shares')
    .select('id, token, permission')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)

  const view = data?.find(s => s.permission === 'view')
  const edit = data?.find(s => s.permission === 'edit')
  return {
    view: view ? { id: view.id as string, token: view.token as string } : null,
    edit: edit ? { id: edit.id as string, token: edit.token as string } : null,
  }
}

// Creates (or regenerates) the share link for a specific permission level.
// Only touches the share record for that permission — the other is untouched.
export async function upsertShare(
  resourceType: 'doc' | 'folder',
  resourceId: string,
  permission: 'view' | 'edit',
): Promise<ShareRecord> {
  const currentUid = await uid()
  // Remove any existing share for this resource + permission only
  await supabase.from('shares')
    .delete()
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('owner_id', currentUid)
    .eq('permission', permission)

  const token = generateShareToken()
  const { data, error } = await supabase.from('shares')
    .insert({ resource_type: resourceType, resource_id: resourceId, permission, owner_id: currentUid, token })
    .select('id, token').single()
  if (error) throw error
  return { id: data.id as string, token: data.token as string }
}

export async function deleteShare(shareId: string) {
  const { error } = await supabase.from('shares').delete().eq('id', shareId)
  if (error) throw error
}
