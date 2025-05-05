-- Create template_versions table
CREATE TABLE template_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES checklist_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name TEXT NOT NULL,
    items TEXT[] NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(template_id, version)
);

-- Enable RLS
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own template versions"
    ON template_versions FOR SELECT
    USING (
        created_by = auth.uid() OR
        template_id IN (
            SELECT id FROM checklist_templates
            WHERE mentor_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own template versions"
    ON template_versions FOR INSERT
    WITH CHECK (created_by = auth.uid());

-- Create template_usage table
CREATE TABLE template_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_id UUID REFERENCES checklist_templates(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    UNIQUE(template_id, session_id)
);

-- Enable RLS
ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own template usage"
    ON template_usage FOR SELECT
    USING (
        template_id IN (
            SELECT id FROM checklist_templates
            WHERE mentor_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own template usage"
    ON template_usage FOR INSERT
    WITH CHECK (
        template_id IN (
            SELECT id FROM checklist_templates
            WHERE mentor_id = auth.uid()
        )
    );

-- Create function to get template statistics
CREATE OR REPLACE FUNCTION get_template_statistics(p_mentor_id UUID)
RETURNS TABLE (
    template_id UUID,
    total_uses BIGINT,
    last_used TIMESTAMP WITH TIME ZONE,
    average_rating NUMERIC,
    total_sessions BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as template_id,
        COUNT(tu.id) as total_uses,
        MAX(tu.used_at) as last_used,
        COALESCE(AVG(tu.rating), 0) as average_rating,
        COUNT(DISTINCT tu.session_id) as total_sessions
    FROM checklist_templates t
    LEFT JOIN template_usage tu ON t.id = tu.template_id
    WHERE t.mentor_id = p_mentor_id
    GROUP BY t.id;
END;
$$;

-- Create trigger to create version when template is updated
CREATE OR REPLACE FUNCTION create_template_version()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO template_versions (
        template_id,
        version,
        name,
        items,
        category,
        created_by
    )
    VALUES (
        NEW.id,
        COALESCE(
            (SELECT MAX(version) + 1 
             FROM template_versions 
             WHERE template_id = NEW.id),
            1
        ),
        NEW.name,
        NEW.items,
        NEW.category,
        NEW.mentor_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_template_update
    AFTER UPDATE ON checklist_templates
    FOR EACH ROW
    EXECUTE FUNCTION create_template_version();

-- Create trigger to track template usage
CREATE OR REPLACE FUNCTION track_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO template_usage (template_id, session_id)
    VALUES (NEW.template_id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_create
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION track_template_usage(); 