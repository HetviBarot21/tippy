-- Seed data for QR Tipping System
-- This file contains initial data for testing and development

-- Insert test restaurant
INSERT INTO restaurants (id, name, slug, email, phone_number, address, commission_rate) VALUES
(
    '550e8400-e29b-41d4-a716-446655440000',
    'Mama Njeri Restaurant',
    'mama-njeri',
    'admin@mamanjeri.co.ke',
    '+254712345678',
    'Kimathi Street, Nairobi, Kenya',
    10.00
);

-- Insert default distribution groups for the test restaurant
INSERT INTO distribution_groups (restaurant_id, group_name, percentage) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Cleaners', 10.00),
('550e8400-e29b-41d4-a716-446655440000', 'Waiters', 30.00),
('550e8400-e29b-41d4-a716-446655440000', 'Admin', 40.00),
('550e8400-e29b-41d4-a716-446655440000', 'Owners', 20.00);

-- Insert test waiters
INSERT INTO waiters (restaurant_id, name, phone_number, email) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'John Kamau', '+254701234567', 'john@mamanjeri.co.ke'),
('550e8400-e29b-41d4-a716-446655440000', 'Mary Wanjiku', '+254702345678', 'mary@mamanjeri.co.ke'),
('550e8400-e29b-41d4-a716-446655440000', 'Peter Otieno', '+254703456789', 'peter@mamanjeri.co.ke'),
('550e8400-e29b-41d4-a716-446655440000', 'Grace Akinyi', '+254704567890', 'grace@mamanjeri.co.ke');

-- Insert test QR codes for tables
INSERT INTO qr_codes (restaurant_id, table_number, table_name, qr_data) VALUES
('550e8400-e29b-41d4-a716-446655440000', '1', 'Table 1 - Window Side', 'https://tippy.yourapps.co.ke/tip/mama-njeri/table-1'),
('550e8400-e29b-41d4-a716-446655440000', '2', 'Table 2 - Center', 'https://tippy.yourapps.co.ke/tip/mama-njeri/table-2'),
('550e8400-e29b-41d4-a716-446655440000', '3', 'Table 3 - Corner', 'https://tippy.yourapps.co.ke/tip/mama-njeri/table-3'),
('550e8400-e29b-41d4-a716-446655440000', '4', 'Table 4 - Patio', 'https://tippy.yourapps.co.ke/tip/mama-njeri/table-4'),
('550e8400-e29b-41d4-a716-446655440000', '5', 'Table 5 - VIP', 'https://tippy.yourapps.co.ke/tip/mama-njeri/table-5');

-- Insert sample tips for testing (these would normally be created through the app)
INSERT INTO tips (restaurant_id, waiter_id, table_id, amount, commission_amount, net_amount, tip_type, payment_method, payment_status, transaction_id, customer_phone) VALUES
(
    '550e8400-e29b-41d4-a716-446655440000',
    (SELECT id FROM waiters WHERE name = 'John Kamau' LIMIT 1),
    (SELECT id FROM qr_codes WHERE table_number = '1' LIMIT 1),
    100.00,
    10.00,
    90.00,
    'waiter',
    'mpesa',
    'completed',
    'MPESA123456789',
    '+254711111111'
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    NULL,
    (SELECT id FROM qr_codes WHERE table_number = '2' LIMIT 1),
    200.00,
    20.00,
    180.00,
    'restaurant',
    'card',
    'completed',
    'CARD987654321',
    '+254722222222'
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    (SELECT id FROM waiters WHERE name = 'Mary Wanjiku' LIMIT 1),
    (SELECT id FROM qr_codes WHERE table_number = '3' LIMIT 1),
    50.00,
    5.00,
    45.00,
    'waiter',
    'mpesa',
    'completed',
    'MPESA111222333',
    '+254733333333'
);

-- Note: Restaurant admin users will be created through the authentication system
-- This is just a comment showing how they would be linked:
-- INSERT INTO restaurant_admins (restaurant_id, user_id, role) VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'auth_user_id_here', 'admin');