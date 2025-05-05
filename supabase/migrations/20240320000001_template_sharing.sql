-- Create shared_templates table
CREATE TABLE shared_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES checklist_templates(id) ON DELETE CASCADE,
    shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    UNIQUE(template_id, shared_with)
);

-- Enable RLS
ALTER TABLE shared_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view templates shared with them"
    ON shared_templates FOR SELECT
    USING (shared_with = auth.uid());

CREATE POLICY "Users can view templates they shared"
    ON shared_templates FOR SELECT
    USING (shared_by = auth.uid());

CREATE POLICY "Users can share their templates"
    ON shared_templates FOR INSERT
    WITH CHECK (
        shared_by = auth.uid() AND
        template_id IN (
            SELECT id FROM checklist_templates
            WHERE mentor_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shared template status"
    ON shared_templates FOR UPDATE
    USING (shared_with = auth.uid())
    WITH CHECK (shared_with = auth.uid());

-- Create template_feedback table
CREATE TABLE template_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES checklist_templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(template_id, user_id)
);

-- Enable RLS
ALTER TABLE template_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view feedback for their templates"
    ON template_feedback FOR SELECT
    USING (
        template_id IN (
            SELECT id FROM checklist_templates
            WHERE mentor_id = auth.uid()
        )
    );

CREATE POLICY "Users can provide feedback"
    ON template_feedback FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        template_id IN (
            SELECT id FROM checklist_templates
            WHERE mentor_id = auth.uid()
        )
    );

-- Create function to share template
CREATE OR REPLACE FUNCTION share_template(
    p_template_id UUID,
    p_shared_with UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_shared_template_id UUID;
BEGIN
    -- Check if template exists and belongs to the user
    IF NOT EXISTS (
        SELECT 1 FROM checklist_templates
        WHERE id = p_template_id AND mentor_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Template not found or access denied';
    END IF;

    -- Check if template is already shared
    IF EXISTS (
        SELECT 1 FROM shared_templates
        WHERE template_id = p_template_id AND shared_with = p_shared_with
    ) THEN
        RAISE EXCEPTION 'Template already shared with this user';
    END IF;

    -- Create shared template record
    INSERT INTO shared_templates (
        template_id,
        shared_by,
        shared_with
    )
    VALUES (
        p_template_id,
        auth.uid(),
        p_shared_with
    )
    RETURNING id INTO v_shared_template_id;

    RETURN v_shared_template_id;
END;
$$;

-- Create function to accept shared template
CREATE OR REPLACE FUNCTION accept_shared_template(
    p_shared_template_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_template_id UUID;
BEGIN
    -- Check if shared template exists and is pending
    IF NOT EXISTS (
        SELECT 1 FROM shared_templates
        WHERE id = p_shared_template_id
        AND shared_with = auth.uid()
        AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'Shared template not found or already processed';
    END IF;

    -- Create new template from shared template
    INSERT INTO checklist_templates (
        mentor_id,
        name,
        items,
        category
    )
    SELECT
        auth.uid(),
        ct.name,
        ct.items,
        ct.category
    FROM shared_templates st
    JOIN checklist_templates ct ON st.template_id = ct.id
    WHERE st.id = p_shared_template_id
    RETURNING id INTO v_new_template_id;

    -- Update shared template status
    UPDATE shared_templates
    SET status = 'accepted'
    WHERE id = p_shared_template_id;

    RETURN v_new_template_id;
END;
$$;

-- Create function to get shared templates
CREATE OR REPLACE FUNCTION get_shared_templates()
RETURNS TABLE (
    id UUID,
    template_id UUID,
    template_name TEXT,
    shared_by_name TEXT,
    shared_at TIMESTAMP WITH TIME ZONE,
    status TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.template_id,
        ct.name as template_name,
        p.full_name as shared_by_name,
        st.shared_at,
        st.status
    FROM shared_templates st
    JOIN checklist_templates ct ON st.template_id = ct.id
    JOIN profiles p ON st.shared_by = p.id
    WHERE st.shared_with = auth.uid()
    ORDER BY st.shared_at DESC;
END;
$$; 