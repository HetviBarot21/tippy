-- Fix the audit log function to handle tables without restaurant_id
DROP FUNCTION IF EXISTS create_audit_log() CASCADE;

CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    restaurant_id_val UUID;
BEGIN
    -- Extract restaurant_id based on table structure
    IF TG_TABLE_NAME = 'restaurants' THEN
        restaurant_id_val := COALESCE(NEW.id, OLD.id);
    ELSE
        restaurant_id_val := COALESCE(NEW.restaurant_id, OLD.restaurant_id);
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (restaurant_id, user_id, table_name, record_id, action, old_values)
        VALUES (
            restaurant_id_val,
            auth.uid(),
            TG_TABLE_NAME,
            OLD.id,
            TG_OP,
            row_to_json(OLD)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (restaurant_id, user_id, table_name, record_id, action, old_values, new_values)
        VALUES (
            restaurant_id_val,
            auth.uid(),
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (restaurant_id, user_id, table_name, record_id, action, new_values)
        VALUES (
            restaurant_id_val,
            auth.uid(),
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            row_to_json(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the audit triggers
CREATE TRIGGER audit_restaurants AFTER INSERT OR UPDATE OR DELETE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_waiters AFTER INSERT OR UPDATE OR DELETE ON waiters
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_tips AFTER INSERT OR UPDATE OR DELETE ON tips
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_payouts AFTER INSERT OR UPDATE OR DELETE ON payouts
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();