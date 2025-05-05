-- Create function to get template usage statistics
CREATE OR REPLACE FUNCTION get_template_usage_stats(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() - INTERVAL '30 days'),
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    template_id UUID,
    template_name TEXT,
    category TEXT,
    total_uses BIGINT,
    unique_sessions BIGINT,
    average_rating NUMERIC,
    completion_rate NUMERIC,
    most_used_day TEXT,
    most_used_time TEXT,
    feedback_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH template_stats AS (
        SELECT 
            t.id as template_id,
            t.name as template_name,
            t.category,
            COUNT(tu.id) as total_uses,
            COUNT(DISTINCT tu.session_id) as unique_sessions,
            COALESCE(AVG(tu.rating), 0) as average_rating,
            COUNT(DISTINCT CASE WHEN tu.rating IS NOT NULL THEN tu.id END) as feedback_count,
            EXTRACT(DOW FROM s.date) as day_of_week,
            EXTRACT(HOUR FROM s.date) as hour_of_day,
            COUNT(*) as day_time_count
        FROM checklist_templates t
        LEFT JOIN template_usage tu ON t.id = tu.template_id
        LEFT JOIN sessions s ON tu.session_id = s.id
        WHERE t.mentor_id = auth.uid()
        AND (s.date BETWEEN p_start_date AND p_end_date OR s.date IS NULL)
        GROUP BY t.id, t.name, t.category, EXTRACT(DOW FROM s.date), EXTRACT(HOUR FROM s.date)
    ),
    completion_stats AS (
        SELECT 
            template_id,
            COUNT(*) FILTER (WHERE completed)::NUMERIC / NULLIF(COUNT(*), 0) as completion_rate
        FROM (
            SELECT 
                tu.template_id,
                CASE WHEN COUNT(*) = COUNT(*) FILTER (WHERE completed) THEN true ELSE false END as completed
            FROM template_usage tu
            JOIN session_checklist sc ON tu.session_id = sc.session_id
            GROUP BY tu.template_id, tu.session_id
        ) completed_sessions
        GROUP BY template_id
    ),
    most_used_times AS (
        SELECT 
            template_id,
            CASE 
                WHEN day_of_week = 0 THEN 'Sunday'
                WHEN day_of_week = 1 THEN 'Monday'
                WHEN day_of_week = 2 THEN 'Tuesday'
                WHEN day_of_week = 3 THEN 'Wednesday'
                WHEN day_of_week = 4 THEN 'Thursday'
                WHEN day_of_week = 5 THEN 'Friday'
                WHEN day_of_week = 6 THEN 'Saturday'
            END as most_used_day,
            CASE 
                WHEN hour_of_day BETWEEN 9 AND 11 THEN 'Morning (9-11)'
                WHEN hour_of_day BETWEEN 12 AND 14 THEN 'Afternoon (12-14)'
                WHEN hour_of_day BETWEEN 15 AND 17 THEN 'Late Afternoon (15-17)'
                ELSE 'Other'
            END as most_used_time
        FROM (
            SELECT 
                template_id,
                day_of_week,
                hour_of_day,
                ROW_NUMBER() OVER (PARTITION BY template_id ORDER BY day_time_count DESC) as rn
            FROM template_stats
        ) ranked_times
        WHERE rn = 1
    )
    SELECT 
        ts.template_id,
        ts.template_name,
        ts.category,
        ts.total_uses,
        ts.unique_sessions,
        ts.average_rating,
        COALESCE(cs.completion_rate, 0) as completion_rate,
        mut.most_used_day,
        mut.most_used_time,
        ts.feedback_count
    FROM template_stats ts
    LEFT JOIN completion_stats cs ON ts.template_id = cs.template_id
    LEFT JOIN most_used_times mut ON ts.template_id = mut.template_id
    GROUP BY 
        ts.template_id,
        ts.template_name,
        ts.category,
        ts.total_uses,
        ts.unique_sessions,
        ts.average_rating,
        cs.completion_rate,
        mut.most_used_day,
        mut.most_used_time,
        ts.feedback_count;
END;
$$;

-- Create function to get template usage trends
CREATE OR REPLACE FUNCTION get_template_usage_trends(
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    total_templates_used BIGINT,
    total_sessions BIGINT,
    average_rating NUMERIC,
    most_used_template TEXT,
    most_used_category TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            DATE(s.date) as date,
            COUNT(DISTINCT tu.template_id) as total_templates_used,
            COUNT(DISTINCT s.id) as total_sessions,
            COALESCE(AVG(tu.rating), 0) as average_rating,
            t.name as template_name,
            t.category,
            COUNT(*) as template_use_count
        FROM sessions s
        JOIN template_usage tu ON s.id = tu.session_id
        JOIN checklist_templates t ON tu.template_id = t.id
        WHERE s.mentor_id = auth.uid()
        AND s.date >= (NOW() - (p_days || ' days')::INTERVAL)
        GROUP BY DATE(s.date), t.name, t.category
    ),
    ranked_templates AS (
        SELECT 
            date,
            template_name,
            template_use_count,
            ROW_NUMBER() OVER (PARTITION BY date ORDER BY template_use_count DESC) as rn
        FROM daily_stats
    ),
    ranked_categories AS (
        SELECT 
            date,
            category,
            SUM(template_use_count) as category_count,
            ROW_NUMBER() OVER (PARTITION BY date ORDER BY SUM(template_use_count) DESC) as rn
        FROM daily_stats
        GROUP BY date, category
    )
    SELECT 
        ds.date,
        ds.total_templates_used,
        ds.total_sessions,
        ds.average_rating,
        rt.template_name as most_used_template,
        rc.category as most_used_category
    FROM daily_stats ds
    LEFT JOIN ranked_templates rt ON ds.date = rt.date AND rt.rn = 1
    LEFT JOIN ranked_categories rc ON ds.date = rc.date AND rc.rn = 1
    GROUP BY 
        ds.date,
        ds.total_templates_used,
        ds.total_sessions,
        ds.average_rating,
        rt.template_name,
        rc.category
    ORDER BY ds.date;
END;
$$; 