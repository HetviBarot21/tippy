-- Add distribution_group_id to tip_distributions table
-- This links each tip distribution to the actual distribution group

ALTER TABLE tip_distributions 
ADD COLUMN IF NOT EXISTS distribution_group_id UUID REFERENCES distribution_groups(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tip_distributions_group_id ON tip_distributions(distribution_group_id);

COMMENT ON COLUMN tip_distributions.distribution_group_id IS 'The distribution group this tip distribution belongs to';
