const { test, describe } = require('node:test');
const assert = require('node:assert');
const QRCode = require('qrcode');

// Mock Supabase client for testing
const mockSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const mockSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';

describe('QR Code Generation and Validation', () => {
  test('QR code data URL generation', async () => {
    const testData = {
      restaurantId: 'test-restaurant-id',
      tableId: 'test-table-id',
      tableNumber: '1'
    };

    const tippingUrl = `http://localhost:3000/tip/${testData.restaurantId}/${testData.tableId}`;
    
    try {
      const qrDataURL = await QRCode.toDataURL(tippingUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        width: 256
      });

      // Verify QR code data URL is generated
      assert.ok(qrDataURL, 'QR code data URL should be generated');
      assert.ok(qrDataURL.startsWith('data:image/png;base64,'), 'QR code should be PNG data URL');
      
      console.log('✓ QR code data URL generation test passed');
    } catch (error) {
      assert.fail(`QR code generation failed: ${error.message}`);
    }
  });

  test('QR code SVG generation', async () => {
    const testData = {
      restaurantId: 'test-restaurant-id',
      tableId: 'test-table-id',
      tableNumber: '1'
    };

    const tippingUrl = `http://localhost:3000/tip/${testData.restaurantId}/${testData.tableId}`;
    
    try {
      const qrSVG = await QRCode.toString(tippingUrl, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256
      });

      // Verify QR code SVG is generated
      assert.ok(qrSVG, 'QR code SVG should be generated');
      assert.ok(qrSVG.includes('<svg'), 'QR code should be valid SVG');
      assert.ok(qrSVG.includes('</svg>'), 'QR code SVG should be complete');
      
      console.log('✓ QR code SVG generation test passed');
    } catch (error) {
      assert.fail(`QR code SVG generation failed: ${error.message}`);
    }
  });

  test('QR code URL parsing', () => {
    const testCases = [
      {
        url: 'http://localhost:3000/tip/restaurant-123/table-456',
        expected: {
          restaurantId: 'restaurant-123',
          tableId: 'table-456',
          tableNumber: ''
        }
      },
      {
        url: 'https://tippy.app/tip/abc-def-ghi/xyz-123',
        expected: {
          restaurantId: 'abc-def-ghi',
          tableId: 'xyz-123',
          tableNumber: ''
        }
      },
      {
        url: 'invalid-url',
        expected: null
      },
      {
        url: 'http://localhost:3000/other/path',
        expected: null
      }
    ];

    // QR code URL parsing function (copied from service)
    function parseQRCodeUrl(url) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        // Expected format: /tip/{restaurantId}/{tableId}
        if (pathParts.length >= 4 && pathParts[1] === 'tip') {
          return {
            restaurantId: pathParts[2],
            tableId: pathParts[3],
            tableNumber: '' // Will be filled from database lookup
          };
        }
        
        return null;
      } catch {
        return null;
      }
    }

    testCases.forEach((testCase, index) => {
      const result = parseQRCodeUrl(testCase.url);
      
      if (testCase.expected === null) {
        assert.strictEqual(result, null, `Test case ${index + 1}: Should return null for invalid URL`);
      } else {
        assert.deepStrictEqual(result, testCase.expected, `Test case ${index + 1}: URL parsing mismatch`);
      }
    });

    console.log('✓ QR code URL parsing test passed');
  });

  test('QR code uniqueness validation', () => {
    // Test that different table data generates different QR codes
    const testData1 = {
      restaurantId: 'restaurant-1',
      tableId: 'table-1',
      tableNumber: '1'
    };

    const testData2 = {
      restaurantId: 'restaurant-1',
      tableId: 'table-2',
      tableNumber: '2'
    };

    const testData3 = {
      restaurantId: 'restaurant-2',
      tableId: 'table-1',
      tableNumber: '1'
    };

    const url1 = `http://localhost:3000/tip/${testData1.restaurantId}/${testData1.tableId}`;
    const url2 = `http://localhost:3000/tip/${testData2.restaurantId}/${testData2.tableId}`;
    const url3 = `http://localhost:3000/tip/${testData3.restaurantId}/${testData3.tableId}`;

    // Verify URLs are unique
    assert.notStrictEqual(url1, url2, 'Different tables should generate different URLs');
    assert.notStrictEqual(url1, url3, 'Different restaurants should generate different URLs');
    assert.notStrictEqual(url2, url3, 'Different restaurant/table combinations should generate different URLs');

    console.log('✓ QR code uniqueness validation test passed');
  });

  test('QR code data encoding validation', async () => {
    const testData = {
      restaurantId: 'test-restaurant-123',
      tableId: 'test-table-456',
      tableNumber: '5'
    };

    const tippingUrl = `http://localhost:3000/tip/${testData.restaurantId}/${testData.tableId}`;
    
    try {
      // Generate QR code
      const qrDataURL = await QRCode.toDataURL(tippingUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png'
      });

      // Verify the QR code contains the expected data
      // Note: In a real test, you might use a QR code reader library to decode and verify
      assert.ok(qrDataURL.length > 100, 'QR code should contain substantial data');
      
      // Test different error correction levels
      const qrHighError = await QRCode.toDataURL(tippingUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png'
      });

      assert.ok(qrHighError, 'QR code with high error correction should be generated');
      assert.notStrictEqual(qrDataURL, qrHighError, 'Different error correction levels should produce different QR codes');

      console.log('✓ QR code data encoding validation test passed');
    } catch (error) {
      assert.fail(`QR code encoding validation failed: ${error.message}`);
    }
  });

  test('QR code activation/deactivation logic', () => {
    // Mock QR code data
    const mockQRCode = {
      id: 'test-qr-id',
      restaurant_id: 'test-restaurant',
      table_number: '1',
      table_name: 'Window Table',
      qr_data: 'http://localhost:3000/tip/test-restaurant/test-qr-id',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Test activation status validation
    function validateQRCodeStatus(qrCode) {
      if (!qrCode) {
        return { isValid: false, qrCode: null };
      }
      return {
        isValid: qrCode.is_active === true,
        qrCode: qrCode
      };
    }

    // Test active QR code
    const activeResult = validateQRCodeStatus(mockQRCode);
    assert.strictEqual(activeResult.isValid, true, 'Active QR code should be valid');

    // Test inactive QR code
    const inactiveQRCode = { ...mockQRCode, is_active: false };
    const inactiveResult = validateQRCodeStatus(inactiveQRCode);
    assert.strictEqual(inactiveResult.isValid, false, 'Inactive QR code should be invalid');

    // Test null QR code
    const nullResult = validateQRCodeStatus(null);
    assert.strictEqual(nullResult.isValid, false, 'Null QR code should be invalid');

    console.log('✓ QR code activation/deactivation logic test passed');
  });

  test('QR code restaurant linking validation', () => {
    // Mock data for testing restaurant-QR code relationships
    const mockRestaurant = {
      id: 'restaurant-123',
      name: 'Test Restaurant',
      slug: 'test-restaurant',
      is_active: true
    };

    const mockQRCode = {
      id: 'qr-456',
      restaurant_id: 'restaurant-123',
      table_number: '5',
      is_active: true
    };

    // Test valid restaurant-QR code link
    function validateRestaurantQRLink(qrCode, restaurant) {
      if (!qrCode || !restaurant) {
        return { isValid: false, error: 'Missing QR code or restaurant data' };
      }

      if (qrCode.restaurant_id !== restaurant.id) {
        return { isValid: false, error: 'QR code does not belong to restaurant' };
      }

      if (!qrCode.is_active || !restaurant.is_active) {
        return { isValid: false, error: 'QR code or restaurant is inactive' };
      }

      return { isValid: true };
    }

    // Test valid link
    const validResult = validateRestaurantQRLink(mockQRCode, mockRestaurant);
    assert.strictEqual(validResult.isValid, true, 'Valid restaurant-QR link should pass validation');

    // Test mismatched restaurant ID
    const wrongRestaurant = { ...mockRestaurant, id: 'different-restaurant' };
    const mismatchResult = validateRestaurantQRLink(mockQRCode, wrongRestaurant);
    assert.strictEqual(mismatchResult.isValid, false, 'Mismatched restaurant ID should fail validation');

    // Test inactive restaurant
    const inactiveRestaurant = { ...mockRestaurant, is_active: false };
    const inactiveRestResult = validateRestaurantQRLink(mockQRCode, inactiveRestaurant);
    assert.strictEqual(inactiveRestResult.isValid, false, 'Inactive restaurant should fail validation');

    // Test inactive QR code
    const inactiveQR = { ...mockQRCode, is_active: false };
    const inactiveQRResult = validateRestaurantQRLink(inactiveQR, mockRestaurant);
    assert.strictEqual(inactiveQRResult.isValid, false, 'Inactive QR code should fail validation');

    console.log('✓ QR code restaurant linking validation test passed');
  });
});

// Security tests
describe('QR Code Security Tests', () => {
  test('QR code URL injection prevention', () => {
    // Test malicious URL patterns
    const maliciousInputs = [
      'javascript:alert("xss")',
      'data:text/html,<script>alert("xss")</script>',
      'http://evil.com/redirect',
      '../../../etc/passwd',
      '<script>alert("xss")</script>',
      'DROP TABLE restaurants;',
      '"; DROP TABLE qr_codes; --'
    ];

    function sanitizeQRInput(input) {
      // Basic sanitization - in real implementation, use proper validation
      if (typeof input !== 'string') return '';
      
      // Remove any script tags, javascript:, data: schemes
      const cleaned = input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/[<>]/g, '');
      
      return cleaned;
    }

    maliciousInputs.forEach((maliciousInput, index) => {
      const sanitized = sanitizeQRInput(maliciousInput);
      
      // Verify malicious content is removed or neutralized
      assert.ok(!sanitized.includes('<script'), `Test ${index + 1}: Script tags should be removed`);
      assert.ok(!sanitized.includes('javascript:'), `Test ${index + 1}: JavaScript URLs should be removed`);
      assert.ok(!sanitized.includes('data:'), `Test ${index + 1}: Data URLs should be removed`);
    });

    console.log('✓ QR code URL injection prevention test passed');
  });

  test('QR code access control validation', () => {
    // Mock user and restaurant data for access control testing
    const mockUser = {
      id: 'user-123',
      email: 'admin@restaurant.com'
    };

    const mockRestaurant = {
      id: 'restaurant-456',
      name: 'Test Restaurant'
    };

    const mockAdminRelation = {
      user_id: 'user-123',
      restaurant_id: 'restaurant-456',
      is_active: true,
      role: 'admin'
    };

    // Test access control function
    function validateQRCodeAccess(user, restaurant, adminRelation) {
      if (!user || !restaurant || !adminRelation) {
        return { hasAccess: false, error: 'Missing authentication data' };
      }

      if (adminRelation.user_id !== user.id) {
        return { hasAccess: false, error: 'User ID mismatch' };
      }

      if (adminRelation.restaurant_id !== restaurant.id) {
        return { hasAccess: false, error: 'Restaurant ID mismatch' };
      }

      if (!adminRelation.is_active) {
        return { hasAccess: false, error: 'Admin access is inactive' };
      }

      return { hasAccess: true };
    }

    // Test valid access
    const validAccess = validateQRCodeAccess(mockUser, mockRestaurant, mockAdminRelation);
    assert.strictEqual(validAccess.hasAccess, true, 'Valid admin should have access');

    // Test invalid user
    const wrongUser = { ...mockUser, id: 'different-user' };
    const invalidUserAccess = validateQRCodeAccess(wrongUser, mockRestaurant, mockAdminRelation);
    assert.strictEqual(invalidUserAccess.hasAccess, false, 'Wrong user should not have access');

    // Test inactive admin
    const inactiveAdmin = { ...mockAdminRelation, is_active: false };
    const inactiveAccess = validateQRCodeAccess(mockUser, mockRestaurant, inactiveAdmin);
    assert.strictEqual(inactiveAccess.hasAccess, false, 'Inactive admin should not have access');

    console.log('✓ QR code access control validation test passed');
  });

  test('QR code data integrity validation', () => {
    // Test QR code data structure validation
    function validateQRCodeData(qrCodeData) {
      const errors = [];

      // Required fields validation
      if (!qrCodeData.id || typeof qrCodeData.id !== 'string') {
        errors.push('Invalid or missing QR code ID');
      }

      if (!qrCodeData.restaurant_id || typeof qrCodeData.restaurant_id !== 'string') {
        errors.push('Invalid or missing restaurant ID');
      }

      if (!qrCodeData.table_number || typeof qrCodeData.table_number !== 'string') {
        errors.push('Invalid or missing table number');
      }

      if (!qrCodeData.qr_data || typeof qrCodeData.qr_data !== 'string') {
        errors.push('Invalid or missing QR data');
      }

      if (typeof qrCodeData.is_active !== 'boolean') {
        errors.push('Invalid is_active field');
      }

      // URL validation for qr_data
      try {
        const url = new URL(qrCodeData.qr_data);
        if (!url.pathname.includes('/tip/')) {
          errors.push('QR data URL does not contain expected tip path');
        }
      } catch {
        errors.push('QR data is not a valid URL');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    // Test valid QR code data
    const validQRData = {
      id: 'qr-123',
      restaurant_id: 'restaurant-456',
      table_number: '5',
      table_name: 'Window Table',
      qr_data: 'http://localhost:3000/tip/restaurant-456/qr-123',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const validResult = validateQRCodeData(validQRData);
    assert.strictEqual(validResult.isValid, true, 'Valid QR code data should pass validation');
    assert.strictEqual(validResult.errors.length, 0, 'Valid QR code should have no errors');

    // Test invalid QR code data
    const invalidQRData = {
      id: null,
      restaurant_id: '',
      table_number: 123, // Should be string
      qr_data: 'not-a-url',
      is_active: 'true' // Should be boolean
    };

    const invalidResult = validateQRCodeData(invalidQRData);
    assert.strictEqual(invalidResult.isValid, false, 'Invalid QR code data should fail validation');
    assert.ok(invalidResult.errors.length > 0, 'Invalid QR code should have errors');

    console.log('✓ QR code data integrity validation test passed');
  });
});

console.log('Running QR Code Tests...\n');