-- ============================================================
-- 002 — Revoking an edit link removes the people who joined through it
-- Run once in the Supabase SQL editor after 001. (schema.sql already
-- includes this for fresh projects.)
--
-- Regenerating a link updates its token in place, so existing editors
-- keep access; only deleting (revoking) the edit share removes them.
-- ============================================================

CREATE OR REPLACE FUNCTION remove_editors_on_share_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.resource_type = 'doc' AND OLD.permission = 'edit' THEN
    DELETE FROM doc_editors WHERE doc_id = OLD.resource_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER shares_remove_editors AFTER DELETE ON shares
  FOR EACH ROW EXECUTE FUNCTION remove_editors_on_share_delete();
