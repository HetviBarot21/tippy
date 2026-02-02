-- Multi-tenant QR Tipping System Database Schema
-- This migration creates the complete multi-tenant database structure with RLS policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE tip_type AS ENUM ('waiter', 'restaurant');
CREATE TYPE payment_method AS ENUM ('mpesa', 'card');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE payout_type AS ENUM ('waiter', 'group');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Restaurants (Tenants) Table
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Distribution Groups Configuration
CREATE TABLE distribution_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id, group_name)
);

-- Waiters Table
CREATE TABLE waiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- QR Codes for Tables
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    qr_data TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

-- Tips Transactions Table
CREATE TABLE tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    waiter_id UUID REFERENCES waiters(id) ON DELETE SET NULL,
    table_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    commission_amount DECIMAL(10,2) NOT NULL CHECK (commission_amount >= 0),
    net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount >= 0),
    tip_type tip_type NOT NULL,
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    transaction_id VARCHAR(255),
    customer_phone VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Payouts Table
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    waiter_id UUID REFERENCES waiters(id) ON DELETE SET NULL,
    payout_type payout_type NOT NULL,
    group_name VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payout_month DATE NOT NULL,
    status payout_status DEFAULT 'pending',
    transaction_reference VARCHAR(255),
    recipient_phone VARCHAR(20),
    recipient_account VARCHAR(100),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurant Admin Users Table (for authentication)
CREATE TABLE restaurant_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(restaurant_id, user_id)
);

-- Audit Log Table for tracking changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_waiters_restaurant_id ON waiters(restaurant_id);
CREATE INDEX idx_waiters_active ON waiters(restaurant_id, is_active);
CREATE INDEX idx_tips_restaurant_id ON tips(restaurant_id);
CREATE INDEX idx_tips_waiter_id ON tips(waiter_id);
CREATE INDEX idx_tips_created_at ON tips(created_at);
CREATE INDEX idx_tips_payment_status ON tips(payment_status);
CREATE INDEX idx_qr_codes_restaurant_id ON qr_codes(restaurant_id);
CREATE INDEX idx_payouts_restaurant_id ON payouts(restaurant_id);
CREATE INDEX idx_payouts_month ON payouts(payout_month);
CREATE INDEX idx_distribution_groups_restaurant_id ON distribution_groups(restaurant_id);
CREATE INDEX idx_restaurant_admins_restaurant_id ON restaurant_admins(restaurant_id);
CREATE INDEX idx_restaurant_admins_user_id ON restaurant_admins(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's restaurant ID
CREATE OR REPLACE FUNCTION get_user_restaurant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT restaurant_id 
        FROM restaurant_admins 
        WHERE user_id = auth.uid() 
        AND is_active = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is restaurant admin
CREATE OR REPLACE FUNCTION is_restaurant_admin(restaurant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM restaurant_admins 
        WHERE user_id = auth.uid() 
        AND restaurant_id = restaurant_uuid 
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for Restaurants table
CREATE POLICY "Restaurant admins can view their restaurant" ON restaurants
    FOR SELECT USING (id = get_user_restaurant_id());

CREATE POLICY "Restaurant admins can update their restaurant" ON restaurants
    FOR UPDATE USING (id = get_user_restaurant_id());

-- RLS Policies for Waiters table
CREATE POLICY "Restaurant admins can manage their waiters" ON waiters
    FOR ALL USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Public can view active waiters for tipping" ON waiters
    FOR SELECT USING (is_active = true);

-- RLS Policies for Tips table
CREATE POLICY "Restaurant admins can view their tips" ON tips
    FOR SELECT USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Anyone can create tips" ON tips
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update tip status" ON tips
    FOR UPDATE USING (true);

-- RLS Policies for QR Codes table
CREATE POLICY "Restaurant admins can manage their QR codes" ON qr_codes
    FOR ALL USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Public can view active QR codes" ON qr_codes
    FOR SELECT USING (is_active = true);

-- RLS Policies for Payouts table
CREATE POLICY "Restaurant admins can view their payouts" ON payouts
    FOR SELECT USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "System can manage payouts" ON payouts
    FOR ALL USING (true);

-- RLS Policies for Distribution Groups table
CREATE POLICY "Restaurant admins can manage their distribution groups" ON distribution_groups
    FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- RLS Policies for Restaurant Admins table
CREATE POLICY "Users can view their admin records" ON restaurant_admins
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Restaurant admins can manage other admins" ON restaurant_admins
    FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- RLS Policies for Audit Logs table
CREATE POLICY "Restaurant admins can view their audit logs" ON audit_logs
    FOR SELECT USING (restaurant_id = get_user_restaurant_id());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waiters_updated_at BEFORE UPDATE ON waiters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tips_updated_at BEFORE UPDATE ON tips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON qr_codes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distribution_groups_updated_at BEFORE UPDATE ON distribution_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurant_admins_updated_at BEFORE UPDATE ON restaurant_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit log entries
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

-- Create audit triggers for key tables
CREATE TRIGGER audit_restaurants AFTER INSERT OR UPDATE OR DELETE ON restaurants
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_waiters AFTER INSERT OR UPDATE OR DELETE ON waiters
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_tips AFTER INSERT OR UPDATE OR DELETE ON tips
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_payouts AFTER INSERT OR UPDATE OR DELETE ON payouts
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();