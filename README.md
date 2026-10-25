# Baton

Baton is a documentation app for writing handoff notes, installation guides and account-setup docs, with annotated screenshots, sharing links and PDF or Markdown export.

## Features

- **Rich text editor:** headings, lists, code blocks, callouts, highlights and tables
- **Images:** upload, drag and drop or paste straight from the clipboard
- **Annotations:** draw circles and arrows on screenshots to point things out
- **Doc types and folders:** organise docs as Handoff, Installation Guide or Account Setup and group them in folders
- **Sharing:** create view-only or edit links; anyone can open view links without an account
- **Export:** download any doc as a PDF (with selectable text) or as Markdown
- **Sign-in:** email and password or Google

## Tech stack

- React 19, TypeScript and Vite
- [Tiptap](https://tiptap.dev) v3 for the editor
- [Supabase](https://supabase.com) for the database (Postgres), sign-in and image storage
- TanStack Query for data fetching and caching
- react-konva for annotations, `@react-pdf/renderer` for PDF export
- Tailwind CSS v4