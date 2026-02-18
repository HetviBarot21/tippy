-- Add payout schedule settings to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS payout_schedule_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payout_schedule_day INTEGER DEFAULT 28 CHECK (payout_schedule_day >= 1 AND payout_schedule_day <= 28),
ADD COLUMN IF NOT EXISTS payout_notification_days INTEGER DEFAULT 3 CHECK (payout_notification_days >= 0 AND payout_notification_days <= 7);

COMMENT ON COLUMN restaurants.payout_schedule_enabled IS 'Whether automated monthly payouts are enabled';
COMMENT ON COLUMN restaurants.payout_schedule_day IS 'Day of month to process payouts (1-28)';
COMMENT ON COLUMN restaurants.payout_notification_days IS 'Days before payout to send notification (0-7)';
