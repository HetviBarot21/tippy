-- Tip Distributions Table
-- This table tracks how restaurant-wide tips are distributed among different groups

CREATE TABLE tip_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure each tip can only have one distribution per group
    UNIQUE(tip_id, group_name)
);

-- Create index for performance
CREATE INDEX idx_tip_distributions_tip_id ON tip_distributions(tip_id);
CREATE INDEX idx_tip_distributions_restaurant_id ON tip_distributions(restaurant_id);
CREATE INDEX idx_tip_distributions_group_name ON tip_distributions(restaurant_id, group_name);

-- Enable Row Level Security
ALTER TABLE tip_distributions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tip distributions
CREATE POLICY "Restaurant admins can view their tip distributions" ON tip_distributions
    FOR SELECT USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "System can manage tip distributions" ON tip_distributions
    FOR ALL USING (true);

-- Create audit trigger for tip distributions
CREATE TRIGGER audit_tip_distributions AFTER INSERT OR UPDATE OR DELETE ON tip_distributions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();