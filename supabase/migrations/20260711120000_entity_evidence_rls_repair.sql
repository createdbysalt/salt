-- Repair RLS policies for entity_evidence table
-- The original migration may have been marked applied without policies being created

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their workspace evidence" ON entity_evidence;
DROP POLICY IF EXISTS "Users can insert evidence in their workspace" ON entity_evidence;
DROP POLICY IF EXISTS "Users can update evidence in their workspace" ON entity_evidence;
DROP POLICY IF EXISTS "Service role full access" ON entity_evidence;

-- Recreate all policies
CREATE POLICY "Users can view their workspace evidence"
  ON entity_evidence FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert evidence in their workspace"
  ON entity_evidence FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update evidence in their workspace"
  ON entity_evidence FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role full access"
  ON entity_evidence FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
