-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('session', 'template', 'feedback', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (p_user_id, p_type, p_title, p_message)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for session notifications
CREATE OR REPLACE FUNCTION notify_session_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify mentor
  PERFORM create_notification(
    NEW.mentor_id,
    'session',
    'New Session Scheduled',
    'A new session has been scheduled for ' || NEW.date::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_created
  AFTER INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_session_created();

-- Create trigger for template notifications
CREATE OR REPLACE FUNCTION notify_template_shared()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify recipient
  PERFORM create_notification(
    NEW.shared_with,
    'template',
    'Template Shared',
    'A template has been shared with you'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_template_shared
  AFTER INSERT ON shared_templates
  FOR EACH ROW
  EXECUTE FUNCTION notify_template_shared();

-- Create trigger for feedback notifications
CREATE OR REPLACE FUNCTION notify_feedback_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify mentor
  PERFORM create_notification(
    NEW.mentor_id,
    'feedback',
    'New Feedback Received',
    'You have received new feedback for your session'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_feedback_received
  AFTER INSERT ON session_feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_feedback_received(); 