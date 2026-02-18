-- Fix audit function to handle restaurant deletions gracefully
-- The issue is that when deleting a restaurant, the audit trigger tries to insert
-- into audit_logs with a restaurant_id that's being deleted

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

    -- Skip audit logging if restaurant_id is null or doesn't exist
    -- This prevents foreign key constraint violations during cascading deletes
    IF restaurant_id_val IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Check if restaurant exists (skip audit if it doesn't)
    IF TG_TABLE_NAME != 'restaurants' THEN
        IF NOT EXISTS (SELECT 1 FROM restaurants WHERE id = restaurant_id_val) THEN
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
        END IF;
    END IF;

    -- Proceed with audit logging
    BEGIN
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
    EXCEPTION
        WHEN foreign_key_violation THEN
            -- Silently skip audit logging if foreign key constraint fails
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            ELSE
                RETURN NEW;
            END IF;
    END;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the audit triggers
DROP TRIGGER IF EXISTS audit_restaurants ON restaurants;
DROP TRIGGER IF EXISTS audit_waiters ON waiters;
DROP TRIGGER IF EXISTS audit_tips ON tips;
DROP TRIGGER IF EXISTS audit_payouts ON payouts;

CREATE TRIGGER audit_restaurants AFTER INSERT OR UPDATE OR DELETE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_waiters AFTER INSERT OR UPDATE OR DELETE ON waiters
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_tips AFTER INSERT OR UPDATE OR DELETE ON tips
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_payouts AFTER INSERT OR UPDATE OR DELETE ON payouts
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();
