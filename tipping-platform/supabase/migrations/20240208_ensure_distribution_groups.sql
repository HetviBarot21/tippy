-- Ensure distribution_groups table exists with all necessary columns
CREATE TABLE IF NOT EXISTS distribution_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure each restaurant can only have one group with a specific name
    UNIQUE(restaurant_id, group_name)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_distribution_groups_restaurant_id ON distribution_groups(restaurant_id);

-- Enable Row Level Security
ALTER TABLE distribution_groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Restaurant admins can manage their distribution groups" ON distribution_groups;
DROP POLICY IF EXISTS "System can manage distribution groups" ON distribution_groups;

-- Create RLS policies
CREATE POLICY "Restaurant admins can manage their distribution groups" ON distribution_groups
    FOR ALL USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "System can manage distribution groups" ON distribution_groups
    FOR ALL USING (true);

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_distribution_groups_updated_at ON distribution_groups;
CREATE TRIGGER update_distribution_groups_updated_at
    BEFORE UPDATE ON distribution_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create audit trigger if the function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_audit_log') THEN
        DROP TRIGGER IF EXISTS audit_distribution_groups ON distribution_groups;
        CREATE TRIGGER audit_distribution_groups 
            AFTER INSERT OR UPDATE OR DELETE ON distribution_groups
            FOR EACH ROW 
            EXECUTE FUNCTION create_audit_log();
    END IF;
END $$;
