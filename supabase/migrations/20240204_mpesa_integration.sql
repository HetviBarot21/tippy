-- M-Pesa Integration Tables
-- This migration adds tables and functions needed for M-Pesa payment processing

-- M-Pesa Requests Table - tracks STK Push requests
CREATE TABLE mpesa_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_id UUID NOT NULL REFERENCES tips(id) ON DELETE CASCADE,
    checkout_request_id VARCHAR(255) NOT NULL UNIQUE,
    merchant_request_id VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    mpesa_receipt_number VARCHAR(255),
    transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- M-Pesa Callbacks Table - stores raw callback data for debugging
CREATE TABLE mpesa_callbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkout_request_id VARCHAR(255),
    merchant_request_id VARCHAR(255),
    result_code INTEGER,
    result_desc TEXT,
    callback_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mpesa_requests_tip_id ON mpesa_requests(tip_id);
CREATE INDEX idx_mpesa_requests_checkout_id ON mpesa_requests(checkout_request_id);
CREATE INDEX idx_mpesa_requests_status ON mpesa_requests(status);
CREATE INDEX idx_mpesa_callbacks_checkout_id ON mpesa_callbacks(checkout_request_id);
CREATE INDEX idx_mpesa_callbacks_processed ON mpesa_callbacks(processed);

-- Enable RLS
ALTER TABLE mpesa_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_callbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for M-Pesa requests
CREATE POLICY "Restaurant admins can view their mpesa requests" ON mpesa_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tips 
            WHERE tips.id = mpesa_requests.tip_id 
            AND tips.restaurant_id = get_user_restaurant_id()
        )
    );

CREATE POLICY "System can manage mpesa requests" ON mpesa_requests
    FOR ALL USING (true);

-- RLS Policies for M-Pesa callbacks (system only)
CREATE POLICY "System can manage mpesa callbacks" ON mpesa_callbacks
    FOR ALL USING (true);

-- Add updated_at trigger for mpesa_requests
CREATE TRIGGER update_mpesa_requests_updated_at BEFORE UPDATE ON mpesa_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to process M-Pesa callback and update tip status
CREATE OR REPLACE FUNCTION process_mpesa_callback(
    p_checkout_request_id VARCHAR(255),
    p_merchant_request_id VARCHAR(255),
    p_result_code INTEGER,
    p_result_desc TEXT,
    p_callback_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tip_id UUID;
    v_mpesa_receipt VARCHAR(255);
    v_transaction_date TIMESTAMP WITH TIME ZONE;
    v_amount DECIMAL(10,2);
    v_restaurant_id UUID;
BEGIN
    -- Insert callback data for audit trail
    INSERT INTO mpesa_callbacks (
        checkout_request_id,
        merchant_request_id,
        result_code,
        result_desc,
        callback_data,
        processed
    ) VALUES (
        p_checkout_request_id,
        p_merchant_request_id,
        p_result_code,
        p_result_desc,
        p_callback_data,
        false
    );

    -- Find the corresponding M-Pesa request and tip details
    SELECT mr.tip_id, mr.amount, t.restaurant_id 
    INTO v_tip_id, v_amount, v_restaurant_id
    FROM mpesa_requests mr
    JOIN tips t ON t.id = mr.tip_id
    WHERE mr.checkout_request_id = p_checkout_request_id;

    IF v_tip_id IS NULL THEN
        RAISE NOTICE 'No M-Pesa request found for checkout_request_id: %', p_checkout_request_id;
        RETURN false;
    END IF;

    -- Process based on result code
    IF p_result_code = 0 THEN
        -- Success - extract transaction details from callback data
        SELECT 
            (item->>'Value')::VARCHAR(255),
            TO_TIMESTAMP((callback_item->>'Value')::BIGINT)
        INTO 
            v_mpesa_receipt,
            v_transaction_date
        FROM jsonb_array_elements(p_callback_data->'CallbackMetadata'->'Item') AS item,
             jsonb_array_elements(p_callback_data->'CallbackMetadata'->'Item') AS callback_item
        WHERE item->>'Name' = 'MpesaReceiptNumber'
        AND callback_item->>'Name' = 'TransactionDate';

        -- Update M-Pesa request
        UPDATE mpesa_requests SET
            status = 'completed',
            mpesa_receipt_number = v_mpesa_receipt,
            transaction_date = v_transaction_date,
            updated_at = NOW()
        WHERE checkout_request_id = p_checkout_request_id;

        -- Update tip status with proper tenant context
        UPDATE tips SET
            payment_status = 'completed',
            transaction_id = v_mpesa_receipt,
            updated_at = NOW()
        WHERE id = v_tip_id
        AND restaurant_id = v_restaurant_id; -- Ensure tenant isolation

        RAISE NOTICE 'Payment completed for tip: %, transaction: %', v_tip_id, v_mpesa_receipt;

    ELSE
        -- Failed payment
        UPDATE mpesa_requests SET
            status = 'failed',
            updated_at = NOW()
        WHERE checkout_request_id = p_checkout_request_id;

        -- Update tip status with proper tenant context
        UPDATE tips SET
            payment_status = 'failed',
            updated_at = NOW()
        WHERE id = v_tip_id
        AND restaurant_id = v_restaurant_id; -- Ensure tenant isolation

        RAISE NOTICE 'Payment failed for tip: %, reason: %', v_tip_id, p_result_desc;
    END IF;

    -- Mark callback as processed
    UPDATE mpesa_callbacks SET
        processed = true
    WHERE checkout_request_id = p_checkout_request_id
    AND merchant_request_id = p_merchant_request_id;

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error processing M-Pesa callback: %', SQLERRM;
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate commission and net amounts for tips
CREATE OR REPLACE FUNCTION calculate_tip_amounts(
    p_amount DECIMAL(10,2),
    p_restaurant_id UUID
)
RETURNS TABLE(
    commission_amount DECIMAL(10,2),
    net_amount DECIMAL(10,2)
) AS $$
DECLARE
    v_commission_rate DECIMAL(5,2);
BEGIN
    -- Get commission rate for restaurant
    SELECT commission_rate INTO v_commission_rate
    FROM restaurants
    WHERE id = p_restaurant_id;

    -- Default to 10% if not found
    IF v_commission_rate IS NULL THEN
        v_commission_rate := 10.00;
    END IF;

    -- Calculate amounts
    commission_amount := ROUND(p_amount * v_commission_rate / 100, 2);
    net_amount := p_amount - commission_amount;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;