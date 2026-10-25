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
    folderId: r.folder_id, icon: r.icon ?? undefined,
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

export async function updateDoc(id: string, updates: Partial<Pick<Doc, 'title' | 'content'>>) {
  const row: Record<string, unknown> = {}
  if (updates.title !== undefined) row.title = updates.title
  if (updates.content !== undefined) row.content = updates.content
  const { error } = await supabase.from('docs').update(row).eq('id', id)
  if (error) throw error
  // Optimistically update the single-doc cache (correct exact key)
  queryClient.setQueryData<Doc>(['doc', id], old =>
    old ? { ...old, ...updates, updatedAt: Date.now() } : old,
  )
  // Invalidate the list so Home page picks up the change on next render
  queryClient.invalidateQueries({ queryKey: ['docs'] })
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

export async function deleteImageBlock(id: string) {
  // Fetch storage_path first so we can clean up Storage
  const { data } = await supabase.from('image_blocks').select('storage_path, doc_id').eq('id', id).maybeSingle()
  if (data) {
    await supabase.storage.from('baton-images').remove([data.storage_path])
    await queryClient.invalidateQueries({ queryKey: ['imageBlocks', data.doc_id] })
  }
  const { error } = await supabase.from('image_blocks').delete().eq('id', id)
  if (error) throw error
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
