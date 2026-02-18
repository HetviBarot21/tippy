# Bank Transfer Service

This service handles bank transfers for restaurant group payouts using various payment providers.

## Supported Providers

### 1. Pesawise (Recommended for Kenya)
Pesawise provides reliable bank transfer services across Kenya.

**Configuration:**
```env
BANK_TRANSFER_PROVIDER=pesawise
PESAWISE_API_KEY=your_api_key
PESAWISE_API_SECRET=your_api_secret
PESAWISE_BASE_URL=https://api.pesawise.com/v1
PESAWISE_CALLBACK_URL=https://yourdomain.com/api/webhooks/bank-transfer
```

**Features:**
- Real-time bank account validation
- Support for all major Kenyan banks
- Automatic status updates via webhooks
- Transaction tracking and reconciliation

### 2. Flutterwave
Alternative provider with broader African coverage.

**Configuration:**
```env
BANK_TRANSFER_PROVIDER=flutterwave
FLUTTERWAVE_SECRET_KEY=your_secret_key
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
```

### 3. Mock Provider (Testing)
For development and testing purposes.

**Configuration:**
```env
BANK_TRANSFER_PROVIDER=mock
```

## Usage

### Process Bank Transfers
```typescript
import { processBankTransfers } from '@/utils/bank-transfers/service';

const result = await processBankTransfers(['payout-id-1', 'payout-id-2']);
console.log(`Processed: ${result.processed_count}, Failed: ${result.failed_count}`);
```

### Validate Bank Account
```typescript
import { validateBankAccount } from '@/utils/bank-transfers/service';

const result = await validateBankAccount({
  account_number: '1234567890',
  account_name: 'John Doe',
  bank_code: '01',
  bank_name: 'KCB Bank'
});

if (result.valid) {
  console.log(`Account verified: ${result.account_name}`);
}
```

### Get Supported Banks
```typescript
import { getSupportedBanks } from '@/utils/bank-transfers/service';

const result = await getSupportedBanks();
if (result.success) {
  result.banks?.forEach(bank => {
    console.log(`${bank.code}: ${bank.name}`);
  });
}
```

## API Endpoints

### Calculate and Process Payouts
```
POST /api/payouts/calculate
Body: {
  restaurant_id: string,
  month: string (YYYY-MM),
  generate: boolean (optional)
}
```

### Process Bank Transfers
```
POST /api/bank-transfers/process
Body: {
  payout_ids: string[]
}
```

### Validate Bank Account
```
POST /api/bank-transfers/validate
Body: {
  account_number: string,
  bank_code: string
}
```

## Webhook Handling

Bank transfer status updates are received via webhooks at:
```
POST /api/webhooks/bank-transfer
```

The webhook handler updates payout records automatically based on transfer status.

## Testing

Use the test API keys provided:
- API Key: `app_6vQ50aNKkB`
- API Secret: `udWnRUgd4k`

These keys work in the Pesawise sandbox environment for testing transfers without real money.

## Error Handling

The service includes comprehensive error handling:
- Failed transfers are marked with status 'failed'
- Error messages are stored in `transaction_reference` field
- Payouts can be retried using the retry endpoint
- All errors are logged for debugging

## Security

- API credentials are stored in environment variables
- Authentication tokens are cached and auto-refreshed
- All API calls use HTTPS
- Sensitive data is never logged
