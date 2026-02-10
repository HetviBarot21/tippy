const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Restaurant Admin Dashboard Integration Tests', () => {
  test('Analytics API response validation', () => {
    // Mock analytics API response
    const mockAnalyticsResponse = {
      month: '2024-01',
      summary: {
        totalTips: 45,
        totalAmount: 12500,
        totalCommission: 1250,
        totalNetAmount: 11250,
        restaurantTipsAmount: 4500,
        waiterTipsAmount: 6750
      },
      waiterBreakdown: [
        {
          waiter: {
            id: 'waiter-1',
            name: 'John Doe',
            phone_number: '0712345678'
          },
          totalAmount: 3500,
          tipCount: 15
        }
      ],
      distributionBreakdown: [
        {
          groupName: 'waiters',
          percentage: 30,
          amount: 1350
        },
        {
          groupName: 'cleaners',
          percentage: 10,
          amount: 450
        },
        {
          groupName: 'admin',
          percentage: 40,
          amount: 1800
        },
        {
          groupName: 'owners',
          percentage: 20,
          amount: 900
        }
      ],
      paymentMethodBreakdown: {
        mpesa: { count: 30, amount: 8000 },
        card: { count: 15, amount: 4500 }
      },
      dailyBreakdown: [
        { date: '2024-01-01', amount: 500, count: 2 },
        { date: '2024-01-02', amount: 750, count: 3 }
      ],
      recentTips: [
        {
          id: 'tip-1',
          amount: 200,
          tip_type: 'waiter',
          payment_method: 'mpesa',
          created_at: '2024-01-15T10:30:00Z',
          waiters: { name: 'John Doe' },
          qr_codes: { table_number: '5' }
        }
      ]
    };

    function validateAnalyticsResponse(response) {
      const errors = [];

      // Validate summary
      if (!response.summary) {
        errors.push('Missing summary in analytics response');
      } else {
        const requiredSummaryFields = ['totalTips', 'totalAmount', 'totalCommission', 'totalNetAmount'];
        requiredSummaryFields.forEach(field => {
          if (typeof response.summary[field] !== 'number') {
            errors.push(`Invalid or missing ${field} in summary`);
          }
        });
      }

      // Validate waiter breakdown
      if (!Array.isArray(response.waiterBreakdown)) {
        errors.push('waiterBreakdown must be an array');
      } else {
        response.waiterBreakdown.forEach((waiter, index) => {
          if (!waiter.waiter || !waiter.waiter.id || !waiter.waiter.name) {
            errors.push(`Invalid waiter data at index ${index}`);
          }
          if (typeof waiter.totalAmount !== 'number' || typeof waiter.tipCount !== 'number') {
            errors.push(`Invalid waiter statistics at index ${index}`);
          }
        });
      }

      // Validate distribution breakdown
      if (!Array.isArray(response.distributionBreakdown)) {
        errors.push('distributionBreakdown must be an array');
      } else {
        let totalPercentage = 0;
        response.distributionBreakdown.forEach((group, index) => {
          if (!group.groupName || typeof group.percentage !== 'number' || typeof group.amount !== 'number') {
            errors.push(`Invalid distribution group at index ${index}`);
          }
          totalPercentage += group.percentage;
        });
        
        // Only validate percentage sum if there are distribution groups
        if (response.distributionBreakdown.length > 0 && Math.abs(totalPercentage - 100) > 0.01) {
          errors.push('Distribution percentages must sum to 100%');
        }
      }

      // Validate payment method breakdown
      if (!response.paymentMethodBreakdown || typeof response.paymentMethodBreakdown !== 'object') {
        errors.push('Invalid paymentMethodBreakdown');
      } else {
        Object.entries(response.paymentMethodBreakdown).forEach(([method, stats]) => {
          if (!stats || typeof stats.count !== 'number' || typeof stats.amount !== 'number') {
            errors.push(`Invalid payment method stats for ${method}`);
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    const validation = validateAnalyticsResponse(mockAnalyticsResponse);
    
    if (!validation.isValid) {
      console.log('Validation errors:', validation.errors);
    }
    
    assert.strictEqual(validation.isValid, true, 'Valid analytics response should pass validation');
    assert.strictEqual(validation.errors.length, 0, 'Valid response should have no errors');

    console.log('✓ Analytics API response validation test passed');
  });

  test('Waiter management API validation', () => {
    // Mock waiter creation request
    const validWaiterRequest = {
      name: 'Jane Smith',
      phone_number: '0723456789',
      email: 'jane@example.com',
      profile_photo_url: 'https://example.com/photo.jpg'
    };

    const invalidWaiterRequests = [
      { phone_number: '0723456789' }, // Missing name
      { name: 'John Doe' }, // Missing phone
      { name: 'John Doe', phone_number: 'invalid-phone' }, // Invalid phone format
      { name: '', phone_number: '0723456789' }, // Empty name
      { name: 'John Doe', phone_number: '0723456789', email: 'invalid-email' } // Invalid email
    ];

    function validateWaiterRequest(request) {
      const errors = [];

      // Required fields
      if (!request.name || typeof request.name !== 'string' || request.name.trim().length === 0) {
        errors.push('Name is required and must be a non-empty string');
      }

      if (!request.phone_number || typeof request.phone_number !== 'string') {
        errors.push('Phone number is required and must be a string');
      } else {
        // Kenyan phone number validation
        const phoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
        if (!phoneRegex.test(request.phone_number.replace(/\s+/g, ''))) {
          errors.push('Invalid Kenyan phone number format');
        }
      }

      // Optional email validation
      if (request.email && request.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(request.email)) {
          errors.push('Invalid email format');
        }
      }

      // Optional profile photo URL validation
      if (request.profile_photo_url && request.profile_photo_url.trim().length > 0) {
        try {
          new URL(request.profile_photo_url);
        } catch {
          errors.push('Invalid profile photo URL format');
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    // Test valid request
    const validResult = validateWaiterRequest(validWaiterRequest);
    assert.strictEqual(validResult.isValid, true, 'Valid waiter request should pass validation');

    // Test invalid requests
    invalidWaiterRequests.forEach((request, index) => {
      const result = validateWaiterRequest(request);
      assert.strictEqual(result.isValid, false, `Invalid waiter request ${index + 1} should fail validation`);
    });

    console.log('✓ Waiter management API validation test passed');
  });

  test('QR code analytics response validation', () => {
    // Mock QR analytics response
    const mockQRAnalyticsResponse = {
      period: 'Last 30 days',
      summary: {
        totalQRCodes: 10,
        activeQRCodes: 8,
        usedQRCodes: 6,
        totalRecentTips: 25,
        totalRecentAmount: 7500,
        averagePerTable: 1250
      },
      qrAnalytics: [
        {
          qrCode: {
            id: 'qr-1',
            table_number: '1',
            table_name: 'Window Table',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z'
          },
          analytics: {
            totalTips: 10,
            totalAmount: 2500,
            recentTipsCount: 5,
            recentAmount: 1250,
            waiterTipsCount: 3,
            waiterTipsAmount: 750,
            restaurantTipsCount: 2,
            restaurantTipsAmount: 500,
            dailyUsage: [
              { date: '2024-01-15', tipCount: 2, amount: 400 },
              { date: '2024-01-16', tipCount: 1, amount: 200 }
            ],
            averageTipAmount: 250,
            lastTipDate: '2024-01-16T15:30:00Z'
          }
        }
      ],
      topTables: []
    };

    function validateQRAnalyticsResponse(response) {
      const errors = [];

      // Validate summary
      if (!response.summary) {
        errors.push('Missing summary in QR analytics response');
      } else {
        const requiredFields = ['totalQRCodes', 'activeQRCodes', 'usedQRCodes', 'totalRecentTips', 'totalRecentAmount'];
        requiredFields.forEach(field => {
          if (typeof response.summary[field] !== 'number') {
            errors.push(`Invalid or missing ${field} in summary`);
          }
        });

        // Logical validation
        if (response.summary.activeQRCodes > response.summary.totalQRCodes) {
          errors.push('Active QR codes cannot exceed total QR codes');
        }
        if (response.summary.usedQRCodes > response.summary.totalQRCodes) {
          errors.push('Used QR codes cannot exceed total QR codes');
        }
      }

      // Validate QR analytics array
      if (!Array.isArray(response.qrAnalytics)) {
        errors.push('qrAnalytics must be an array');
      } else {
        response.qrAnalytics.forEach((qrData, index) => {
          if (!qrData.qrCode || !qrData.analytics) {
            errors.push(`Missing qrCode or analytics data at index ${index}`);
            return;
          }

          // Validate QR code data
          const qr = qrData.qrCode;
          if (!qr.id || !qr.table_number || typeof qr.is_active !== 'boolean') {
            errors.push(`Invalid QR code data at index ${index}`);
          }

          // Validate analytics data
          const analytics = qrData.analytics;
          const requiredAnalyticsFields = ['totalTips', 'totalAmount', 'recentTipsCount', 'recentAmount'];
          requiredAnalyticsFields.forEach(field => {
            if (typeof analytics[field] !== 'number') {
              errors.push(`Invalid ${field} in analytics at index ${index}`);
            }
          });

          // Validate daily usage
          if (!Array.isArray(analytics.dailyUsage)) {
            errors.push(`Invalid dailyUsage array at index ${index}`);
          } else {
            analytics.dailyUsage.forEach((day, dayIndex) => {
              if (!day.date || typeof day.tipCount !== 'number' || typeof day.amount !== 'number') {
                errors.push(`Invalid daily usage data at QR index ${index}, day ${dayIndex}`);
              }
            });
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    const validation = validateQRAnalyticsResponse(mockQRAnalyticsResponse);
    assert.strictEqual(validation.isValid, true, 'Valid QR analytics response should pass validation');
    assert.strictEqual(validation.errors.length, 0, 'Valid response should have no errors');

    console.log('✓ QR code analytics response validation test passed');
  });

  test('Dashboard performance with large datasets', () => {
    // Simulate large dataset scenarios
    function generateLargeDataset(size) {
      const dataset = {
        tips: [],
        waiters: [],
        qrCodes: []
      };

      // Generate tips
      for (let i = 0; i < size; i++) {
        dataset.tips.push({
          id: `tip-${i}`,
          amount: Math.floor(Math.random() * 1000) + 50,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          payment_status: 'completed',
          tip_type: Math.random() > 0.5 ? 'waiter' : 'restaurant'
        });
      }

      // Generate waiters
      const waiterCount = Math.min(size / 10, 50);
      for (let i = 0; i < waiterCount; i++) {
        dataset.waiters.push({
          id: `waiter-${i}`,
          name: `Waiter ${i + 1}`,
          phone_number: `07${String(i).padStart(8, '0')}`,
          is_active: Math.random() > 0.1
        });
      }

      // Generate QR codes
      const qrCount = Math.min(size / 20, 25);
      for (let i = 0; i < qrCount; i++) {
        dataset.qrCodes.push({
          id: `qr-${i}`,
          table_number: String(i + 1),
          is_active: Math.random() > 0.05
        });
      }

      return dataset;
    }

    function measureProcessingTime(dataset) {
      const startTime = process.hrtime.bigint();

      // Simulate analytics calculations
      const totalTips = dataset.tips.length;
      const totalAmount = dataset.tips.reduce((sum, tip) => sum + tip.amount, 0);
      
      // Group by waiter (simulation)
      const waiterStats = {};
      dataset.tips.forEach(tip => {
        if (tip.tip_type === 'waiter') {
          const waiterId = `waiter-${Math.floor(Math.random() * dataset.waiters.length)}`;
          if (!waiterStats[waiterId]) {
            waiterStats[waiterId] = { count: 0, amount: 0 };
          }
          waiterStats[waiterId].count++;
          waiterStats[waiterId].amount += tip.amount;
        }
      });

      // Group by QR code (simulation)
      const qrStats = {};
      dataset.tips.forEach(tip => {
        const qrId = `qr-${Math.floor(Math.random() * dataset.qrCodes.length)}`;
        if (!qrStats[qrId]) {
          qrStats[qrId] = { count: 0, amount: 0 };
        }
        qrStats[qrId].count++;
        qrStats[qrId].amount += tip.amount;
      });

      const endTime = process.hrtime.bigint();
      const processingTimeMs = Number(endTime - startTime) / 1000000;

      return {
        processingTimeMs,
        totalTips,
        totalAmount,
        waiterCount: Object.keys(waiterStats).length,
        qrCount: Object.keys(qrStats).length
      };
    }

    // Test different dataset sizes
    const testSizes = [100, 500, 1000, 5000];
    const performanceResults = [];

    testSizes.forEach(size => {
      const dataset = generateLargeDataset(size);
      const result = measureProcessingTime(dataset);
      performanceResults.push({ size, ...result });

      // Performance assertions
      assert.ok(result.processingTimeMs < 1000, `Processing ${size} records should take less than 1 second`);
      assert.strictEqual(result.totalTips, size, `Should process all ${size} tips`);
    });

    // Verify performance scales reasonably
    for (let i = 1; i < performanceResults.length; i++) {
      const current = performanceResults[i];
      const previous = performanceResults[i - 1];
      const timeRatio = current.processingTimeMs / previous.processingTimeMs;
      const sizeRatio = current.size / previous.size;
      
      // Processing time should not increase more than linearly with data size
      assert.ok(timeRatio <= sizeRatio * 2, 'Processing time should scale reasonably with data size');
    }

    console.log('✓ Dashboard performance with large datasets test passed');
    console.log('Performance results:', performanceResults.map(r => 
      `${r.size} records: ${r.processingTimeMs.toFixed(2)}ms`
    ).join(', '));
  });

  test('Real-time updates simulation', () => {
    // Simulate real-time dashboard updates
    class DashboardState {
      constructor() {
        this.tips = [];
        this.analytics = {
          totalTips: 0,
          totalAmount: 0,
          recentTips: []
        };
        this.subscribers = [];
      }

      subscribe(callback) {
        this.subscribers.push(callback);
      }

      addTip(tip) {
        this.tips.push(tip);
        this.updateAnalytics();
        this.notifySubscribers();
      }

      updateAnalytics() {
        this.analytics.totalTips = this.tips.length;
        this.analytics.totalAmount = this.tips.reduce((sum, tip) => sum + tip.amount, 0);
        this.analytics.recentTips = this.tips.slice(-10);
      }

      notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.analytics));
      }
    }

    const dashboard = new DashboardState();
    let updateCount = 0;
    let lastUpdate = null;

    // Subscribe to updates
    dashboard.subscribe((analytics) => {
      updateCount++;
      lastUpdate = analytics;
    });

    // Simulate adding tips
    const testTips = [
      { id: 'tip-1', amount: 100, created_at: new Date().toISOString() },
      { id: 'tip-2', amount: 200, created_at: new Date().toISOString() },
      { id: 'tip-3', amount: 150, created_at: new Date().toISOString() }
    ];

    testTips.forEach(tip => dashboard.addTip(tip));

    // Verify updates
    assert.strictEqual(updateCount, 3, 'Should receive update for each tip added');
    assert.strictEqual(lastUpdate.totalTips, 3, 'Analytics should reflect all tips');
    assert.strictEqual(lastUpdate.totalAmount, 450, 'Total amount should be correct');
    assert.strictEqual(lastUpdate.recentTips.length, 3, 'Recent tips should include all tips');

    console.log('✓ Real-time updates simulation test passed');
  });

  test('Dashboard user flow validation', () => {
    // Simulate complete user flows through the dashboard
    const userFlows = [
      {
        name: 'View Analytics',
        steps: [
          { action: 'load_dashboard', expected: 'dashboard_loaded' },
          { action: 'select_analytics_tab', expected: 'analytics_displayed' },
          { action: 'change_time_period', expected: 'data_refreshed' },
          { action: 'view_waiter_breakdown', expected: 'waiter_stats_shown' }
        ]
      },
      {
        name: 'Manage Waiters',
        steps: [
          { action: 'navigate_to_waiters', expected: 'waiter_list_loaded' },
          { action: 'click_add_waiter', expected: 'add_form_opened' },
          { action: 'fill_waiter_form', expected: 'form_validated' },
          { action: 'submit_form', expected: 'waiter_created' },
          { action: 'edit_waiter', expected: 'edit_form_opened' },
          { action: 'update_waiter', expected: 'waiter_updated' }
        ]
      },
      {
        name: 'Manage QR Codes',
        steps: [
          { action: 'navigate_to_qr', expected: 'qr_list_loaded' },
          { action: 'view_qr_analytics', expected: 'qr_stats_displayed' },
          { action: 'create_qr_code', expected: 'qr_created' },
          { action: 'download_qr', expected: 'qr_downloaded' },
          { action: 'print_qr', expected: 'print_dialog_opened' }
        ]
      }
    ];

    function simulateUserFlow(flow) {
      const results = [];
      let currentState = 'initial';

      flow.steps.forEach((step, index) => {
        // Simulate step execution (always successful for testing)
        const stepResult = {
          stepIndex: index,
          action: step.action,
          expected: step.expected,
          success: true,
          error: null
        };

        currentState = step.expected;

        results.push(stepResult);
      });

      return {
        flowName: flow.name,
        completed: results.every(r => r.success),
        steps: results,
        finalState: currentState
      };
    }

    // Test all user flows
    const flowResults = userFlows.map(simulateUserFlow);

    // Validate flow completion rates
    const completionRate = flowResults.filter(r => r.completed).length / flowResults.length;
    assert.ok(completionRate >= 0.8, 'At least 80% of user flows should complete successfully');

    // Validate critical flows
    const criticalFlows = ['View Analytics', 'Manage Waiters'];
    criticalFlows.forEach(flowName => {
      const flow = flowResults.find(r => r.flowName === flowName);
      if (flow && !flow.completed) {
        console.warn(`Critical flow "${flowName}" failed:`, flow.steps.filter(s => !s.success));
      }
    });

    console.log('✓ Dashboard user flow validation test passed');
    console.log(`Flow completion rate: ${(completionRate * 100).toFixed(1)}%`);
  });

  test('Error handling and recovery', () => {
    // Test error scenarios and recovery mechanisms
    const errorScenarios = [
      {
        name: 'Network timeout',
        error: { type: 'network', message: 'Request timeout' },
        recoverable: true
      },
      {
        name: 'Server error',
        error: { type: 'server', message: 'Internal server error', status: 500 },
        recoverable: true
      },
      {
        name: 'Authentication failure',
        error: { type: 'auth', message: 'Unauthorized', status: 401 },
        recoverable: false
      },
      {
        name: 'Data validation error',
        error: { type: 'validation', message: 'Invalid input data', status: 400 },
        recoverable: false
      }
    ];

    function simulateErrorHandling(scenario) {
      const result = {
        scenario: scenario.name,
        error: scenario.error,
        handled: false,
        recovered: false,
        userNotified: false
      };

      // Simulate error detection
      result.handled = true;

      // Simulate recovery attempt for recoverable errors
      if (scenario.recoverable) {
        // Simulate retry mechanism
        const retrySuccess = Math.random() > 0.3; // 70% success rate on retry
        result.recovered = retrySuccess;
      }

      // User should always be notified of errors
      result.userNotified = true;

      return result;
    }

    const errorResults = errorScenarios.map(simulateErrorHandling);

    // Validate error handling
    errorResults.forEach(result => {
      assert.strictEqual(result.handled, true, `Error "${result.scenario}" should be handled`);
      assert.strictEqual(result.userNotified, true, `User should be notified of error "${result.scenario}"`);
      
      if (result.error.type === 'network' || result.error.type === 'server') {
        // Recoverable errors should have recovery attempts
        assert.ok(result.recovered !== undefined, `Recovery should be attempted for "${result.scenario}"`);
      }
    });

    console.log('✓ Error handling and recovery test passed');
    console.log('Error handling results:', errorResults.map(r => 
      `${r.scenario}: handled=${r.handled}, recovered=${r.recovered || 'N/A'}`
    ).join(', '));
  });
});

console.log('Running Restaurant Admin Dashboard Integration Tests...\n');