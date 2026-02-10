-- Enhanced Multi-Tenant Security and Configuration
-- This migration adds enhanced security functions and policies for tenant isolation

-- Enable Row Level Security on all tables (if not already enabled)
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create function to set configuration (for tenant context)
CREATE OR REPLACE FUNCTION set_config(setting_name text, setting_value text, is_local boolean DEFAULT false)
RETURNS text AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, is_local);
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current tenant from configuration
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_tenant', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies that use tenant context

-- Update existing policies to use tenant context where appropriate
DROP POLICY IF EXISTS "Restaurant admins can view their restaurant" ON restaurants;
CREATE POLICY "Restaurant admins can view their restaurant" ON restaurants
    FOR SELECT USING (
      id = get_user_restaurant_id() OR 
      id = get_current_tenant()
    );

DROP POLICY IF EXISTS "Restaurant admins can manage their waiters" ON waiters;
CREATE POLICY "Restaurant admins can manage their waiters" ON waiters
    FOR ALL USING (
      restaurant_id = get_user_restaurant_id() OR 
      restaurant_id = get_current_tenant()
    );

DROP POLICY IF EXISTS "Restaurant admins can view their tips" ON tips;
CREATE POLICY "Restaurant admins can view their tips" ON tips
    FOR SELECT USING (
      restaurant_id = get_user_restaurant_id() OR 
      restaurant_id = get_current_tenant()
    );

DROP POLICY IF EXISTS "Restaurant admins can manage their QR codes" ON qr_codes;
CREATE POLICY "Restaurant admins can manage their QR codes" ON qr_codes
    FOR ALL USING (
      restaurant_id = get_user_restaurant_id() OR 
      restaurant_id = get_current_tenant()
    );

DROP POLICY IF EXISTS "Restaurant admins can view their payouts" ON payouts;
CREATE POLICY "Restaurant admins can view their payouts" ON payouts
    FOR SELECT USING (
      restaurant_id = get_user_restaurant_id() OR 
      restaurant_id = get_current_tenant()
    );

DROP POLICY IF EXISTS "Restaurant admins can manage their distribution groups" ON distribution_groups;
CREATE POLICY "Restaurant admins can manage their distribution groups" ON distribution_groups
    FOR ALL USING (
      restaurant_id = get_user_restaurant_id() OR 
      restaurant_id = get_current_tenant()
    );

-- Enhanced audit logging policies
DROP POLICY IF EXISTS "Restaurant admins can view their audit logs" ON audit_logs;
CREATE POLICY "Restaurant admins can view their audit logs" ON audit_logs
    FOR SELECT USING (
      restaurant_id = get_user_restaurant_id() OR 
      restaurant_id = get_current_tenant()
    );

-- Create policy for system operations (service role)
CREATE POLICY "Service role can access all data" ON restaurants
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all waiters" ON waiters
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all tips" ON tips
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all qr_codes" ON qr_codes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all payouts" ON payouts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all distribution_groups" ON distribution_groups
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all restaurant_admins" ON restaurant_admins
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all audit_logs" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for better performance on tenant queries
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurant_admins_user_restaurant ON restaurant_admins(user_id, restaurant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant_action ON audit_logs(restaurant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create function to validate tenant access
CREATE OR REPLACE FUNCTION validate_tenant_access(user_uuid uuid, restaurant_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM restaurant_admins 
    WHERE user_id = user_uuid 
    AND restaurant_id = restaurant_uuid 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id uuid,
  p_restaurant_id uuid,
  p_action text,
  p_resource text,
  p_success boolean,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    restaurant_id,
    table_name,
    action,
    record_id,
    new_values
  ) VALUES (
    p_user_id,
    p_restaurant_id,
    'security_events',
    p_action,
    p_resource || '_' || extract(epoch from now()),
    jsonb_build_object(
      'resource', p_resource,
      'success', p_success,
      'timestamp', now(),
      'details', p_details
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_config(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_tenant_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(uuid, uuid, text, text, boolean, jsonb) TO authenticated;