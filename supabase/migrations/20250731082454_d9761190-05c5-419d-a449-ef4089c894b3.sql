-- Create admin notifications table
CREATE TABLE public.admin_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    client_id UUID,
    client_name TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    is_rush BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification rules table
CREATE TABLE public.notification_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    rule_type TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '{}',
    priority INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, rule_type)
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for admin notifications
CREATE POLICY "Users can manage their own notifications"
ON public.admin_notifications
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for notification rules
CREATE POLICY "Users can manage their own notification rules"
ON public.notification_rules
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_admin_notifications_user_id ON public.admin_notifications(user_id);
CREATE INDEX idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at);
CREATE INDEX idx_notification_rules_user_id ON public.notification_rules(user_id);

-- Create updated_at triggers
CREATE TRIGGER update_admin_notifications_updated_at
    BEFORE UPDATE ON public.admin_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
    BEFORE UPDATE ON public.notification_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();