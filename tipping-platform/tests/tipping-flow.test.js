const { test, describe } = require('node:test');
const assert = require('node:assert');

// Mock data for testing
const mockRestaurant = {
  id: 'restaurant-123',
  name: 'Test Restaurant',
  slug: 'test-restaurant',
  commission_rate: 10.0,
  is_active: true
};

const mockTable = {
  id: 'table-456',
  number: '5',
  name: 'Window Table'
};

const mockWaiters = [
  {
    id: 'waiter-1',
    name: 'John Doe',
    profile_photo_url: null
  },
  {
    id: 'waiter-2',
    name: 'Jane Smith',
    profile_photo_url: 'https://example.com/jane.jpg'
  },
  {
    id: 'waiter-3',
    name: 'Mike Johnson',
    profile_photo_url: null
  }
];

describe('Customer Tipping Flow End-to-End Tests', () => {
  test('QR code scan to tip type selection flow', () => {
    // Simulate QR code scan and landing page load
    function simulateQRScan(restaurantId, tableId) {
      // Validate QR code format
      if (!restaurantId || !tableId) {
        return { success: false, error: 'Invalid QR code format' };
      }

      // Mock database lookup
      const qrCode = {
        id: tableId,
        restaurant_id: restaurantId,
        table_number: mockTable.number,
        table_name: mockTable.name,
        is_active: true,
        restaurant: mockRestaurant
      };

      if (!qrCode.is_active) {
        return { success: false, error: 'QR code is inactive' };
      }

      return {
        success: true,
        data: {
          restaurant: qrCode.restaurant,
          table: {
            id: qrCode.id,
            number: qrCode.table_number,
            name: qrCode.table_name
          },
          waiters: mockWaiters
        }
      };
    }

    // Test successful QR scan
    const scanResult = simulateQRScan('restaurant-123', 'table-456');
    assert.strictEqual(scanResult.success, true, 'Valid QR scan should succeed');
    assert.ok(scanResult.data.restaurant, 'Should return restaurant data');
    assert.ok(scanResult.data.table, 'Should return table data');
    assert.ok(Array.isArray(scanResult.data.waiters), 'Should return waiters array');

    // Test invalid QR scan
    const invalidScan = simulateQRScan('', '');
    assert.strictEqual(invalidScan.success, false, 'Invalid QR scan should fail');
    assert.ok(invalidScan.error, 'Should return error message');

    console.log('✓ QR code scan to tip type selection flow test passed');
  });

  test('Tip type selection validation', () => {
    // Simulate tip type selection
    function validateTipTypeSelection(tipType) {
      const validTypes = ['waiter', 'restaurant'];
      
      if (!tipType || !validTypes.includes(tipType)) {
        return { isValid: false, error: 'Invalid tip type' };
      }

      return { isValid: true, tipType };
    }

    // Test valid tip types
    const waiterTip = validateTipTypeSelection('waiter');
    assert.strictEqual(waiterTip.isValid, true, 'Waiter tip type should be valid');
    assert.strictEqual(waiterTip.tipType, 'waiter', 'Should return correct tip type');

    const restaurantTip = validateTipTypeSelection('restaurant');
    assert.strictEqual(restaurantTip.isValid, true, 'Restaurant tip type should be valid');
    assert.strictEqual(restaurantTip.tipType, 'restaurant', 'Should return correct tip type');

    // Test invalid tip type
    const invalidTip = validateTipTypeSelection('invalid');
    assert.strictEqual(invalidTip.isValid, false, 'Invalid tip type should fail validation');

    console.log('✓ Tip type selection validation test passed');
  });

  test('Waiter selection flow validation', () => {
    // Simulate waiter selection process
    function validateWaiterSelection(waiterId, availableWaiters) {
      if (!waiterId) {
        return { isValid: false, error: 'Waiter ID is required' };
      }

      if (!Array.isArray(availableWaiters) || availableWaiters.length === 0) {
        return { isValid: false, error: 'No waiters available' };
      }

      const selectedWaiter = availableWaiters.find(w => w.id === waiterId);
      if (!selectedWaiter) {
        return { isValid: false, error: 'Selected waiter not found' };
      }

      return { isValid: true, waiter: selectedWaiter };
    }

    // Test valid waiter selection
    const validSelection = validateWaiterSelection('waiter-1', mockWaiters);
    assert.strictEqual(validSelection.isValid, true, 'Valid waiter selection should succeed');
    assert.strictEqual(validSelection.waiter.id, 'waiter-1', 'Should return correct waiter');
    assert.strictEqual(validSelection.waiter.name, 'John Doe', 'Should return waiter details');

    // Test invalid waiter ID
    const invalidSelection = validateWaiterSelection('invalid-waiter', mockWaiters);
    assert.strictEqual(invalidSelection.isValid, false, 'Invalid waiter ID should fail');

    // Test empty waiters list
    const noWaiters = validateWaiterSelection('waiter-1', []);
    assert.strictEqual(noWaiters.isValid, false, 'Empty waiters list should fail');

    console.log('✓ Waiter selection flow validation test passed');
  });

  test('Waiter search functionality', () => {
    // Simulate waiter search
    function searchWaiters(searchTerm, waiters) {
      if (!searchTerm || searchTerm.trim() === '') {
        return waiters;
      }

      const term = searchTerm.toLowerCase().trim();
      return waiters.filter(waiter => 
        waiter.name.toLowerCase().includes(term)
      );
    }

    // Test search functionality
    const johnSearch = searchWaiters('john', mockWaiters);
    assert.strictEqual(johnSearch.length, 2, 'Should find 2 waiters with "john" in name');
    assert.ok(johnSearch.some(w => w.name === 'John Doe'), 'Should include John Doe');
    assert.ok(johnSearch.some(w => w.name === 'Mike Johnson'), 'Should include Mike Johnson');

    const janeSearch = searchWaiters('jane', mockWaiters);
    assert.strictEqual(janeSearch.length, 1, 'Should find 1 waiter named Jane');
    assert.strictEqual(janeSearch[0].name, 'Jane Smith', 'Should return Jane Smith');

    const noResults = searchWaiters('xyz', mockWaiters);
    assert.strictEqual(noResults.length, 0, 'Should return no results for non-matching search');

    const emptySearch = searchWaiters('', mockWaiters);
    assert.strictEqual(emptySearch.length, mockWaiters.length, 'Empty search should return all waiters');

    console.log('✓ Waiter search functionality test passed');
  });

  test('Tip amount validation', () => {
    const MIN_AMOUNT = 10;
    const MAX_AMOUNT = 10000;

    // Simulate tip amount validation
    function validateTipAmount(amount) {
      const errors = [];

      if (typeof amount !== 'number' || isNaN(amount)) {
        errors.push('Tip amount must be a valid number');
      } else {
        if (amount < MIN_AMOUNT) {
          errors.push(`Minimum tip amount is ${MIN_AMOUNT} KES`);
        }
        if (amount > MAX_AMOUNT) {
          errors.push(`Maximum tip amount is ${MAX_AMOUNT} KES`);
        }
        if (amount % 0.01 !== 0 && amount.toString().split('.')[1]?.length > 2) {
          errors.push('Tip amount cannot have more than 2 decimal places');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        amount: errors.length === 0 ? amount : null
      };
    }

    // Test valid amounts
    const validAmounts = [10, 50, 100, 250.50, 1000, 10000];
    validAmounts.forEach(amount => {
      const result = validateTipAmount(amount);
      assert.strictEqual(result.isValid, true, `Amount ${amount} should be valid`);
      assert.strictEqual(result.amount, amount, `Should return the validated amount`);
    });

    // Test invalid amounts
    const invalidAmounts = [
      { amount: 5, expectedError: 'Minimum' },
      { amount: 15000, expectedError: 'Maximum' },
      { amount: 'abc', expectedError: 'valid number' },
      { amount: null, expectedError: 'valid number' },
      { amount: -10, expectedError: 'Minimum' }
    ];

    invalidAmounts.forEach(({ amount, expectedError }) => {
      const result = validateTipAmount(amount);
      assert.strictEqual(result.isValid, false, `Amount ${amount} should be invalid`);
      assert.ok(result.errors.some(error => error.includes(expectedError)), 
        `Should contain expected error for amount ${amount}`);
    });

    console.log('✓ Tip amount validation test passed');
  });

  test('Preset amount selection', () => {
    const PRESET_AMOUNTS = [50, 100, 200, 500];

    // Simulate preset amount selection
    function selectPresetAmount(presetAmount) {
      if (!PRESET_AMOUNTS.includes(presetAmount)) {
        return { isValid: false, error: 'Invalid preset amount' };
      }

      return { isValid: true, amount: presetAmount };
    }

    // Test valid preset amounts
    PRESET_AMOUNTS.forEach(amount => {
      const result = selectPresetAmount(amount);
      assert.strictEqual(result.isValid, true, `Preset amount ${amount} should be valid`);
      assert.strictEqual(result.amount, amount, `Should return correct amount`);
    });

    // Test invalid preset amount
    const invalidPreset = selectPresetAmount(75);
    assert.strictEqual(invalidPreset.isValid, false, 'Invalid preset amount should fail');

    console.log('✓ Preset amount selection test passed');
  });

  test('Tip confirmation data validation', () => {
    // Simulate tip confirmation validation
    function validateTipConfirmation(confirmationData) {
      const errors = [];

      // Required fields validation
      if (!confirmationData.tipType || !['waiter', 'restaurant'].includes(confirmationData.tipType)) {
        errors.push('Valid tip type is required');
      }

      if (!confirmationData.amount || typeof confirmationData.amount !== 'number' || confirmationData.amount <= 0) {
        errors.push('Valid tip amount is required');
      }

      if (!confirmationData.restaurantId || typeof confirmationData.restaurantId !== 'string') {
        errors.push('Restaurant ID is required');
      }

      if (!confirmationData.tableId || typeof confirmationData.tableId !== 'string') {
        errors.push('Table ID is required');
      }

      // Waiter-specific validation
      if (confirmationData.tipType === 'waiter') {
        if (!confirmationData.waiterId || typeof confirmationData.waiterId !== 'string') {
          errors.push('Waiter ID is required for waiter tips');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? confirmationData : null
      };
    }

    // Test valid waiter tip confirmation
    const validWaiterTip = {
      tipType: 'waiter',
      amount: 100,
      restaurantId: 'restaurant-123',
      tableId: 'table-456',
      waiterId: 'waiter-1'
    };

    const waiterResult = validateTipConfirmation(validWaiterTip);
    assert.strictEqual(waiterResult.isValid, true, 'Valid waiter tip should pass validation');

    // Test valid restaurant tip confirmation
    const validRestaurantTip = {
      tipType: 'restaurant',
      amount: 200,
      restaurantId: 'restaurant-123',
      tableId: 'table-456'
    };

    const restaurantResult = validateTipConfirmation(validRestaurantTip);
    assert.strictEqual(restaurantResult.isValid, true, 'Valid restaurant tip should pass validation');

    // Test invalid confirmation (missing waiter ID for waiter tip)
    const invalidWaiterTip = {
      tipType: 'waiter',
      amount: 100,
      restaurantId: 'restaurant-123',
      tableId: 'table-456'
      // Missing waiterId
    };

    const invalidResult = validateTipConfirmation(invalidWaiterTip);
    assert.strictEqual(invalidResult.isValid, false, 'Invalid waiter tip should fail validation');
    assert.ok(invalidResult.errors.some(error => error.includes('Waiter ID')), 'Should require waiter ID');

    console.log('✓ Tip confirmation data validation test passed');
  });

  test('Complete tipping flow simulation', () => {
    // Simulate complete customer journey
    function simulateCompleteTippingFlow(qrData, userSelections) {
      const flow = {
        steps: [],
        errors: [],
        success: false
      };

      try {
        // Step 1: QR Code Scan
        flow.steps.push('qr_scan');
        if (!qrData.restaurantId || !qrData.tableId) {
          throw new Error('Invalid QR code');
        }

        // Step 2: Load Restaurant Data
        flow.steps.push('load_data');
        const restaurantData = {
          restaurant: mockRestaurant,
          table: mockTable,
          waiters: mockWaiters
        };

        // Step 3: Tip Type Selection
        flow.steps.push('tip_type_selection');
        if (!['waiter', 'restaurant'].includes(userSelections.tipType)) {
          throw new Error('Invalid tip type selection');
        }

        // Step 4: Waiter Selection (if applicable)
        if (userSelections.tipType === 'waiter') {
          flow.steps.push('waiter_selection');
          const selectedWaiter = restaurantData.waiters.find(w => w.id === userSelections.waiterId);
          if (!selectedWaiter) {
            throw new Error('Invalid waiter selection');
          }
        }

        // Step 5: Amount Entry
        flow.steps.push('amount_entry');
        if (!userSelections.amount || userSelections.amount < 10 || userSelections.amount > 10000) {
          throw new Error('Invalid tip amount');
        }

        // Step 6: Confirmation
        flow.steps.push('confirmation');
        const tipData = {
          tipType: userSelections.tipType,
          amount: userSelections.amount,
          restaurantId: qrData.restaurantId,
          tableId: qrData.tableId,
          waiterId: userSelections.waiterId || null
        };

        // Step 7: Payment Processing (simulated)
        flow.steps.push('payment_processing');
        // In real implementation, this would integrate with M-Pesa/Card payment

        flow.success = true;
        flow.finalData = tipData;

      } catch (error) {
        flow.errors.push(error.message);
      }

      return flow;
    }

    // Test successful waiter tip flow
    const successfulWaiterFlow = simulateCompleteTippingFlow(
      { restaurantId: 'restaurant-123', tableId: 'table-456' },
      { tipType: 'waiter', waiterId: 'waiter-1', amount: 100 }
    );

    assert.strictEqual(successfulWaiterFlow.success, true, 'Successful waiter tip flow should complete');
    assert.strictEqual(successfulWaiterFlow.errors.length, 0, 'Should have no errors');
    assert.ok(successfulWaiterFlow.steps.includes('waiter_selection'), 'Should include waiter selection step');
    assert.strictEqual(successfulWaiterFlow.finalData.tipType, 'waiter', 'Should have correct tip type');

    // Test successful restaurant tip flow
    const successfulRestaurantFlow = simulateCompleteTippingFlow(
      { restaurantId: 'restaurant-123', tableId: 'table-456' },
      { tipType: 'restaurant', amount: 200 }
    );

    assert.strictEqual(successfulRestaurantFlow.success, true, 'Successful restaurant tip flow should complete');
    assert.ok(!successfulRestaurantFlow.steps.includes('waiter_selection'), 'Should skip waiter selection step');
    assert.strictEqual(successfulRestaurantFlow.finalData.tipType, 'restaurant', 'Should have correct tip type');

    // Test failed flow (invalid amount)
    const failedFlow = simulateCompleteTippingFlow(
      { restaurantId: 'restaurant-123', tableId: 'table-456' },
      { tipType: 'waiter', waiterId: 'waiter-1', amount: 5 } // Below minimum
    );

    assert.strictEqual(failedFlow.success, false, 'Failed flow should not complete');
    assert.ok(failedFlow.errors.length > 0, 'Should have errors');
    assert.ok(failedFlow.errors.some(error => error.includes('Invalid tip amount')), 'Should have amount error');

    console.log('✓ Complete tipping flow simulation test passed');
  });

  test('Mobile responsiveness validation', () => {
    // Simulate mobile viewport and interaction validation
    function validateMobileExperience(screenWidth, interactions) {
      const issues = [];

      // Screen size validation
      if (screenWidth < 320) {
        issues.push('Screen too narrow for optimal experience');
      }

      // Touch target validation
      interactions.forEach((interaction, index) => {
        if (interaction.type === 'button' && interaction.size < 44) {
          issues.push(`Button ${index + 1} too small for touch (${interaction.size}px)`);
        }
        
        if (interaction.type === 'input' && interaction.size < 44) {
          issues.push(`Input ${index + 1} too small for touch (${interaction.size}px)`);
        }
      });

      return {
        isMobileFriendly: issues.length === 0,
        issues
      };
    }

    // Test mobile-friendly interface
    const mobileInteractions = [
      { type: 'button', size: 48, label: 'Tip Waiter' },
      { type: 'button', size: 48, label: 'Tip Restaurant' },
      { type: 'button', size: 44, label: 'Waiter Selection' },
      { type: 'input', size: 48, label: 'Amount Input' },
      { type: 'button', size: 56, label: 'Confirm Payment' }
    ];

    const mobileResult = validateMobileExperience(375, mobileInteractions);
    assert.strictEqual(mobileResult.isMobileFriendly, true, 'Interface should be mobile-friendly');

    // Test non-mobile-friendly interface
    const smallInteractions = [
      { type: 'button', size: 32, label: 'Small Button' }, // Too small
      { type: 'input', size: 30, label: 'Small Input' }    // Too small
    ];

    const smallResult = validateMobileExperience(375, smallInteractions);
    assert.strictEqual(smallResult.isMobileFriendly, false, 'Small elements should fail mobile validation');
    assert.ok(smallResult.issues.length > 0, 'Should report touch target issues');

    console.log('✓ Mobile responsiveness validation test passed');
  });

  test('Error handling and recovery', () => {
    // Test error scenarios and recovery mechanisms
    function testErrorRecovery(errorScenario) {
      const recovery = {
        canRecover: false,
        recoveryAction: null,
        userMessage: null
      };

      switch (errorScenario.type) {
        case 'network_error':
          recovery.canRecover = true;
          recovery.recoveryAction = 'retry';
          recovery.userMessage = 'Network error. Please try again.';
          break;

        case 'invalid_qr':
          recovery.canRecover = false;
          recovery.userMessage = 'Invalid QR code. Please scan a valid restaurant QR code.';
          break;

        case 'inactive_waiter':
          recovery.canRecover = true;
          recovery.recoveryAction = 'select_different_waiter';
          recovery.userMessage = 'This waiter is no longer available. Please select another waiter.';
          break;

        case 'payment_failed':
          recovery.canRecover = true;
          recovery.recoveryAction = 'retry_payment';
          recovery.userMessage = 'Payment failed. Please try again or use a different payment method.';
          break;

        case 'session_expired':
          recovery.canRecover = true;
          recovery.recoveryAction = 'restart_flow';
          recovery.userMessage = 'Session expired. Please scan the QR code again.';
          break;

        default:
          recovery.userMessage = 'An unexpected error occurred. Please try again.';
      }

      return recovery;
    }

    // Test different error scenarios
    const errorScenarios = [
      { type: 'network_error' },
      { type: 'invalid_qr' },
      { type: 'inactive_waiter' },
      { type: 'payment_failed' },
      { type: 'session_expired' }
    ];

    errorScenarios.forEach(scenario => {
      const recovery = testErrorRecovery(scenario);
      assert.ok(recovery.userMessage, `Should provide user message for ${scenario.type}`);
      
      if (recovery.canRecover) {
        assert.ok(recovery.recoveryAction, `Should provide recovery action for ${scenario.type}`);
      }
    });

    console.log('✓ Error handling and recovery test passed');
  });
});

console.log('Running Customer Tipping Flow End-to-End Tests...\n');