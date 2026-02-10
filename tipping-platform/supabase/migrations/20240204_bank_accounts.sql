-- Create bank_accounts table for storing restaurant distribution group bank account details
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  group_name VARCHAR(100) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  branch_code VARCHAR(20),
  swift_code VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique bank account per restaurant and group
  UNIQUE(restaurant_id, group_name),
  
  -- Ensure account details are valid
  CONSTRAINT valid_account_number CHECK (LENGTH(account_number) >= 8),
  CONSTRAINT valid_bank_code CHECK (LENGTH(bank_code) >= 3)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bank_accounts_restaurant_id ON bank_accounts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_group_name ON bank_accounts(restaurant_id, group_name);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(restaurant_id, is_active);

-- Enable Row Level Security
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bank_accounts
CREATE POLICY "Users can only access their restaurant bank accounts" ON bank_accounts
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id 
      FROM restaurant_admins 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create policy for service role (for API operations)
CREATE POLICY "Service role can access all bank accounts" ON bank_accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Add audit logging trigger
CREATE OR REPLACE FUNCTION audit_bank_accounts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_values, restaurant_id, user_id)
    VALUES ('bank_accounts', NEW.id, 'INSERT', to_jsonb(NEW), NEW.restaurant_id, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, restaurant_id, user_id)
    VALUES ('bank_accounts', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.restaurant_id, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, restaurant_id, user_id)
    VALUES ('bank_accounts', OLD.id, 'DELETE', to_jsonb(OLD), OLD.restaurant_id, auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_bank_accounts_trigger ON bank_accounts;
CREATE TRIGGER audit_bank_accounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION audit_bank_accounts();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_bank_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at_trigger ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at_trigger
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_bank_accounts_updated_at();

-- Insert some sample bank accounts for testing (optional)
-- These will be removed in production
INSERT INTO bank_accounts (restaurant_id, group_name, account_name, account_number, bank_name, bank_code, is_active)
SELECT 
  r.id,
  'Waiters',
  r.name || ' - Waiters Account',
  '1234567890',
  'Equity Bank',
  '068',
  true
FROM restaurants r
WHERE r.slug = 'demo-restaurant'
ON CONFLICT (restaurant_id, group_name) DO NOTHING;

INSERT INTO bank_accounts (restaurant_id, group_name, account_name, account_number, bank_name, bank_code, is_active)
SELECT 
  r.id,
  'Kitchen',
  r.name || ' - Kitchen Account',
  '0987654321',
  'KCB Bank',
  '001',
  true
FROM restaurants r
WHERE r.slug = 'demo-restaurant'
ON CONFLICT (restaurant_id, group_name) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE bank_accounts IS 'Bank account details for restaurant distribution group payouts';
COMMENT ON COLUMN bank_accounts.restaurant_id IS 'Reference to the restaurant that owns this bank account';
COMMENT ON COLUMN bank_accounts.group_name IS 'Name of the distribution group (e.g., Waiters, Kitchen, Cleaners)';
COMMENT ON COLUMN bank_accounts.account_name IS 'Name on the bank account';
COMMENT ON COLUMN bank_accounts.account_number IS 'Bank account number';
COMMENT ON COLUMN bank_accounts.bank_name IS 'Name of the bank';
COMMENT ON COLUMN bank_accounts.bank_code IS 'Bank code for transfers';
COMMENT ON COLUMN bank_accounts.branch_code IS 'Bank branch code (optional)';
COMMENT ON COLUMN bank_accounts.swift_code IS 'SWIFT code for international transfers (optional)';
COMMENT ON COLUMN bank_accounts.is_active IS 'Whether this bank account is active for payouts';