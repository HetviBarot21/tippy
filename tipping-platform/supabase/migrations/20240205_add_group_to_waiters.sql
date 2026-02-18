-- Add distribution_group_id to waiters table
-- This links each waiter/staff member to a distribution group

ALTER TABLE waiters 
ADD COLUMN distribution_group_id UUID REFERENCES distribution_groups(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_waiters_distribution_group ON waiters(distribution_group_id);

-- Update existing waiters to have no group (they can be assigned later)
-- No action needed as the column defaults to NULL

COMMENT ON COLUMN waiters.distribution_group_id IS 'The distribution group this staff member belongs to for tip sharing';
