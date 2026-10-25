# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # TypeScript check (tsc -b) + production build
npm run lint     # ESLint
npm run preview  # preview production build
```

TypeScript errors are strict (`noUnusedLocals`, `noUnusedParameters`). Always run `npm run build` to validate before considering a change done. There is no test suite.

## First-time setup

1. Create a Supabase project at supabase.com
2. Run `supabase/schema.sql` in the SQL editor (it is not idempotent — plain `CREATE TABLE`/`CREATE POLICY`, so run it once on a fresh project; schema changes need a hand-written migration)
3. Create a Storage bucket named `baton-images` (set to **public**)
4. Enable Google OAuth under Auth → Providers
5. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Architecture

**Baton** is a multi-user documentation web app backed by Supabase (Postgres + Storage + Auth). No offline mode.

### Auth
- `src/context/AuthContext.tsx` — wraps `supabase.auth.onAuthStateChange`, exposes `{ user, loading, signOut }`
- `src/pages/Login.tsx` — email/password + Google OAuth sign-in page
- `src/App.tsx` — `ProtectedRoute` redirects to `/login` when no session; `/share/:token` is public (no auth required)

### Data layer (`src/store/useDocs.ts`)
- All hooks use `@tanstack/react-query` internally but expose the same `T | undefined` API as before (undefined = loading)
- Supabase returns snake_case; `toDoc()` / `toFolder()` / `toImageBlock()` mappers convert to camelCase at the boundary
- Mutations call `queryClient.setQueryData` for optimistic cache updates, then `invalidateQueries` for consistency
- `src/lib/queryClient.ts` — singleton `QueryClient` (staleTime: 5 min)

### Storage
- Images are uploaded to the `baton-images` **public** bucket at path `{userId}/{docId}/{imageBlockId}`
- `image_blocks` table stores `storage_path` (not the data URL)
- `getImageUrl(storagePath)` in `src/lib/supabase.ts` converts a path to a public URL
- Images are cross-origin so canvas operations use `img.crossOrigin = 'anonymous'`

### Sharing
- `shares` table: one record per shared resource (doc or folder), with a `token` and `permission` ('view'|'edit')
- `get_shared_resource(token)` — Postgres RPC, runs `SECURITY DEFINER`, accessible by `anon` role — returns doc + image_blocks without auth
- `claim_edit_share(token)` — called by a logged-in user arriving via an edit link; inserts into `doc_editors` table to grant UPDATE access via RLS
- `src/components/share/ShareModal.tsx` — owner UI: permission toggle, copy-link, revoke
- `src/pages/SharedDoc.tsx` — public `/share/:token` route; read-only for view links, full editor for edit links (requires sign-in)

### Read-only / viewer mode
- `src/context/ViewerContext.tsx` — provides `{ imageBlocks: Record<id, {storagePath, annotations}>, isReadOnly }`
- `SharedDoc` pre-fetches all image blocks via the RPC and populates ViewerContext
- `ImageNodeView` checks ViewerContext first; falls back to a direct Supabase query in authenticated mode
- `RichEditor` accepts `readOnly?: boolean` — hides toolbar and sets Tiptap `editable: false`

### Editor (`src/components/editor/`)
- Tiptap v3 (not v2) — `BubbleMenu` moved to `@tiptap/extension-bubble-menu`, not `@tiptap/react`. `BubbleToolbar.tsx` doesn't use it; it's a custom floating div rendered via `createPortal`
- Images are a custom node (`imageExtension.ts` + `ImageNodeView.tsx`); the node stores the image block id, and the actual file/annotations live in the `image_blocks` row
- Image upload: `supabase.storage.from('baton-images').upload(path, file)` → `addImageBlock(docId, path)`
- Auto-save: 600ms debounce on title + content, uses optimistic cache update

### Annotations
- `AnnotationModal.tsx` is a react-konva canvas for drawing circles/arrows on an image block
- `ImageNodeView` opens it through `AnnotationContext` (`openAnnotation(imageId)`); the provider lives in `EditorPage` and `SharedDoc` (no-op for view-only links)
- Coordinates are stored as percentages (0–100) of image dimensions (see `Annotation` in `src/types/index.ts`)
- `src/lib/renderAnnotatedImage.ts` burns annotations onto a canvas and returns a data URL — used by the read-only viewer and PDF export

### Export (`src/lib/`)
- `exportPdf.ts` fetches the doc's image blocks, renders each with annotations via `renderAnnotatedImage`, then passes `imageDataMap` to `DocPDF.tsx`, which walks the Tiptap JSON tree and maps it to `@react-pdf/renderer` primitives (text-selectable, no html2canvas)
- `exportMarkdown.ts` walks the same Tiptap JSON to Markdown. Adding a Tiptap node/mark type means handling it in both walkers

### Styling and theme
- Tailwind v4 via `@tailwindcss/vite` (no `tailwind.config.js`), plus CSS tokens in `src/index.css`
- All colours use `var(--bg)`, `var(--text-1)`, etc. defined on `:root` and overridden on `html.dark`, so dark mode works automatically
- `ThemeContext` toggles the `dark` class on `<html>`, persists to `localStorage` (`baton-theme`) and swaps the favicon
- Doc types (`handoff`, `installation`, `account-setup`) are defined in `src/types/index.ts`. Badge colours exist twice: `.badge-*` classes in `index.css` (with dark variants, used by `TypeBadge`) and `DOC_TYPE_BADGES` (used by `DocIcon`). Keep them in sync when adding a type
