# Requirements Document

## Introduction

Tippy is a QR code-based tipping platform for Kenyan restaurants that allows customers to tip individual waiters or the restaurant as a whole through mobile payments (M-Pesa and card). The system handles commission deduction, tip distribution according to restaurant-defined groups, and provides administrative dashboards for tracking accumulated tips.

## Glossary

- **Tippy_System**: The complete QR code-based tipping platform
- **Customer**: End user who scans QR codes and makes tips
- **Restaurant_Admin**: Restaurant staff member who manages tip distribution settings and views analytics
- **Waiter**: Restaurant staff member who can receive individual tips
- **YourappsLtd_Platform**: The central platform that processes payments and manages commissions
- **Tip_Jar**: Accumulated tips for a restaurant or individual over a time period
- **Commission_Rate**: Percentage fee deducted by YourappsLtd from each tip transaction
- **Distribution_Group**: Categories of restaurant staff (cleaners, waiters, admin, owners) with assigned percentage splits
- **QR_Code**: Unique code displayed at each restaurant table linking to the tipping interface
- **M-Pesa**: Mobile money payment system popular in Kenya
- **Monthly_Payout**: Accumulated tips distributed at the end of each month
- **Tenant**: Individual restaurant organization with isolated data and settings
- **Supabase_Database**: PostgreSQL database hosted on Supabase with Row Level Security
- **Multi_Tenant_Architecture**: System design where multiple restaurants share the same application instance but have isolated data

## Requirements

### Requirement 1

**User Story:** As a customer, I want to scan a QR code at my restaurant table to access the tipping interface, so that I can easily tip without needing to download an app or create an account.

#### Acceptance Criteria

1. WHEN a Customer scans the QR_Code, THE Tippy_System SHALL display a popup interface with tipping options
2. THE Tippy_System SHALL present two primary options: "Tip Waiter" and "Tip Restaurant"
3. THE Tippy_System SHALL load the interface within 3 seconds of QR code scan
4. THE Tippy_System SHALL work on mobile browsers without requiring app installation
5. THE Tippy_System SHALL display the restaurant name and table number in the interface

### Requirement 2

**User Story:** As a customer, I want to select a specific waiter by name when tipping individually, so that my tip goes directly to the person who served me.

#### Acceptance Criteria

1. WHEN a Customer selects "Tip Waiter", THE Tippy_System SHALL display a list of registered waiters for that restaurant
2. THE Tippy_System SHALL show waiter names and profile photos where available
3. WHEN a Customer selects a waiter, THE Tippy_System SHALL proceed to the tip amount entry screen
4. THE Tippy_System SHALL validate that the selected waiter is currently active and registered
5. THE Tippy_System SHALL allow customers to search waiters by name if the list exceeds 10 entries

### Requirement 3

**User Story:** As a customer, I want to enter a custom tip amount and pay via M-Pesa or card, so that I can tip the amount I choose using my preferred payment method.

#### Acceptance Criteria

1. THE Tippy_System SHALL allow customers to enter tip amounts between 10 KES and 10,000 KES
2. THE Tippy_System SHALL provide preset tip amount buttons (50, 100, 200, 500 KES)
3. WHEN a Customer confirms the tip amount, THE Tippy_System SHALL present M-Pesa and card payment options
4. THE Tippy_System SHALL integrate with M-Pesa STK Push for mobile payments
5. THE Tippy_System SHALL process card payments through a secure payment gateway
6. WHEN payment is successful, THE Tippy_System SHALL display a confirmation message with transaction ID

### Requirement 4

**User Story:** As YourappsLtd, I want to automatically deduct a configurable commission from each tip transaction, so that I can maintain the platform and generate revenue.

#### Acceptance Criteria

1. THE Tippy_System SHALL deduct the configured Commission_Rate from each successful tip transaction
2. THE Tippy_System SHALL set the default Commission_Rate to 10 percent
3. THE YourappsLtd_Platform SHALL allow authorized users to modify Commission_Rate per restaurant
4. THE Tippy_System SHALL calculate commission amounts to 2 decimal places
5. THE Tippy_System SHALL record all commission deductions with timestamps and transaction references

### Requirement 5

**User Story:** As a restaurant admin, I want to configure tip distribution percentages for different staff groups, so that restaurant-wide tips are fairly distributed according to our internal policies.

#### Acceptance Criteria

1. THE Tippy_System SHALL allow Restaurant_Admin to define Distribution_Group categories
2. THE Tippy_System SHALL require that all Distribution_Group percentages sum to 100 percent
3. THE Tippy_System SHALL provide default Distribution_Group settings (cleaners 10%, waiters 30%, admin 40%, owners 20%)
4. WHEN Restaurant_Admin modifies distribution settings, THE Tippy_System SHALL apply changes to future tips only
5. THE Tippy_System SHALL validate that each Distribution_Group percentage is between 0 and 100 percent

### Requirement 6

**User Story:** As a restaurant admin, I want to view a dashboard showing accumulated tips and distribution breakdowns, so that I can track our tipping performance and verify fair distribution.

#### Acceptance Criteria

1. THE Tippy_System SHALL display total tips received for the current month
2. THE Tippy_System SHALL show tip breakdowns by Distribution_Group with amounts and percentages
3. THE Tippy_System SHALL display individual waiter tip totals for the current month
4. THE Tippy_System SHALL allow Restaurant_Admin to view historical data for previous months
5. THE Tippy_System SHALL update dashboard data in real-time as new tips are received

### Requirement 7

**User Story:** As a restaurant or individual waiter, I want to receive my accumulated tips monthly via mobile money or bank transfer, so that I can access my earned tips reliably.

#### Acceptance Criteria

1. THE Tippy_System SHALL calculate Monthly_Payout amounts on the last day of each month
2. THE Tippy_System SHALL send payout notifications to recipients 3 days before transfer
3. THE Tippy_System SHALL support M-Pesa transfers for individual waiters
4. THE Tippy_System SHALL support bank transfers for restaurant Distribution_Group payouts
5. THE Tippy_System SHALL maintain payout records with transaction IDs and timestamps
6. THE Tippy_System SHALL require minimum payout threshold of 100 KES

### Requirement 8

**User Story:** As a restaurant admin, I want to manage waiter registrations and QR code generation, so that I can control who can receive tips and ensure proper table setup.

#### Acceptance Criteria

1. THE Tippy_System SHALL allow Restaurant_Admin to add new waiters with names and contact details
2. THE Tippy_System SHALL generate unique QR_Code for each restaurant table
3. THE Tippy_System SHALL allow Restaurant_Admin to deactivate waiters who are no longer employed
4. THE Tippy_System SHALL provide QR_Code printing functionality for table placement
5. THE Tippy_System SHALL validate waiter phone numbers for M-Pesa compatibility

### Requirement 9

**User Story:** As YourappsLtd, I want to implement a multi-tenant architecture with Supabase, so that multiple restaurants can use the platform with complete data isolation and security.

#### Acceptance Criteria

1. THE Tippy_System SHALL implement Row Level Security in Supabase_Database to ensure Tenant data isolation
2. THE Tippy_System SHALL create separate data contexts for each restaurant Tenant
3. THE Tippy_System SHALL prevent cross-tenant data access through database-level security policies
4. THE Tippy_System SHALL allow new restaurant Tenants to be onboarded without affecting existing tenants
5. THE Tippy_System SHALL maintain audit logs for all tenant-specific operations
6. THE Tippy_System SHALL support tenant-specific configuration settings and branding