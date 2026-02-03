-- Add metadata column to tips table for storing M-Pesa transaction details
-- This migration adds support for storing additional payment-specific metadata

-- Add metadata column to tips table
ALTER TABLE tips ADD COLUMN metadata JSONB DEFAULT '{}';

-- Add index for metadata queries
CREATE INDEX idx_tips_metadata ON tips USING GIN (metadata);

-- Add timeout status to payment_status enum
ALTER TYPE payment_status ADD VALUE 'timeout';

-- Update the tips table comment
COMMENT ON COLUMN tips.metadata IS 'JSON metadata for payment-specific information (M-Pesa receipts, transaction details, etc.)';

-- Example metadata structure for M-Pesa:
-- {
--   "mpesaReceiptNumber": "OEI2AK4Q16",
--   "transactionDate": "20240203143022",
--   "checkoutRequestId": "ws_CO_191220191020363925",
--   "merchantRequestId": "92986-34418-1",
--   "stkPushInitiated": "2024-02-03T14:30:22.000Z",
--   "resultCode": 0,
--   "resultDesc": "The service request is processed successfully."
-- }