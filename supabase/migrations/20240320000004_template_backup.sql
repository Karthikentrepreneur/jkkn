-- Create template_backups table
CREATE TABLE IF NOT EXISTS template_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  templates JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  restored_at TIMESTAMP WITH TIME ZONE,
  is_auto_backup BOOLEAN DEFAULT false
);

-- Add RLS policies
ALTER TABLE template_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backups"
  ON template_backups FOR SELECT
  USING (auth.uid() = mentor_id);

CREATE POLICY "Users can create their own backups"
  ON template_backups FOR INSERT
  WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Users can update their own backups"
  ON template_backups FOR UPDATE
  USING (auth.uid() = mentor_id);

CREATE POLICY "Users can delete their own backups"
  ON template_backups FOR DELETE
  USING (auth.uid() = mentor_id);

-- Create function to create backup
CREATE OR REPLACE FUNCTION create_template_backup(
  p_mentor_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_auto_backup BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  v_backup_id UUID;
  v_templates JSONB;
BEGIN
  -- Get all templates for the mentor
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'items', t.items,
      'category', t.category,
      'created_at', t.created_at
    )
  ) INTO v_templates
  FROM checklist_templates t
  WHERE t.mentor_id = p_mentor_id;

  -- Create backup
  INSERT INTO template_backups (
    mentor_id,
    name,
    description,
    templates,
    is_auto_backup
  ) VALUES (
    p_mentor_id,
    p_name,
    p_description,
    v_templates,
    p_is_auto_backup
  ) RETURNING id INTO v_backup_id;

  RETURN v_backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore backup
CREATE OR REPLACE FUNCTION restore_template_backup(
  p_backup_id UUID
) RETURNS VOID AS $$
DECLARE
  v_mentor_id UUID;
  v_templates JSONB;
BEGIN
  -- Get backup data
  SELECT mentor_id, templates INTO v_mentor_id, v_templates
  FROM template_backups
  WHERE id = p_backup_id;

  -- Delete existing templates
  DELETE FROM checklist_templates
  WHERE mentor_id = v_mentor_id;

  -- Restore templates
  INSERT INTO checklist_templates (
    mentor_id,
    name,
    items,
    category,
    created_at
  )
  SELECT
    v_mentor_id,
    (template->>'name')::TEXT,
    (template->>'items')::TEXT[],
    (template->>'category')::TEXT,
    (template->>'created_at')::TIMESTAMP WITH TIME ZONE
  FROM jsonb_array_elements(v_templates) AS template;

  -- Update restored_at timestamp
  UPDATE template_backups
  SET restored_at = timezone('utc'::text, now())
  WHERE id = p_backup_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for automatic daily backup
CREATE OR REPLACE FUNCTION create_daily_backup() RETURNS VOID AS $$
DECLARE
  v_mentor_id UUID;
BEGIN
  FOR v_mentor_id IN
    SELECT DISTINCT mentor_id FROM checklist_templates
  LOOP
    PERFORM create_template_backup(
      v_mentor_id,
      'Daily Backup ' || timezone('utc'::text, now())::DATE,
      'Automatic daily backup',
      true
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job for daily backup
SELECT cron.schedule(
  'daily-template-backup',
  '0 0 * * *',  -- Run at midnight every day
  $$SELECT create_daily_backup()$$
); 