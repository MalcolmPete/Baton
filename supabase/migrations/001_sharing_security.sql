-- ============================================================
-- 001 — Sharing security, edit-link saving, image cleanup, save conflicts
-- Run once in the Supabase SQL editor on a database created from the
-- original schema.sql. (schema.sql already includes these changes for
-- fresh projects.)
-- ============================================================

-- ── Helper: can the current user edit this doc? ──────────────────────────────

CREATE OR REPLACE FUNCTION can_edit_doc(p_doc_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM docs WHERE id = p_doc_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM doc_editors WHERE doc_id = p_doc_id AND user_id = auth.uid());
$$;

-- ── shares: you can only share resources you own ─────────────────────────────

DROP POLICY "shares_owner" ON shares;
CREATE POLICY "shares_owner" ON shares FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid() AND (
      (resource_type = 'doc'    AND EXISTS (SELECT 1 FROM docs    WHERE docs.id    = shares.resource_id AND docs.user_id    = auth.uid())) OR
      (resource_type = 'folder' AND EXISTS (SELECT 1 FROM folders WHERE folders.id = shares.resource_id AND folders.user_id = auth.uid()))
    )
  );

-- Remove any share that was created for a resource its creator doesn't own
DELETE FROM shares s
WHERE NOT (
  (s.resource_type = 'doc'    AND EXISTS (SELECT 1 FROM docs    d WHERE d.id = s.resource_id AND d.user_id = s.owner_id)) OR
  (s.resource_type = 'folder' AND EXISTS (SELECT 1 FROM folders f WHERE f.id = s.resource_id AND f.user_id = s.owner_id))
);

-- Remove editors of docs that no longer have a valid edit link
-- (covers access gained through the shares removed above, and revoked links)
DELETE FROM doc_editors de
WHERE NOT EXISTS (
  SELECT 1 FROM shares s JOIN docs d ON d.id = s.resource_id AND d.user_id = s.owner_id
  WHERE s.resource_type = 'doc' AND s.permission = 'edit' AND s.resource_id = de.doc_id
);

-- ── docs: editors may change title and content only ──────────────────────────

CREATE OR REPLACE FUNCTION protect_doc_owner_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM OLD.user_id AND (
       NEW.user_id   IS DISTINCT FROM OLD.user_id
    OR NEW.folder_id IS DISTINCT FROM OLD.folder_id
    OR NEW.type      IS DISTINCT FROM OLD.type
    OR NEW.icon      IS DISTINCT FROM OLD.icon
  ) THEN
    RAISE EXCEPTION 'Only the owner can change a document''s owner, folder, type or icon';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER docs_protect_owner_fields BEFORE UPDATE ON docs
  FOR EACH ROW EXECUTE FUNCTION protect_doc_owner_fields();

-- ── docs.version: detects two people saving over each other ─────────────────

ALTER TABLE docs ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION bump_doc_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER docs_bump_version BEFORE UPDATE ON docs
  FOR EACH ROW EXECUTE FUNCTION bump_doc_version();

-- ── image_blocks: owner and claimed editors of the doc ───────────────────────

DROP POLICY "image_blocks_owner" ON image_blocks;
DROP POLICY "image_blocks_editor" ON image_blocks;

CREATE POLICY "image_blocks_select" ON image_blocks FOR SELECT
  USING (can_edit_doc(doc_id));
CREATE POLICY "image_blocks_insert" ON image_blocks FOR INSERT
  WITH CHECK (user_id = auth.uid() AND can_edit_doc(doc_id));
CREATE POLICY "image_blocks_update" ON image_blocks FOR UPDATE
  USING (can_edit_doc(doc_id)) WITH CHECK (can_edit_doc(doc_id));
CREATE POLICY "image_blocks_delete" ON image_blocks FOR DELETE
  USING (can_edit_doc(doc_id));

-- ── Storage: allow deleting image files ──────────────────────────────────────
-- Paths are {uploaderId}/{docId}/{file}. Uploaders can delete their own files,
-- and doc owners can delete any file in their docs.

CREATE POLICY "baton_images_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'baton-images' AND (
      (storage.foldername(name))[1] = auth.uid()::text OR
      EXISTS (SELECT 1 FROM public.docs WHERE docs.id::text = (storage.foldername(name))[2] AND docs.user_id = auth.uid())
    )
  );

-- ── RPCs: ignore shares whose creator doesn't own the resource ───────────────

CREATE OR REPLACE FUNCTION get_shared_resource(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_share shares%ROWTYPE;
  v_result JSONB;
BEGIN
  SELECT * INTO v_share FROM shares WHERE token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_share.resource_type = 'doc' THEN
    SELECT jsonb_build_object(
      'permission',    v_share.permission,
      'resource_type', 'doc',
      'doc',           to_jsonb(d) - 'user_id',
      'image_blocks',  COALESCE((
        SELECT jsonb_agg(to_jsonb(ib) - 'user_id')
        FROM image_blocks ib WHERE ib.doc_id = d.id
      ), '[]'::jsonb)
    ) INTO v_result
    FROM docs d WHERE d.id = v_share.resource_id AND d.user_id = v_share.owner_id;
  ELSE
    SELECT jsonb_build_object(
      'permission',    v_share.permission,
      'resource_type', 'folder',
      'folder',        to_jsonb(f) - 'user_id',
      'docs',          COALESCE((
        SELECT jsonb_agg(
          (to_jsonb(d) - 'user_id') || jsonb_build_object(
            'image_blocks', COALESCE((
              SELECT jsonb_agg(to_jsonb(ib) - 'user_id')
              FROM image_blocks ib WHERE ib.doc_id = d.id
            ), '[]'::jsonb)
          )
        )
        FROM docs d WHERE d.folder_id = f.id AND d.user_id = f.user_id
      ), '[]'::jsonb)
    ) INTO v_result
    FROM folders f WHERE f.id = v_share.resource_id AND f.user_id = v_share.owner_id;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION claim_edit_share(p_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_share shares%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;

  SELECT s.* INTO v_share FROM shares s
  JOIN docs d ON d.id = s.resource_id AND d.user_id = s.owner_id
  WHERE s.token = p_token AND s.permission = 'edit' AND s.resource_type = 'doc';

  IF NOT FOUND THEN RETURN FALSE; END IF;
  -- Don't add the owner as an editor
  IF v_share.owner_id = auth.uid() THEN RETURN TRUE; END IF;

  INSERT INTO doc_editors (doc_id, user_id)
  VALUES (v_share.resource_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN TRUE;
END;
$$;
