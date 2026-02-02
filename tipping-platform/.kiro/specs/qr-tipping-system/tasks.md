# Implementation Plan

- [x] 1. Set up multi-tenant database schema and RLS policies






  - Create Supabase database tables with proper relationships and constraints
  - Implement Row Level Security policies for tenant isolation
  - Set up database migrations and seed data for testing
  - Configure Supabase authentication with custom tenant context
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 2. Implement core data models and validation
- [ ] 2.1 Create TypeScript interfaces and Zod schemas for all data models
  - Define Restaurant, Waiter, Tip, QRCode, and Payout interfaces
  - Implement validation schemas for API request/response data
  - Create database query helpers with proper typing
  - _Requirements: 8.1, 8.5, 5.1_

- [ ] 2.2 Implement restaurant and waiter management services
  - Create CRUD operations for restaurants and waiters
  - Implement waiter phone number validation for M-Pesa compatibility
  - Add waiter activation/deactivation functionality
  - _Requirements: 8.1, 8.3, 8.5_

- [ ] 2.3 Write unit tests for data models and validation
  - Test all Zod schemas with valid and invalid data
  - Test CRUD operations with proper tenant isolation
  - Verify phone number validation logic
  - _Requirements: 8.1, 8.5_

- [ ] 3. Build QR code generation and management system
- [ ] 3.1 Implement QR code generation service
  - Create unique QR codes for restaurant tables
  - Generate QR data linking to tipping interface with restaurant and table context
  - Implement QR code storage and retrieval from database
  - _Requirements: 8.2, 8.4_

- [ ] 3.2 Create QR code management interface for restaurant admins
  - Build admin interface for generating and managing table QR codes
  - Implement QR code printing functionality with proper formatting
  - Add table number assignment and QR code activation/deactivation
  - _Requirements: 8.2, 8.4_

- [ ] 3.3 Add QR code validation and security tests
  - Test QR code uniqueness and proper data encoding
  - Verify QR codes link to correct restaurant and table
  - Test QR code deactivation and reactivation flows
  - _Requirements: 8.2, 8.4_

- [ ] 4. Develop customer-facing tipping interface
- [ ] 4.1 Create QR code scanning landing page
  - Build responsive mobile-first tipping interface
  - Display restaurant branding and table information
  - Implement "Tip Waiter" and "Tip Restaurant" selection buttons
  - Add loading states and error handling for invalid QR codes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4.2 Implement waiter selection interface
  - Create searchable list of active waiters for the restaurant
  - Display waiter names and profile photos where available
  - Add search functionality for restaurants with many waiters
  - Implement waiter selection validation and error handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4.3 Build tip amount entry and confirmation screen
  - Create amount input with preset buttons (50, 100, 200, 500 KES)
  - Implement custom amount entry with validation (10-10,000 KES range)
  - Add tip summary display with restaurant/waiter information
  - Create confirmation screen before payment processing
  - _Requirements: 3.1, 3.2_

- [ ] 4.4 Add end-to-end testing for tipping flow
  - Test complete customer journey from QR scan to tip confirmation
  - Verify proper waiter selection and amount validation
  - Test responsive design on various mobile devices
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 5. Integrate M-Pesa payment processing
- [ ] 5.1 Set up M-Pesa Daraja API integration
  - Configure M-Pesa API credentials and authentication
  - Implement STK Push initiation for customer payments
  - Create payment status tracking and webhook handling
  - Add proper error handling for M-Pesa API failures
  - _Requirements: 3.3, 3.4, 3.6_

- [ ] 5.2 Implement payment confirmation and tip recording
  - Process M-Pesa payment confirmations via webhooks
  - Calculate and deduct commission amounts from tips
  - Record successful tips in database with proper tenant isolation
  - Send payment confirmation to customers with transaction ID
  - _Requirements: 3.6, 4.4, 4.5_

- [ ] 5.3 Add M-Pesa payment testing and error scenarios
  - Test STK Push with various phone number formats
  - Simulate payment failures and timeout scenarios
  - Verify webhook security and duplicate transaction handling
  - _Requirements: 3.3, 3.4, 3.6_

- [ ] 6. Add card payment gateway integration
- [ ] 6.1 Integrate Stripe or Flutterwave for card payments
  - Set up card payment gateway with proper security compliance
  - Implement payment form with card details collection
  - Add 3D Secure authentication for enhanced security
  - Create payment success and failure handling flows
  - _Requirements: 3.3, 3.5, 3.6_

- [ ] 6.2 Unify payment processing for both M-Pesa and cards
  - Create unified payment service handling both payment methods
  - Implement consistent commission calculation across payment types
  - Add payment method selection and validation logic
  - Ensure proper transaction recording for all payment types
  - _Requirements: 3.3, 4.4, 4.5_

- [ ] 6.3 Test card payment integration and security
  - Test card payments with various card types and scenarios
  - Verify PCI compliance and secure card data handling
  - Test payment gateway webhook processing and error handling
  - _Requirements: 3.3, 3.5, 3.6_

- [ ] 7. Build commission management system
- [ ] 7.1 Implement configurable commission rates
  - Create commission rate management for YourappsLtd admin
  - Set default 10% commission rate with ability to customize per restaurant
  - Implement commission calculation with proper decimal precision
  - Add commission rate change history and audit logging
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7.2 Create commission tracking and reporting
  - Build commission analytics dashboard for YourappsLtd
  - Track total commissions earned per restaurant and time period
  - Implement commission reconciliation and reporting features
  - Add commission payout tracking to YourappsLtd accounts
  - _Requirements: 4.4, 4.5_

- [ ] 7.3 Test commission calculations and edge cases
  - Test commission calculations with various tip amounts and rates
  - Verify proper rounding and decimal precision handling
  - Test commission rate changes and their application to new tips
  - _Requirements: 4.3, 4.4, 4.5_

- [ ] 8. Develop tip distribution system for restaurants
- [ ] 8.1 Create distribution group configuration interface
  - Build admin interface for setting up distribution groups (cleaners, waiters, admin, owners)
  - Implement percentage allocation with validation (must sum to 100%)
  - Set default distribution percentages as specified in requirements
  - Add distribution group modification with future-only application
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8.2 Implement restaurant-wide tip distribution logic
  - Calculate tip distributions based on configured group percentages
  - Handle restaurant-wide tips and allocate to appropriate groups
  - Implement distribution calculation with proper decimal handling
  - Track distributed amounts per group for payout processing
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 8.3 Test tip distribution calculations and validation
  - Test distribution calculations with various percentage configurations
  - Verify percentage validation and sum-to-100 requirement
  - Test distribution changes and their application to future tips only
  - _Requirements: 5.2, 5.4, 5.5_

- [ ] 9. Build restaurant admin dashboard
- [ ] 9.1 Create tip analytics and reporting interface
  - Display total tips received for current month with breakdowns
  - Show individual waiter tip totals and restaurant-wide distributions
  - Implement historical data viewing for previous months
  - Add real-time dashboard updates as new tips are received
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9.2 Implement waiter management interface
  - Create CRUD interface for adding, editing, and deactivating waiters
  - Add waiter profile management with contact details
  - Implement waiter performance analytics and tip history
  - Add bulk waiter operations for efficient management
  - _Requirements: 8.1, 8.3, 8.5_

- [ ] 9.3 Add QR code and table management features
  - Integrate QR code generation and management into admin dashboard
  - Display QR code status and usage analytics per table
  - Add QR code regeneration and table reassignment functionality
  - Implement QR code printing and download features
  - _Requirements: 8.2, 8.4_

- [ ] 9.4 Add dashboard testing and user experience validation
  - Test dashboard responsiveness and performance with large datasets
  - Verify real-time updates and data accuracy
  - Test admin user flows and interface usability
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10. Implement automated monthly payout system
- [ ] 10.1 Create payout calculation service
  - Implement monthly payout calculation for waiters and distribution groups
  - Calculate accumulated tips minus commissions for payout amounts
  - Apply minimum payout threshold (100 KES) and handle below-threshold amounts
  - Generate payout records with proper tenant isolation
  - _Requirements: 7.1, 7.6_

- [ ] 10.2 Integrate M-Pesa bulk payments for waiter payouts
  - Set up M-Pesa bulk payment API for individual waiter payouts
  - Implement payout notification system 3 days before transfer
  - Add payout status tracking and transaction ID recording
  - Handle payout failures and retry mechanisms
  - _Requirements: 7.2, 7.3, 7.5_

- [ ] 10.3 Add bank transfer integration for restaurant group payouts
  - Integrate bank transfer API for distribution group payouts
  - Implement secure bank account management for restaurants
  - Add payout reconciliation and confirmation tracking
  - Create payout history and audit trail functionality
  - _Requirements: 7.2, 7.4, 7.5_

- [ ] 10.4 Test payout processing and error handling
  - Test monthly payout calculations with various scenarios
  - Verify payout notifications and timing accuracy
  - Test payout failure handling and retry mechanisms
  - _Requirements: 7.1, 7.2, 7.5, 7.6_

- [ ] 11. Add multi-tenant security and administration
- [ ] 11.1 Implement tenant context middleware and security
  - Create middleware to enforce tenant context in all requests
  - Implement authentication with tenant-specific user sessions
  - Add cross-tenant access prevention and security logging
  - Create tenant onboarding flow for new restaurants
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 11.2 Build YourappsLtd super admin interface
  - Create admin panel for managing all restaurant tenants
  - Implement tenant-specific configuration management
  - Add system-wide analytics and commission tracking
  - Create tenant support and troubleshooting tools
  - _Requirements: 9.4, 9.5, 9.6_

- [ ] 11.3 Security testing and penetration testing
  - Test RLS policies and tenant isolation thoroughly
  - Verify authentication and authorization across all endpoints
  - Test for common security vulnerabilities (SQL injection, XSS)
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 12. Final integration and deployment preparation
- [ ] 12.1 Integrate all components and test end-to-end workflows
  - Connect all services and test complete user journeys
  - Verify payment processing, tip distribution, and payout flows
  - Test multi-tenant operations with multiple restaurants
  - Optimize performance and fix any integration issues
  - _Requirements: All requirements integration_

- [ ] 12.2 Set up production deployment and monitoring
  - Configure production Supabase database with proper security
  - Deploy Next.js application to Vercel with environment variables
  - Set up monitoring, logging, and error tracking systems
  - Configure backup and disaster recovery procedures
  - _Requirements: System reliability and monitoring_

- [ ] 12.3 Conduct user acceptance testing and bug fixes
  - Test with real restaurant partners and gather feedback
  - Fix any bugs or usability issues discovered during testing
  - Optimize mobile performance and user experience
  - _Requirements: User experience validation_