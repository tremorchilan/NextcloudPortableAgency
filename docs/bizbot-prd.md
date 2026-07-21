# Product Requirements Document (PRD): BizBot — WhatsApp-First Commerce & Inventory Platform

**Version:** 1.4 | **Date:** July 6, 2026 | **Status:** Draft — Pending Validation | **Owner:** Product & Engineering Team | **AI Stack:** Two-stage — rule-based parser + hosted multimodal LLM API (see Section 10) | **Customer Memory:** Lightweight per-business preference store (see AI-009)

**Changes from v1.3:** Replaced the self-hosted large-model AI stack claims with a realistic two-stage hybrid (rule-based parser + hosted LLM API for ambiguous cases), corrected Appendix C cost estimates for LLM inference, removed duplicated content, fixed version numbering, and added explicit notes where earlier language overstated offline AI capability or one-time-fee sustainability. Functional requirements (Sections 4, 7, 8) are substantively unchanged — they were sound in v1.3.

---

## Table of Contents

1. Document Purpose
2. Product Overview
3. User Personas
4. Functional Requirements
5. Non-Functional Requirements
6. System Architecture
7. API Specifications
8. Database Schema
9. UI/UX Requirements
10. AI/ML Requirements
11. Security Requirements
12. Testing Strategy
13. Release Criteria
14. Appendices

---

## 1. Document Purpose

This PRD defines the functional and technical specifications for BizBot v1.0 — a WhatsApp-first commerce and inventory management platform for Bangladeshi SMEs. It serves as the single source of truth for developers, designers, QA, and stakeholders.

**Scope:** v1.0 MVP (Minimum Viable Product)

**Target Release:** 8 weeks from development start

**Platform:** Mobile-first Progressive Web App (PWA) + WhatsApp Business API backend

---

## 2. Product Overview

### 2.1 Product Name

**BizBot** — বাংলা: বিজবট (pronounced "Biz-Bot")

### 2.2 One-Sentence Description

A WhatsApp-native platform that turns SME customer conversations into organized orders, inventory records, and business insights — without changing how SMEs already sell.

### 2.3 Problem Statement

**Current State:**

- SMEs receive 15–50 orders/day via WhatsApp
- Orders are tracked manually (notebook, Excel, or memory)
- Stock levels are unknown until physical count
- Revenue/expense tracking is chaotic or non-existent
- Tax filing requires weeks of manual reconciliation
- Customer history is lost when phones are changed

**Desired State:**

- Orders auto-extracted from WhatsApp messages
- Real-time inventory tracking with low-stock alerts
- One-click profit/loss and tax reports
- Customer profiles with purchase history
- All data backed up and accessible from any device

### 2.4 Key Differentiators

| Feature | BizBot | Competitors |
|---------|--------|-------------|
| WhatsApp-native | Yes — Core channel | No — Separate app required |
| Bengali-first UI | Yes — 100% Bengali | No — English only |
| One-time pricing | Yes — No subscription | No — Monthly fees |
| Offline capability | Yes — Full offline mode | No — Internet required |
| AI order parsing | Yes — Auto-extracts orders | No — Manual entry |
| SME-specific | Yes — Built for Bangladesh | No — Generic global tools |

### 2.5 Success Criteria (MVP)

| Criteria | Target | Measurement Method |
|----------|--------|-------------------|
| Order extraction accuracy | >=90% | Manual audit of 100 orders |
| Inventory sync latency | <5 seconds | Automated monitoring |
| Dashboard load time | <3 seconds | Lighthouse audit |
| User onboarding time | <10 minutes | Time-to-first-order tracking |
| Uptime | >=99.5% | Uptime monitoring |

---

## 3. User Personas

### 3.1 Primary Persona: Rahim — Leather Goods Artisan

- Name: Rahim Hossain, Age: 34, Location: Hazaribagh, Dhaka
- Business: Custom leather bags, wallets, belts
- Employees: 2 (1 assistant, 1 delivery)
- Daily Orders: 15-20
- Tech Level: Smartphone power user, no computer
- Pain Points: Forgets custom order details, oversells popular items, no idea which products are most profitable, spends 3+ hours daily on order management
- Goals: Spend less time on admin, never lose an order, know exact stock without counting, file taxes without hiring an accountant

### 3.2 Secondary Persona: Fatima — Agro-Food Processor

- Name: Fatima Begum, Age: 41, Location: Mymensingh District
- Business: Packaged spices, pickles, preserves
- Employees: 5 (family + 2 workers)
- Daily Orders: 30-40 (50% repeat customers)
- Tech Level: Comfortable with smartphone, uses bKash daily
- Pain Points: Cannot track which products are profitable, stockouts of popular items, no customer database for repeat marketing, tax filing is a nightmare
- Goals: Understand true product profitability, predict demand for inventory planning, send offers to repeat customers, generate tax reports in one click

### 3.3 Tertiary Persona: Karim — Electronics Retailer

- Name: Karim Uddin, Age: 29, Location: Chattogram
- Business: Mobile accessories, small electronics
- Employees: 3 (each manages 1 WhatsApp number)
- Daily Orders: 50+ across 3 WhatsApp numbers
- Tech Level: Tech-savvy, wants automation
- Pain Points: No centralized view across 3 numbers, suspects employee theft but cannot prove, month-end reconciliation takes 2 days, cannot track which employee handled which order
- Goals: Centralized dashboard for all numbers, employee activity tracking, real-time profit/loss visibility, automated month-end reports

---

## 4. Functional Requirements

### 4.1 Module: WhatsApp Integration (WH-001 to WH-010)

#### WH-001: WhatsApp Business API Connection

**Priority:** P0 (Critical)

**Description:** System must connect to WhatsApp Business API to send/receive messages.

**Acceptance Criteria:**

- Support connection to WhatsApp Business API Cloud
- Handle webhook registration and verification
- Support multiple WhatsApp numbers per business account
- Graceful handling of API rate limits and errors
- Automatic retry with exponential backoff

#### WH-002: Incoming Message Processing

**Priority:** P0

**Description:** All incoming WhatsApp messages must be captured and stored.

**Acceptance Criteria:**

- Capture text messages (Bengali script + Romanized Bangla)
- Capture image messages (product photos)
- Capture voice notes (store for future transcription)
- Capture document messages (invoices, receipts)
- Store raw message with metadata (timestamp, sender number, message ID)
- Assign unique internal message ID

#### WH-003: Outgoing Message Dispatch

**Priority:** P0

**Description:** System must send automated and manual replies via WhatsApp.

**Acceptance Criteria:**

- Send text messages in Bengali
- Send templated messages (order confirmation, stock alert, delivery update)
- Support message scheduling (e.g., "remind customer tomorrow")
- Track delivery and read receipts
- Queue messages during API downtime

#### WH-004: Message Threading

**Priority:** P1 (High)

**Description:** Messages must be organized by customer conversation thread.

**Acceptance Criteria:**

- Group messages by customer phone number
- Display conversation history chronologically
- Show unread message count per thread
- Mark threads as "needs attention" for manual follow-up
- Search within conversation threads

#### WH-005: Multi-Number Support

**Priority:** P1

**Description:** Businesses with multiple WhatsApp numbers must manage all from one dashboard.

**Acceptance Criteria:**

- Add/remove WhatsApp numbers from dashboard
- Assign labels to numbers (e.g., "Sales-1", "Sales-2", "Support")
- Filter dashboard views by number
- Route messages to appropriate number based on rules
- Consolidated reporting across all numbers

#### WH-006: Message Templates

**Priority:** P1

**Description:** Pre-defined message templates for common scenarios.

**Acceptance Criteria:**

- Create custom templates with variables ({{customer_name}}, {{order_id}}, {{amount}})
- Template categories: Order Confirmation, Stock Alert, Delivery, Payment Reminder, Thank You
- One-click send from dashboard
- Template approval workflow (WhatsApp requires pre-approval for some templates)

#### WH-007: Auto-Reply Rules

**Priority:** P2 (Medium)

**Description:** Configurable auto-replies for common queries.

**Acceptance Criteria:**

- Set auto-reply for "price inquiry" -> send price list
- Set auto-reply for "stock inquiry" -> check inventory and reply
- Set auto-reply for "delivery status" -> send tracking info
- Time-based rules (e.g., after-hours auto-reply)
- Keyword-triggered rules

#### WH-008: Media Handling

**Priority:** P2

**Description:** Store and manage media files from WhatsApp.

**Acceptance Criteria:**

- Download and store images sent by customers
- Compress images for storage optimization
- Link media to orders and customer profiles
- Generate thumbnails for dashboard display
- Support image search (future: AI image recognition for product matching)

#### WH-009: Message Analytics

**Priority:** P2

**Description:** Insights into messaging patterns.

**Acceptance Criteria:**

- Messages received/sent per day/week/month
- Average response time
- Peak messaging hours
- Most common message types (order, inquiry, complaint)
- Customer engagement rate

#### WH-010: WhatsApp Status Sync

**Priority:** P3 (Low)

**Description:** Sync with WhatsApp Business catalog/status.

**Acceptance Criteria:**

- Read product catalog from WhatsApp Business
- Sync inventory levels to WhatsApp catalog (future)
- Post status updates from dashboard (future)

---

### 4.2 Module: AI Order Parser (AI-001 to AI-008)

#### AI-001: Order Extraction from Text

**Priority:** P0

**Description:** AI must extract structured order data from unstructured WhatsApp text messages.

**Acceptance Criteria:**

- Extract product name/variant (e.g., "black leather bag", "medium size")
- Extract quantity (e.g., "2 ta", "dui piece", "2ti")
- Extract price if mentioned (e.g., "3200 taka", "3200")
- Extract delivery address if provided
- Extract delivery preference (e.g., "home delivery", "pickup")
- Handle Bengali numerals (0-9) and Arabic numerals (0-9)
- Handle mixed Bengali-English text (Banglish)
- Confidence score for each extraction (0-100%)

#### AI-002: Intent Classification

**Priority:** P0

**Description:** Classify message intent to trigger appropriate workflow.

**Acceptance Criteria:**

- "Order Intent" — customer wants to buy
- "Inquiry Intent" — customer asking price/availability
- "Complaint Intent" — customer has issue with previous order
- "Payment Intent" — customer confirming payment
- "Delivery Intent" — customer asking about delivery status
- "General Chat" — non-business conversation
- Confidence threshold: >=85% for auto-action, <85% flag for manual review

#### AI-003: Product Matching

**Priority:** P0

**Description:** Match extracted product names to SME's product catalog.

**Acceptance Criteria:**

- Fuzzy matching for product names (e.g., "leather bag" matches "Premium Leather Bag")
- Handle synonyms (e.g., "beg" = "bag", "juta" = "shoes")
- Handle spelling variations (e.g., "leder" = "leather")
- Suggest closest match if exact match not found
- Allow SME to confirm/correct match from dashboard
- Learn from corrections over time

#### AI-004: Quantity Parsing

**Priority:** P0

**Description:** Parse quantity from various text formats.

**Acceptance Criteria:**

- Arabic numerals: "2", "10", "100"
- Bengali numerals: "২", "১০", "১০০"
- Written numbers: "dui", "duita", "dosh", "eksho"
- With units: "2 piece", "1 kg", "3 dozen", "1 box"
- Without units: "2 ta" (default to product's default unit)
- Handle ambiguous cases (e.g., "2-3" -> flag for manual review)

#### AI-005: Fallback Rule-Based Parser

**Priority:** P1

**Description:** When AI confidence is low, use rule-based parsing.

**Acceptance Criteria:**

- Trigger fallback when AI confidence < 85%
- Pattern matching for common order formats (e.g., "[product] [quantity] [price]")
- Keyword-based extraction (e.g., "lagbe", "chai", "den" = order intent)
- Store fallback-flagged orders for manual review
- Dashboard notification for orders needing review

#### AI-006: Training Data Pipeline

**Priority:** P1

**Description:** System to collect and annotate training data for continuous improvement.

**Acceptance Criteria:**

- Log all messages with AI extraction results
- Allow SMEs to correct AI extractions from dashboard
- Store corrections as labeled training data
- Monthly retraining of AI model with new data
- A/B testing for model improvements

#### AI-007: Multi-Turn Conversation Handling

**Priority:** P2

**Description:** Handle orders that span multiple messages.

**Acceptance Criteria:**

- Maintain conversation context across messages
- Accumulate order details over multiple turns (e.g., product in msg 1, quantity in msg 2, address in msg 3)
- Detect order completion (e.g., "thik ache", "confirm")
- Handle order modifications (e.g., "change to red instead of black")
- Timeout incomplete orders after 24 hours

#### AI-008: Price Negotiation Detection

**Priority:** P3

**Description:** Detect when customer is negotiating price.

**Acceptance Criteria:**

- Detect price negotiation intent (e.g., "discount ache?", "komay den")
- Flag for SME attention instead of auto-confirming
- Suggest standard discount ranges based on SME settings
- Log negotiation outcomes for future pricing insights

#### AI-009: Customer Preference Memory

**Priority:** P1

**Description:** Remember customer preferences and context across sessions to support natural references like "the red one from last time."

**Note on scope (revised from v1.3):** v1.3 specified a self-hosted memory server with named-tool benchmarking claims that had not been verified for this project. This version scopes the feature to what's actually needed and buildable in the MVP timeline: a structured preference table per customer, queried directly rather than through a separate memory service. A dedicated memory layer (self-hosted or otherwise) can be evaluated post-MVP if the simple version proves insufficient.

**Acceptance Criteria:**

- Per-customer preference fields stored in the existing `customers` table / a linked `customer_preferences` table (no separate service to deploy or operate)
- Static facts: stated preferences (e.g., "likes black leather"), preferred delivery method, preferred payment method
- Dynamic facts: last N orders, last contact date, simple recency-based patterns
- Multi-turn context: "the red one from last time" resolves via a lookup against the customer's recent order history, fed into the AI parser's prompt as context
- Customer address changes: current address stored on the customer record; full change history in the audit log
- Explicit correction handling: when a customer states a change (e.g., "no, I moved to Gulshan"), the old value is superseded and logged, not silently overwritten
- Full per-customer data export as JSON, available to the SME on request
- Strict per-business data isolation (enforced via `business_id` scoping on every query, same as the rest of the schema)
- Retrieval quality is assessed via manual accuracy spot-checks during the pilot, not against third-party benchmark suites — claiming compliance with specific published benchmarks without having run them is not something to put in a spec

---

### 4.3 Module: Inventory Management (INV-001 to INV-010)

#### INV-001: Product Catalog Management

**Priority:** P0

**Description:** CRUD operations for product catalog.

**Acceptance Criteria:**

- Add product: name, description, category, images, variants (size, color, etc.)
- Edit product details
- Delete/archive product (soft delete)
- Bulk import via CSV/Excel
- Product categories: customizable by SME
- Product tags for filtering
- Product cost price and selling price
- Product barcode/QR code (future)

#### INV-002: Stock Tracking

**Priority:** P0

**Description:** Real-time stock level tracking.

**Acceptance Criteria:**

- Stock increases on purchase/receipt
- Stock decreases on order confirmation
- Stock decreases on manual adjustment (with reason)
- Stock reserved when order pending (configurable)
- Stock released when order cancelled
- Stock history log (who changed, when, why)
- Current stock view with search and filter

#### INV-003: Low Stock Alerts

**Priority:** P0

**Description:** Alert SME when stock is running low.

**Acceptance Criteria:**

- Set minimum stock level per product
- Alert via WhatsApp when stock <= minimum
- Alert via dashboard notification
- Configurable alert frequency (once, daily, weekly)
- Low stock report in dashboard

#### INV-004: Multi-Location Support

**Priority:** P1

**Description:** Track stock across multiple locations.

**Acceptance Criteria:**

- Define locations (e.g., "Main Shop", "Godown", "Home")
- Track stock per location
- Transfer stock between locations
- Location-specific stock views
- Default location for new orders

#### INV-005: Unit Management

**Priority:** P1

**Description:** Support various measurement units.

**Acceptance Criteria:**

- Predefined units: piece, kg, gram, liter, dozen, box, packet, meter
- Custom unit creation
- Unit conversion (e.g., 1 dozen = 12 pieces)
- Default unit per product
- Unit display in orders and reports

#### INV-006: Stock Adjustment

**Priority:** P1

**Description:** Manual stock corrections.

**Acceptance Criteria:**

- Adjust stock up (e.g., found missing stock, return from customer)
- Adjust stock down (e.g., damaged, lost, personal use)
- Require reason for adjustment
- Audit trail for all adjustments
- Adjustment report for period

#### INV-007: Purchase Order Management

**Priority:** P2

**Description:** Track purchases from suppliers.

**Acceptance Criteria:**

- Create purchase orders
- Link purchase orders to stock receipts
- Track supplier information
- Purchase cost vs. selling price margin calculation
- Purchase order status: pending, received, cancelled

#### INV-008: Inventory Valuation

**Priority:** P2

**Description:** Calculate inventory value with Excel export for inspection.

**Acceptance Criteria:**

- FIFO valuation method
- Total inventory value report
- Inventory value by category
- Inventory turnover rate
- Dead stock identification (no sales in 90 days)
- **Excel export: full inventory register** — product, SKU, location, quantity, cost price, selling price, margin %, last sold date, days in stock, reorder flag

#### INV-009: Barcode/QR Scanning

**Priority:** P3

**Description:** Scan products for quick stock operations.

**Acceptance Criteria:**

- Generate QR codes for products
- Scan QR codes via smartphone camera
- Quick stock lookup via scan
- Quick order creation via scan (future)

#### INV-010: Inventory Forecasting

**Priority:** P3

**Description:** Predict future stock needs.

**Acceptance Criteria:**

- Sales velocity calculation (units sold per day)
- Days of stock remaining
- Recommended reorder quantity
- Reorder point suggestions
- Seasonal trend detection (future)

---

### 4.4 Module: Order Management (ORD-001 to ORD-010)

#### ORD-001: Order Creation

**Priority:** P0

**Description:** Create orders from parsed WhatsApp messages or manually.

**Acceptance Criteria:**

- Auto-create order from AI-parsed message
- Manual order creation from dashboard
- Order ID generation (auto-increment or custom format)
- Order timestamp (auto)
- Link to customer profile
- Link to WhatsApp message thread

#### ORD-002: Order Status Workflow

**Priority:** P0

**Description:** Track order through fulfillment lifecycle.

**Acceptance Criteria:**

- Statuses: Pending -> Confirmed -> Processing -> Ready -> Shipped -> Delivered -> Cancelled
- Status change with timestamp and user
- Auto-status update via WhatsApp (e.g., "Your order #123 is now shipped")
- Custom status labels (configurable by SME)
- Status history log

#### ORD-003: Order Editing

**Priority:** P1

**Description:** Modify orders after creation.

**Acceptance Criteria:**

- Add/remove products from order
- Change quantities
- Change delivery address
- Apply discount (amount or percentage)
- Add notes/comments
- Track all changes in audit log

#### ORD-004: Order Cancellation

**Priority:** P1

**Description:** Cancel orders with proper stock reversal.

**Acceptance Criteria:**

- Cancel order with reason
- Auto-restock cancelled items
- Cancelled order report
- Customer notification via WhatsApp
- Refund tracking (if payment received)

#### ORD-005: Order Search & Filter

**Priority:** P1

**Description:** Find orders quickly and export for analysis.

**Acceptance Criteria:**

- Search by order ID, customer name, phone number
- Filter by status, date range, product, customer, payment status, delivery status
- Sort by date, amount, status, customer name
- **Export filtered results: Excel (.xlsx) default** — full order detail with line items, customer info, payment breakdown
- Export: CSV for bulk operations
- Saved filter presets with one-click re-run
- **"Export last 30 days" quick button on dashboard**

#### ORD-006: Order Analytics

**Priority:** P1

**Description:** Insights into order patterns.

**Acceptance Criteria:**

- Orders per day/week/month
- Average order value
- Top products by order count and revenue
- Order status distribution
- Cancellation rate
- Peak ordering hours/days

#### ORD-007: Delivery Management

**Priority:** P2

**Description:** Track deliveries.

**Acceptance Criteria:**

- Assign delivery personnel
- Delivery address with map link (Google Maps)
- Delivery status: Pending, Out for Delivery, Delivered, Failed
- Delivery confirmation (photo + signature — future)
- Delivery route optimization (future)

#### ORD-008: Payment Tracking

**Priority:** P2

**Description:** Track payment status per order.

**Acceptance Criteria:**

- Payment methods: Cash, bKash, Nagad, Bank Transfer, Card
- Payment status: Pending, Partial, Paid, Refunded
- Partial payment support
- Payment receipt upload
- Payment reminder via WhatsApp

#### ORD-009: Return/Refund Management

**Priority:** P2

**Description:** Handle customer returns.

**Acceptance Criteria:**

- Create return request with reason
- Restock returned items (if resellable)
- Track refund status
- Return reason analytics
- Customer notification

#### ORD-010: Order Templates

**Priority:** P3

**Description:** Quick order creation for repeat orders.

**Acceptance Criteria:**

- Save frequent order combinations as templates
- One-click order from template
- Template management (CRUD)

---

### 4.5 Module: Customer CRM (CRM-001 to CRM-008)

#### CRM-001: Customer Profile Auto-Creation

**Priority:** P0

**Description:** Automatically create customer profiles from WhatsApp interactions.

**Acceptance Criteria:**

- Auto-create profile on first message
- Capture: phone number, name (from WhatsApp), first contact date
- Profile photo from WhatsApp (if available)
- Merge duplicate profiles (same number)

#### CRM-002: Customer Profile Management

**Priority:** P0

**Description:** View and edit customer information.

**Acceptance Criteria:**

- View full customer profile
- Edit customer details (name, address, preferences)
- Add custom notes/tags
- Customer classification (VIP, Regular, New, Inactive)
- Customer photo upload

#### CRM-003: Purchase History

**Priority:** P0

**Description:** Complete order history per customer.

**Acceptance Criteria:**

- List all orders chronologically
- Total lifetime value (LTV)
- Average order value
- Favorite products
- Last purchase date
- Days since last purchase

#### CRM-004: Customer Segmentation

**Priority:** P1

**Description:** Group customers for targeted marketing with Excel export.

**Acceptance Criteria:**

- Auto-segments: VIP (top 10% by LTV), Regular, New, Inactive (90+ days), At-Risk (declining frequency)
- Custom segment creation with rule builder
- Segment-based filtering
- **Export segment: Excel (.xlsx)** — full customer profile, purchase history, contact info, segment reason; ready for WhatsApp bulk messaging or external marketing tool import
- Export: CSV for CRM import

#### CRM-005: Customer Communication

**Priority:** P1

**Description:** Communicate with customers from dashboard.

**Acceptance Criteria:**

- Send WhatsApp message to individual customer
- Send bulk WhatsApp to segment (with rate limiting)
- Message templates for common communications
- Communication history log
- Scheduled messages

#### CRM-006: Customer Analytics

**Priority:** P1

**Description:** Insights into customer behavior.

**Acceptance Criteria:**

- Total customers (active, inactive, new this month)
- Customer retention rate
- Repeat purchase rate
- Customer acquisition trend
- Churn prediction (future)

#### CRM-007: Birthday/Anniversary Reminders

**Priority:** P2

**Description:** Remember special dates for relationship building.

**Acceptance Criteria:**

- Store birthday and anniversary dates
- Dashboard reminder 7 days before
- One-click send birthday greeting
- Track greeting history

#### CRM-008: Customer Feedback

**Priority:** P3

**Description:** Collect and manage customer feedback.

**Acceptance Criteria:**

- Send feedback request after delivery
- Star rating (1-5) + text feedback
- Feedback dashboard
- Respond to feedback
- Feedback analytics

---

### 4.6 Module: Accounting & Reports (ACC-001 to ACC-011)

#### ACC-001: Revenue Tracking

**Priority:** P0

**Description:** Automatic revenue logging from orders.

**Acceptance Criteria:**

- Auto-log revenue on order confirmation
- Revenue by product, category, customer, period
- Revenue vs. target (configurable)
- Revenue trend (daily, weekly, monthly, yearly)

#### ACC-002: Expense Tracking

**Priority:** P0

**Description:** Log business expenses.

**Acceptance Criteria:**

- Add expense: amount, category, date, description, receipt photo
- Expense categories: Purchase, Rent, Salary, Utilities, Transport, Marketing, Other
- Custom expense categories
- Recurring expenses (auto-log monthly)
- Expense receipt upload

#### ACC-003: Profit & Loss Statement

**Priority:** P0

**Description:** Auto-generated P&L report.

**Acceptance Criteria:**

- P&L by day/week/month/quarter/year
- Revenue breakdown
- Expense breakdown
- Net profit/loss calculation
- Compare to previous period
- Export to PDF and Excel

#### ACC-004: Tax/VAT Compliance

**Priority:** P1

**Description:** Support Bangladesh tax requirements.

**Acceptance Criteria:**

- VAT calculation (if applicable, configurable rate)
- TDS tracking (if applicable)
- Tax invoice generation
- Monthly/quarterly tax summary
- Export for accountant/tax filing
- MANUAL REVIEW REQUIRED for all tax calculations — AI-generated tax logic must be validated by a Bangladeshi tax professional before deployment

#### ACC-005: Cash Flow Report

**Priority:** P1

**Description:** Track money in and out.

**Acceptance Criteria:**

- Cash flow by period
- Opening/closing balance
- Cash in (revenue + other income)
- Cash out (expenses + purchases)
- Cash flow trend
- Export to PDF/Excel

#### ACC-006: Balance Sheet (Simplified)

**Priority:** P2

**Description:** Basic financial position.

**Acceptance Criteria:**

- Assets: Cash, Inventory, Receivables
- Liabilities: Payables, Loans
- Equity: Capital, Retained Earnings
- Simplified for non-accountants
- Export capability

#### ACC-007: Report Scheduling

**Priority:** P2

**Description:** Automated report delivery.

**Acceptance Criteria:**

- Schedule daily/weekly/monthly reports
- Auto-send via WhatsApp or email
- Report format: PDF summary
- Configurable report content

#### ACC-008: Dashboard Widgets

**Priority:** P1

**Description:** Quick financial overview on dashboard.

**Acceptance Criteria:**

- Today's revenue
- This month's revenue vs. last month
- Outstanding payments
- Top expense categories
- Profit margin percentage

#### ACC-009: Multi-Currency Support

**Priority:** P3

**Description:** Handle foreign currency transactions.

**Acceptance Criteria:**

- Base currency: BDT (Bangladeshi Taka)
- Secondary currencies: USD, INR, EUR
- Exchange rate input (manual)
- Auto-conversion in reports

#### ACC-010: Accountant Export

**Priority:** P2

**Description:** Export data for professional accountants and SME owners who need to inspect/alter sales dynamics.

**Acceptance Criteria:**

- **Default export format: Excel (.xlsx)** — not CSV, not PDF
- Full transaction export with **every line item** (order ID, product, SKU, cost price, selling price, quantity, discount, tax, net revenue, timestamp, customer, payment method, delivery status)
- **Formula-ready columns** — no merged cells, no calculated values hardcoded; formulas for subtotals, margins, percentages
- **Filter-ready headers** — standardized column names, data validation dropdowns where applicable
- **Pivot-ready structure** — flat table format, no nested rows, suitable for Excel pivot tables
- **Period comparison sheets** — auto-generated tabs: "This Month", "Last Month", "YoY Comparison", "Custom Range"
- **Customer dynamics sheet** — per-customer: total orders, total revenue, average order value, order frequency (days between), trend direction (increasing/flat/declining), last 6 months history
- **Product profitability matrix** — per-product: units sold, revenue, cost, gross margin %, margin trend, stock turnover, dead stock flag
- **Audit trail sheet** — every data modification: what changed, old value, new value, who changed, timestamp, reason (if provided)
- **Expense detail sheet** — every expense line: category, amount, date, description, receipt photo URL, recurring flag, approved by
- Chart of accounts mapping (for accountant import)
- Journal entry format (for accountant import)
- Date range selection with presets (Today, Yesterday, This Week, This Month, Last Month, This Quarter, This Year, Custom)
- Filter by category, account, product, customer, payment method, employee
- **One-click "Send to my email"** — auto-attaches Excel file, sends via SMTP/WhatsApp document

#### ACC-011: Excel Template Library

**Priority:** P1

**Description:** Pre-built Excel templates for common SME analysis needs.

**Acceptance Criteria:**

- **"Daily Sales Register" template** — every transaction of the day, payment method, cash vs. digital split
- **"Monthly P&L" template** — revenue, expenses, net profit, comparison to target, variance analysis
- **"Customer Aging" template** — who owes what, for how long, payment history, risk flag
- **"Stock Movement" template** — opening stock, purchases, sales, adjustments, closing stock, discrepancy highlight
- **"Employee Performance" template** — per-employee: orders handled, revenue generated, errors, customer feedback (for multi-employee businesses)
- **"Tax Worksheet" template** — VAT-collected, VAT-paid, net VAT payable, TDS deducted, TDS deposited; formatted for NBR submission
- All templates auto-populate from live data with **refresh button** (not static export)
- Templates preserve formulas — SME can alter, add columns, create charts without breaking data link
- **Template customization:** SME can save their modified template as "My Version" for future reuse

---

### 4.7 Module: Dashboard & Analytics (DASH-001 to DASH-008)

#### DASH-001: Home Dashboard

**Priority:** P0

**Description:** Main landing page with key metrics.

**Acceptance Criteria:**

- Today's orders count and revenue
- Pending orders count
- Low stock alerts (count + quick link)
- Unread WhatsApp messages
- Revenue chart (last 7 days)
- Quick action buttons: New Order, Add Product, Send Message

#### DASH-002: Sales Analytics

**Priority:** P1

**Description:** Deep dive into sales performance.

**Acceptance Criteria:**

- Revenue trend (line chart, customizable period)
- Top products (bar chart)
- Top customers (table)
- Sales by channel (WhatsApp number)
- Sales by product category
- Compare periods (e.g., this month vs. last month)

#### DASH-003: Inventory Analytics

**Priority:** P1

**Description:** Inventory insights.

**Acceptance Criteria:**

- Stock levels overview
- Low stock items list
- Out of stock items
- Inventory value trend
- Fast-moving vs. slow-moving items
- Stock turnover rate

#### DASH-004: Customer Analytics

**Priority:** P1

**Description:** Customer insights.

**Acceptance Criteria:**

- New vs. returning customers
- Customer LTV distribution
- Customer acquisition trend
- Churn rate
- Geographic distribution (if address available)

#### DASH-005: Financial Analytics

**Priority:** P1

**Description:** Financial overview.

**Acceptance Criteria:**

- Revenue vs. expenses
- Profit margin trend
- Expense breakdown (pie chart)
- Cash flow chart
- Tax liability estimate

#### DASH-006: Custom Reports

**Priority:** P2

**Description:** Build custom reports with Excel-first export.

**Acceptance Criteria:**

- Select metrics to include from full metric library
- Select date range with presets
- Select grouping (day, week, month, quarter, year)
- Select dimension breakdown (product, category, customer, location, employee, payment method)
- Save report template for reuse
- **Export: Excel (.xlsx) as default** — full detail, formulas, filter-ready
- Export: PDF for presentation/sharing
- Export: CSV for third-party tool import
- **Scheduled report: auto-generate Excel and email/WhatsApp to owner daily/weekly/monthly**

#### DASH-007: Real-Time Updates

**Priority:** P1

**Description:** Dashboard updates without refresh.

**Acceptance Criteria:**

- WebSocket or SSE for real-time updates
- New order notification
- Low stock alert notification
- New message notification
- Configurable notification preferences

#### DASH-008: Mobile Responsiveness

**Priority:** P0

**Description:** Full functionality on mobile browsers.

**Acceptance Criteria:**

- All features usable on 360px width screens
- Touch-friendly UI elements (min 44px tap targets)
- Bottom navigation for key sections
- Swipe gestures where appropriate
- PWA install prompt
- Offline page cache

---

### 4.8 Module: User Management & Settings (USER-001 to USER-008)

#### USER-001: Business Profile

**Priority:** P0

**Description:** Configure business information.

**Acceptance Criteria:**

- Business name, address, phone, email
- Business logo upload
- Business category
- Tax/VAT registration number
- Multiple business locations

#### USER-002: User Accounts

**Priority:** P0

**Description:** Manage system users.

**Acceptance Criteria:**

- Create user accounts (email + password or phone OTP)
- Roles: Owner, Manager, Staff, Accountant
- Role-based permissions
- User activity log
- Deactivate/delete users

#### USER-003: WhatsApp Number Management

**Priority:** P0

**Description:** Connect and manage WhatsApp numbers.

**Acceptance Criteria:**

- Add WhatsApp Business number
- Verify number via OTP
- Disconnect number
- Assign number to user/location
- Number status: Connected, Disconnected, Error

#### USER-004: Notification Settings

**Priority:** P1

**Description:** Configure alerts and notifications.

**Acceptance Criteria:**

- Low stock alert: on/off, threshold, frequency
- New order alert: on/off, sound
- Payment received alert: on/off
- Daily summary: on/off, time
- WhatsApp vs. in-app notification preference

#### USER-005: Tax Settings

**Priority:** P1

**Description:** Configure tax parameters.

**Acceptance Criteria:**

- VAT rate (default 0%, configurable)
- Tax registration number
- Tax invoice prefix/numbering
- Tax-inclusive vs. tax-exclusive pricing
- WARNING: All tax settings must be validated by a qualified Bangladeshi tax professional before use

#### USER-006: Data Backup & Export

**Priority:** P1

**Description:** Data portability and backup.

**Acceptance Criteria:**

- Full data export (JSON/CSV)
- Scheduled automatic backups
- Manual backup trigger
- Backup download
- Data import (for migration)

#### USER-007: Language Settings

**Priority:** P1

**Description:** Interface language.

**Acceptance Criteria:**

- Bengali (default)
- English
- Language switch without logout
- All UI elements translated

#### USER-008: Theme & Appearance

**Priority:** P3

**Description:** Customize dashboard look.

**Acceptance Criteria:**

- Light/dark mode
- Accent color selection
- Dashboard layout customization (future)

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Dashboard load time | <3 seconds | Lighthouse Performance Score >=90 |
| API response time (p95) | <500ms | Server monitoring |
| WhatsApp message processing | <10 seconds end-to-end | Log timestamps |
| Concurrent users | 1,000+ | Load testing |
| Database query time (p95) | <100ms | Query profiling |

### 5.2 Scalability

- Horizontal scaling: Stateless API servers behind load balancer
- Database: PostgreSQL with read replicas for reporting queries
- Caching: Redis for session, frequent queries, and rate limiting
- File storage: Cloud object storage (S3-compatible) for images/documents
- Message queue: Redis/RabbitMQ for async WhatsApp processing

### 5.3 Reliability

| Requirement | Target |
|-------------|--------|
| Uptime | >=99.5% |
| Data durability | 99.999% (automated backups) |
| RTO (Recovery Time Objective) | <4 hours |
| RPO (Recovery Point Objective) | <1 hour |

### 5.4 Security

- Authentication: JWT tokens with refresh rotation
- Authorization: RBAC (Role-Based Access Control)
- Data encryption: AES-256 at rest, TLS 1.3 in transit
- Password policy: Min 8 chars, 1 uppercase, 1 number, 1 special
- Rate limiting: 100 requests/minute per IP, 1,000/hour per user
- Input validation: All user inputs sanitized (SQL injection, XSS prevention)
- Audit logging: All data modifications logged with user, timestamp, old/new values

### 5.5 Compliance

- Data residency: All customer data stored in Bangladesh (or approved jurisdiction)
- Privacy: GDPR-style data rights (export, deletion)
- Tax: All tax-related features must be validated by Bangladeshi tax professionals before deployment
- WhatsApp: Compliant with Meta Business Messaging Policy

### 5.6 Accessibility

- WCAG 2.1 Level AA compliance
- Screen reader support
- Keyboard navigation
- Color contrast ratio >=4.5:1
- Font size adjustable

---

## 6. System Architecture

### 6.1 High-Level Architecture

```
CLIENT LAYER

  Mobile PWA (React)  |  Desktop Web (React)  |  WhatsApp App (User phone)

                        |                       |

                        ▼                       ▼

                    API GATEWAY (Nginx/ALB -> Rate Limit -> JWT Auth -> Router)

                        |

                        ▼

                    APPLICATION LAYER

  Order Service  |  Inventory Service  |  Accounting Service  |  Customer CRM

  WhatsApp Svc   |  AI Service       |  Report Service    |  User Service

                        |

                        ▼

                    DATA LAYER

  PostgreSQL (Primary)  |  Redis (Cache/Queue)  |  SQLite (Local/Offline)  |  Object Storage

                        |

                        ▼

                    EXTERNAL INTEGRATIONS

  Meta WhatsApp API  |  Claude/OpenAI API  |  bKash API (Future)  |  Nagad API (Future)
```

### 6.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + Tailwind CSS + PWA | Mobile-first, fast, offline-capable |
| State Management | Zustand | Lightweight, no boilerplate |
| Backend | Node.js + Express / Python + FastAPI | Team familiarity, ecosystem |
| Database | PostgreSQL 15 | ACID compliance, JSON support, mature |
| Cache | Redis | Session, rate limiting, query cache |
| Queue | BullMQ (Redis-based) | Async job processing, retries |
| AI/NLP — Stage 1 | Rule-based parser (regex + keyword matching) | Free, fast, works offline once queued, handles common order phrasing |
| AI/NLP — Stage 2 | Hosted multimodal LLM API (Claude/GPT-4o class) | Handles text/image/audio cases Stage 1 can't resolve; no GPU infrastructure to operate during MVP; revisit self-hosting only once volume justifies the cost |
| **Customer Memory** | **Preference fields in PostgreSQL** | Simple, no separate service to run; see AI-009 |
| WhatsApp | WhatsApp Business API Cloud | Official, reliable, scalable |
| Hosting | AWS / DigitalOcean / Local BD provider | Data residency compliance |
| Monitoring | Sentry + Grafana + Loki | Error tracking, metrics, logs |

### 6.3 Deployment Architecture

```
PRODUCTION ENV

  CDN (CloudFlare/AWS CF) -> Load Balancer (Nginx/ALB) -> App Server (x3, Docker)

                                                              |

                                    ┌─────────────────────────┘

                                    ▼

  PostgreSQL (Primary + Replica) <-> Redis (Cache + Queue) <-> Object Storage

                                    |

  Backup (Daily + Real-time)    Monitoring (Sentry + Grafana)    CI/CD (GitHub Actions)
```

---

## 7. API Specifications

### 7.1 Authentication

```
POST /api/v1/auth/register
Body: { phone, password, business_name }
Response: { user_id, token, refresh_token }

POST /api/v1/auth/login
Body: { phone, password }
Response: { user_id, token, refresh_token }

POST /api/v1/auth/refresh
Headers: { Authorization: Bearer <refresh_token> }
Response: { token }

POST /api/v1/auth/logout
Headers: { Authorization: Bearer <token> }
Response: { success: true }
```

### 7.2 Orders

```
GET    /api/v1/orders              # List orders (paginated, filterable)
GET    /api/v1/orders/:id         # Get single order
POST   /api/v1/orders              # Create order manually
PUT    /api/v1/orders/:id          # Update order
DELETE /api/v1/orders/:id          # Cancel/delete order
PUT    /api/v1/orders/:id/status   # Update order status
GET    /api/v1/orders/stats        # Order statistics
```

### 7.3 Products/Inventory

```
GET    /api/v1/products           # List products
GET    /api/v1/products/:id       # Get single product
POST   /api/v1/products           # Create product
PUT    /api/v1/products/:id       # Update product
DELETE /api/v1/products/:id       # Archive product
PUT    /api/v1/products/:id/stock # Update stock
GET    /api/v1/products/low-stock # Low stock alerts
POST   /api/v1/products/bulk-import # CSV bulk import
```

### 7.4 Customers

```
GET    /api/v1/customers          # List customers
GET    /api/v1/customers/:id      # Get customer profile
PUT    /api/v1/customers/:id       # Update customer
GET    /api/v1/customers/:id/orders # Customer order history
GET    /api/v1/customers/:id/analytics # Customer analytics
POST   /api/v1/customers/:id/message # Send WhatsApp message
```

### 7.5 WhatsApp Webhook

```
POST /webhooks/whatsapp          # Incoming message webhook
Headers: { X-Hub-Signature-256 }
Body: { object, entry: [{ changes: [{ value: { messages: [...] } }] }] }
Response: 200 OK
```

### 7.6 Reports

```
GET /api/v1/reports/sales?period=monthly&from=2026-01-01&to=2026-01-31
GET /api/v1/reports/profit-loss?period=monthly&from=...&to=...
GET /api/v1/reports/inventory?location_id=...
GET /api/v1/reports/customers?segment=vip
GET /api/v1/reports/export?type=pdf&report=sales&from=...&to=...
```

---

## 8. Database Schema

### 8.1 Core Tables

```sql
-- Users & Businesses

CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    address TEXT,
    logo_url TEXT,
    tax_reg_no VARCHAR(50),
    vat_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- WhatsApp Integration

CREATE TABLE whatsapp_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    waba_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_number_id UUID REFERENCES whatsapp_numbers(id),
    wa_message_id VARCHAR(100) UNIQUE,
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    content TEXT,
    media_url TEXT,
    timestamp TIMESTAMP NOT NULL,
    is_read BOOLEAN DEFAULT false,
    ai_parsed JSONB,
    ai_confidence DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products & Inventory

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    category_id UUID REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100),
    cost_price DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'piece',
    min_stock_level INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    images TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    variant_name VARCHAR(100),
    variant_value VARCHAR(100),
    sku VARCHAR(100),
    cost_price DECIMAL(12,2),
    selling_price DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    location_id UUID REFERENCES locations(id),
    quantity INT DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID REFERENCES inventory(id),
    adjustment_type VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    reason TEXT NOT NULL,
    adjusted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Locations

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customers

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    address TEXT,
    birthday DATE,
    anniversary DATE,
    segment VARCHAR(20) DEFAULT 'new',
    total_orders INT DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_order_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, phone)
);

-- Orders

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    customer_id UUID REFERENCES customers(id),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    delivery_address TEXT,
    delivery_notes TEXT,
    delivery_status VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    whatsapp_number_id UUID REFERENCES whatsapp_numbers(id),
    source_message_id UUID REFERENCES whatsapp_messages(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Accounting

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    receipt_url TEXT,
    expense_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100),
    payment_date TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Log

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance

CREATE INDEX idx_messages_from ON whatsapp_messages(from_number);
CREATE INDEX idx_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX idx_orders_business ON orders(business_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_products_business ON products(business_id);
```

---

## 9. UI/UX Requirements

### 9.1 Design Principles

1. Mobile-First: 80% of users will access via smartphone
2. Bengali-First: All labels, messages, and content in Bengali by default
3. Minimal Clicks: Core actions within 2 taps from home
4. Visual Hierarchy: Revenue and alerts most prominent
5. Familiar Patterns: Mimic WhatsApp UI where possible for comfort

### 9.2 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | #25D366 | WhatsApp green, CTAs, success states |
| Secondary | #128C7E | Headers, active states |
| Accent | #FF6B6B | Alerts, errors, urgent actions |
| Background | #F0F2F5 | Page background |
| Surface | #FFFFFF | Cards, modals |
| Text Primary | #1C1E21 | Headings, body text |
| Text Secondary | #65676B | Labels, hints |
| Border | #DADDE1 | Dividers, input borders |

### 9.3 Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 (Page Title) | Noto Sans Bengali | 24px | 700 |
| H2 (Section) | Noto Sans Bengali | 20px | 600 |
| H3 (Card Title) | Noto Sans Bengali | 16px | 600 |
| Body | Noto Sans Bengali | 14px | 400 |
| Caption | Noto Sans Bengali | 12px | 400 |
| Button | Noto Sans Bengali | 14px | 600 |

### 9.4 Key Screens (ASCII Wireframes)

#### Home Dashboard

```
+--------------------------------+
|  =  BizBot        [bell] [user]|
+--------------------------------+
|  Ajker Bikri (Today's Sales)   |
|  +---------------------------+  |
|  |  Tk 12,500               |  |
|  |  15 Orders               |  |
|  +---------------------------+  |
+--------------------------------+
|  [!] 3 products low stock     |
|  [box] 5 orders pending        |
|  [chat] 8 new messages         |
+--------------------------------+
|  [+ New Order]                 |
+--------------------------------+
|  Weekly Sales [Line Chart]     |
+--------------------------------+
|  [Home] [Orders] [Products]   |
|  [Customers] [Reports] [Set] |
+--------------------------------+
```

#### Order List

```
+--------------------------------+
|  <- Order List    [search] [+] |
+--------------------------------+
|  All | Pending | Confirmed     |
+--------------------------------+
|  #1023  Rahim  Tk3,200        |
|  [yellow] Pending  2h ago     |
+--------------------------------+
|  #1022  Fatima  Tk1,800       |
|  [green] Confirmed  5h ago    |
+--------------------------------+
|  #1021  Karim  Tk5,500        |
|  [blue] Shipped  1d ago       |
+--------------------------------+
```

#### Product Detail

```
+--------------------------------+
|  <- Product Details  [edit][del]|
+--------------------------------+
|  [Product Image]               |
|  Leather Bag - Large Size      |
|  SKU: LB-001                   |
+--------------------------------+
|  Cost Price: Tk2,000           |
|  Selling Price: Tk3,200        |
|  Profit: Tk1,200 (60%)         |
+--------------------------------+
|  Stock: 5 (! Low)               |
|  Minimum: 10                   |
+--------------------------------+
|  [loc] Main Shop: 3            |
|  [loc] Godown: 2               |
+--------------------------------+
```

### 9.5 Offline Behavior

| Feature | Offline Behavior |
|---------|-----------------|
| View dashboard | Cached data from last sync |
| View orders | Cached list, detail from cache |
| View products | Full catalog cached locally |
| Create order | Queue locally, sync when online |
| Update stock | Queue locally, sync when online |
| Add expense | Queue locally, sync when online |
| Send WhatsApp | Queue locally, sync when online |
| View reports | Last synced data |

---

## 10. AI/ML Requirements

### 10.0 AI Stack: Two-Stage Hybrid Parser

**Revised from v1.3:** the earlier draft specified a self-hosted 30B-parameter multimodal model as the primary parsing engine, deployed on the same infrastructure budgeted for the rest of the app. That doesn't reflect what such a model actually costs to run (dedicated GPU infrastructure, not a shared low-cost VPS), so it's replaced here with an approach that matches the stated budget.

**Stage 1 — Rule-based parser (primary, free):**

- Regex and keyword matching for common order phrasing patterns identified during the pilot
- Handles the "[product] [quantity] [variant] lagbe" style of message that likely makes up the majority of real orders
- Runs locally, no external API call, works even when queued offline

**Stage 2 — Hosted multimodal LLM API (fallback, paid per call):**

- Used only when Stage 1 confidence is low, or the message contains an image or voice note
- A general-purpose hosted API (e.g., Claude or GPT-4o class model via its standard API) rather than a self-hosted model — no GPU infrastructure to provision or maintain during MVP
- Fine-tuning or a self-hosted smaller open model (e.g., a 2–9B class model) can be evaluated later, once real order volume and Stage 1 resolution rate are known and justify the infrastructure investment

**Critical open question to resolve in the pilot:** what fraction of real orders Stage 1 can resolve without ever calling Stage 2. This ratio directly determines per-order AI cost and therefore whether the pricing in the whitepaper's Section 6 holds up. Track this metric from day one of the pilot.

### 10.1 Text Order Extraction Model

**Input:** Raw WhatsApp message text (Bengali/Banglish)

**Output:** Structured JSON with confidence scores

```json
{
  "intent": "order",
  "confidence": 0.94,
  "entities": {
    "product": {
      "value": "black leather bag",
      "confidence": 0.92,
      "matched_product_id": "uuid"
    },
    "quantity": {
      "value": 2,
      "confidence": 0.98,
      "unit": "piece"
    },
    "price": {
      "value": 3200,
      "currency": "BDT",
      "confidence": 0.85
    },
    "delivery_address": {
      "value": "Mohammadpur, Dhaka",
      "confidence": 0.78
    }
  },
  "needs_review": false
}
```

### 10.2 Training Data Requirements

| Data Type | Quantity | Source |
|-----------|----------|--------|
| Annotated text order messages | 1,000+ | SME pilot participants |
| Product catalog entries | 500+ | SME product databases |
| Customer conversation threads | 500+ | Anonymized SME data |
| Product photos with matched products | 300+ | SME catalog + owner labeling |
| Voice notes with verified transcripts | 200+ | SME pilot participants |
| Handwritten Bengali lists | 100+ | SME pilot participants |
| Common Bengali e-commerce phrases | 200+ | Crowdsourced |

### 10.3 Model Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Intent classification accuracy (text) | >=95% | Test set evaluation |
| Product name extraction F1 (text) | >=90% | Test set evaluation |
| Quantity extraction accuracy (text) | >=98% | Test set evaluation |
| Product catalog match accuracy (vision) | >=85% | Test set evaluation |
| Audio transcription accuracy (Bengali) | >=90% | Test set evaluation |
| False positive rate (auto-confirm) | <5% | Production monitoring |
| Text response time (Stage 2 API) | <2s | API latency |
| Vision response time (Stage 2 API) | <4s | API latency |
| Audio response time (Stage 2 API) | <5s | API latency |

### 10.4 Vision Order Processing (Hosted Multimodal API)

**Input:** Product photo (JPEG/PNG), optional text caption

**Output:** Matched product(s) from catalog with confidence scores

**Acceptance Criteria:**

- [ ] Accept image messages from WhatsApp (max 5MB)
- [ ] Compress/resize to 1024px before sending to the API, to control per-call cost
- [ ] Hosted multimodal API processes the image and returns a description
- [ ] Generate image embedding for vector similarity search
- [ ] Query pgvector index for top-3 nearest product matches
- [ ] Return match confidence (0-100%) per candidate
- [ ] Confidence >= 70%: pre-fill the order with the top match and prompt the owner for one-tap confirmation (do not auto-confirm without owner action — a wrong silent match corrupts stock and revenue records)
- [ ] Confidence < 70%: flag for manual review, show image + top-3 candidates in dashboard
- [ ] SME owner taps correct product -> order created, (image, product) pair logged as training data (with participant consent, per Appendix F)
- [ ] Handle competitor/inspiration photos (no exact match) -> suggest similar products or manual entry
- [ ] Handle physical item photos -> identify item type, condition, approximate specs

### 10.5 Audio Order Processing (Hosted Speech API)

**Input:** WhatsApp voice note (OGG/OPUS)

**Output:** Transcribed text + extracted order JSON

**Acceptance Criteria:**

- [ ] Accept voice note messages from WhatsApp
- [ ] Pass audio to a hosted speech-to-text API with Bengali support (evaluate available options during technical spike — do not assume a specific model in advance)
- [ ] Transcribe Bengali/Banglish speech to text
- [ ] Feed transcribed text into standard AI-001 order extraction pipeline
- [ ] Confidence scoring applies to transcription + extraction combined
- [ ] Fallback to manual review if transcription confidence < 80%
- [ ] Store audio + transcript + correction as training data

### 10.6 Handwritten List OCR (Hosted Vision API + PaddleOCR)

**Input:** Photo of handwritten Bengali list

**Output:** Structured bulk order items

**Note:** this is a P3/low-priority, post-MVP capability — handwritten Bengali OCR is a genuinely hard problem and should not be treated as a solved input to MVP scope or cost estimates.

**Acceptance Criteria:**

- [ ] Accept document/photo messages containing handwritten lists
- [ ] Hosted vision API extracts structure and layout
- [ ] PaddleOCR Bengali microservice cross-validates script accuracy where available
- [ ] Combined output: line items with product name, quantity, price (if listed)
- [ ] Bulk order creation from extracted line items
- [ ] Flag ambiguous items for manual review

### 10.7 Fallback Strategy

When AI confidence < 85% (text), < 70% (vision), or < 80% (audio):

1. Flag message for manual review in dashboard
2. Send WhatsApp reply: "Apnar order peyechi. Ektu somoy lagbe confirm korte." (for text/audio); for images: "Apnar photo peyechi. Ektu somoy lagbe product match korte."
3. Notify SME owner via dashboard + push notification
4. SME confirms/corrects extraction from dashboard
5. Store correction as training data

---

## 11. Security Requirements

### 11.1 Authentication Flow

```
User opens app
    |
Check local JWT token
    |
Valid? -> Load dashboard
    |
Expired? -> Refresh with refresh_token
    |
Invalid? -> Redirect to login
    |
Login with phone + password
    |
Server validates -> Issue new JWT + refresh_token
    |
Store tokens securely (encrypted localStorage)
```

### 11.2 Authorization Matrix

| Feature | Owner | Manager | Staff | Accountant |
|---------|-------|---------|-------|-----------|
| View Dashboard | Yes | Yes | Yes | Yes |
| Create Order | Yes | Yes | Yes | No |
| Edit Order | Yes | Yes | No | No |
| Cancel Order | Yes | Yes | No | No |
| Manage Products | Yes | Yes | No | No |
| Adjust Stock | Yes | Yes | Yes | No |
| View Reports | Yes | Yes | No | Yes |
| Export Data | Yes | Yes | No | Yes |
| Manage Users | Yes | No | No | No |
| Change Settings | Yes | No | No | No |
| View WhatsApp Messages | Yes | Yes | Yes | No |
| Send WhatsApp Messages | Yes | Yes | Yes | No |

### 11.3 Data Protection

- All passwords hashed with bcrypt (cost factor 12)
- JWT tokens expire after 1 hour, refresh tokens after 7 days
- API rate limiting: 100 req/min per IP, 1,000/hour per user
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding
- CSRF protection for state-changing operations
- File upload validation (type, size, malware scan)

---

## 12. Testing Strategy

### 12.1 Testing Levels

| Level | Scope | Tools | Owner |
|-------|-------|-------|-------|
| Unit Tests | Individual functions/components | Jest, Pytest | Developers |
| Integration Tests | API endpoints, database | Supertest, Postman | QA |
| E2E Tests | Full user flows | Cypress, Playwright | QA |
| Performance Tests | Load, stress | k6, Artillery | DevOps |
| Security Tests | Vulnerability scanning | OWASP ZAP, Burp Suite | Security |
| UAT | Real SME validation | Manual | Product |

### 12.2 Critical Test Scenarios

**Order Flow:**

1. Customer sends order message -> AI extracts -> Order created -> Stock deducted -> Confirmation sent
2. Customer sends ambiguous message -> AI flags -> Manual review -> SME corrects -> Order created
3. Order cancellation -> Stock restored -> Customer notified

**Inventory Flow:**

1. Stock reaches minimum -> Alert sent -> SME restocks -> Stock updated
2. Multi-location transfer -> Stock moves -> Audit log created
3. Bulk import -> Validation -> Import success/failure report

**Accounting Flow:**

1. Order confirmed -> Revenue logged -> P&L updated
2. Expense added -> Cash flow updated -> Report reflects change
3. Month-end -> Tax report generated -> Export to PDF

### 12.3 Performance Test Targets

| Scenario | Target |
|----------|--------|
| 100 concurrent users | Dashboard load <3s |
| 1,000 orders/day | Message processing <10s end-to-end |
| 10,000 products | Search <500ms |
| 50,000 customers | List load <2s |
| Backup restore | <4 hours for full dataset |

---

## 13. Release Criteria

### 13.1 MVP Release Checklist

- [ ] All P0 requirements implemented and tested
- [ ] Order extraction accuracy >=90% on test set
- [ ] Dashboard load time <3s on 3G connection
- [ ] Zero critical security vulnerabilities
- [ ] 10 pilot SMEs onboarded and actively using
- [ ] Bengali UI 100% complete
- [ ] Offline mode functional for core features
- [ ] Backup and disaster recovery tested
- [ ] Documentation complete (user guide, admin guide)
- [ ] Support channel established (WhatsApp hotline)

### 13.2 Post-MVP Priorities

| Priority | Feature | Target Release |
|----------|---------|---------------|
| P1 | bKash/Nagad payment integration | v1.1 (Month 3) |
| P1 | Multi-location full support | v1.1 (Month 3) |
| P2 | Advanced analytics (forecasting) | v1.2 (Month 5) |
| P2 | Employee activity tracking | v1.2 (Month 5) |
| P2 | Barcode/QR scanning | v1.2 (Month 5) |
| P3 | Multi-currency | v1.3 (Month 7) |
| P3 | Customer feedback system | v1.3 (Month 7) |
| P3 | AI-powered business advisor | v2.0 (Month 12) |
| P2 | Extended customer memory (price history, address changes, seasonal patterns) | v2.0 (Month 12) |

---

## 14. Appendices

### Appendix A: Bengali UI Glossary

| English | Bengali | Context |
|---------|---------|---------|
| Dashboard | Dashboard | Navigation |
| Orders | Order | Navigation |
| Products | Product | Navigation |
| Customers | Customer | Navigation |
| Reports | Report | Navigation |
| Settings | Settings | Navigation |
| Inventory | Stock | Product management |
| Revenue | Bikri | Accounting |
| Expense | Khoroch | Accounting |
| Profit | Labh | Accounting |
| Loss | Lokkhon | Accounting |
| Stock | Mojut | Inventory |
| Low Stock | Kom Stock | Alerts |
| Order Confirmed | Order Confirmed | Order status |
| Pending | Pending | Order status |
| Delivered | Delivered | Order status |
| Cancelled | Batil | Order status |
| Add | Jog Korun | Actions |
| Edit | Edit | Actions |
| Delete | Mochun | Actions |
| Save | Songrokkhon | Actions |
| Cancel | Batil | Actions |
| Search | Khujun | Actions |
| Filter | Filter | Actions |
| Export | Export | Actions |
| Today | Aj | Date |
| Yesterday | Gtokal | Date |
| This Week | Ei Saptah | Date |
| This Month | Ei Mash | Date |
| Total | Mot | Summary |
| Amount | Poriman | General |
| Price | Mullo | Product |
| Quantity | Poriman | Order |
| Customer | Kreta | CRM |
| Phone | Phone | Contact |
| Address | Thikana | Delivery |
| Payment | Payment | Transaction |
| Delivery | Delivery | Fulfillment |
| Notification | Notification | Alerts |
| Success | Sofol | Status |
| Error | Truti | Status |
| Warning | Sotorkota | Status |

### Appendix B: WhatsApp Message Templates (Pre-approved)

**Template 1: Order Confirmation**

```
Assalamualaikum {{customer_name}}!

Apnar order #{{order_id}} confirm hoyeche [check]

[box] Product: {{product_list}}

[money] Total: Tk{{total_amount}}

[calendar] Delivery: {{delivery_estimate}}

Dhonnobad!

{{business_name}}
```

**Template 2: Stock Alert**

```
[warning] Sotorkota!

{{product_name}} er stock kome geche.

Bortoman stock: {{current_stock}}ti

Minimum stock: {{min_stock}}ti

Doya kore restock korun.
```

**Template 3: Payment Reminder**

```
Priyo {{customer_name}},

Apnar order #{{order_id}} er payment baki ache.

Baki poriman: Tk{{due_amount}}

Due date: {{due_date}}

Payment korte: {{payment_link}}

Dhonnobad!
```

**Template 4: Delivery Update**

```
Assalamualaikum {{customer_name}}!

Apnar order #{{order_id}} ekhon {{status}}.

{{#if tracking_url}}

Track korun: {{tracking_url}}

{{/if}}

Dhonnobad!

{{business_name}}
```

**Template 5: Daily Summary**

```
[chart] Ajker Sarangsho

[money] Mot Bikri: Tk{{total_revenue}}

[box] Mot Order: {{total_orders}}ti

[people] Notun Customer: {{new_customers}}jon

[warning] Kom Stock: {{low_stock_count}}ti Product

Bistarito dekhte dashboard check korun.
```

### Appendix C: Third-Party Services & Costs

**Note on v1.3:** the previous version of this table estimated $100–200/month for AI order parsing across 100 SMEs. That's very likely understated once real order volume (15–50 orders/day/SME × 100 SMEs, with a meaningful share needing an image or audio call) is priced against actual per-token/per-call API rates. The range below is a wider, more honest estimate — it still needs to be replaced with a real number from a small-scale pilot before being used in financial planning.

| Service | Purpose | Estimated Monthly Cost (at 100 SMEs) |
|---------|---------|-----------------------------------|
| WhatsApp Business API | Messaging (conversation-based pricing) | $50-150 (get a current Meta quote — this changes periodically) |
| Hosted LLM API (Stage 2 only) | Order parsing for ambiguous/image/audio cases | $300-800 — **wide range because it depends entirely on the Stage 1 resolution rate, which is unknown until piloted** |
| AWS/DigitalOcean Hosting | Infrastructure | $100-150 |
| PostgreSQL (managed) | Database | $50-100 |
| Redis (managed) | Cache/Queue | $30-50 |
| S3-Compatible Storage | File storage | $20-40 |
| CloudFlare | CDN + Security | $20 |
| Sentry | Error tracking | $26 |
| **Total** | | **~$596-1,336/month — validate the Stage 2 LLM line item before trusting this total** |

**Customer preference memory**: stored in the existing PostgreSQL database — no separate service or additional infrastructure cost.

### Appendix D: Development Team Structure (MVP)

| Role | Count | Responsibilities |
|------|-------|-----------------|
| Full-Stack Developer | 1 (Lead) | Backend API, database, architecture |
| Frontend Developer | 1 | React PWA, UI/UX implementation |
| AI/ML Engineer (Part-time) | 0.5 | NLP model, prompt engineering |
| QA Engineer | 0.5 | Testing, automation |
| DevOps (Part-time) | 0.25 | CI/CD, infrastructure |
| Product Manager | 0.5 | Requirements, validation, roadmap |

**Total FTE:** ~3.25

**Timeline:** 8 weeks for MVP

### Appendix E: Risk Register (Technical)

| ID | Risk | Probability | Impact | Mitigation | Owner |
|----|------|------------|--------|-----------|-------|
| T-001 | WhatsApp API rate limits | Medium | High | Implement queue + exponential backoff | Backend |
| T-002 | AI parser fails on dialects | Medium | High | Two-stage hybrid (rule-based + hosted LLM API); revisit fine-tuning/self-hosted model once pilot data justifies it | AI/ML |
| T-003 | Database performance degradation | Low | High | Indexing, read replicas, query optimization | Backend |
| T-004 | Data loss due to outage | Low | Critical | Automated backups, multi-AZ deployment | DevOps |
| T-005 | Security breach | Low | Critical | Regular audits, penetration testing, encryption | Security |
| T-006 | PWA offline sync conflicts | Medium | Medium | Conflict resolution strategy, last-write-wins | Frontend |
| T-007 | Third-party API downtime | Medium | Medium | Circuit breaker pattern; queue and retry messages, fall back to Stage 1 rule-based parsing and flag for manual review rather than blocking | Backend |
| T-008 | Mobile browser compatibility | Medium | Low | Cross-browser testing, progressive enhancement | Frontend |

### Appendix F: Compliance Checklist

- [ ] Data Residency: All customer data stored in Bangladesh or approved jurisdiction
- [ ] WhatsApp Business Policy: Compliant with Meta's Business Messaging Policy
- [ ] Tax Compliance: All tax calculations reviewed by Bangladeshi tax professional
- [ ] AI Model Compliance: hosted LLM API provider's terms of service reviewed for commercial use and data handling; training-data usage rights confirmed with SME pilot participants via explicit consent
- [ ] Memory Compliance: customer preference data stored in the primary Bangladesh-hosted PostgreSQL database alongside the rest of customer data; per-business isolation enforced via `business_id` scoping
- [ ] Privacy Policy: GDPR-style data rights (access, export, deletion)
- [ ] Terms of Service: Clear terms for SME users
- [ ] SSL/TLS: All traffic encrypted with TLS 1.3
- [ ] Password Policy: Enforced strong passwords
- [ ] Audit Logging: All data modifications logged
- [ ] Backup Policy: Daily automated backups with 30-day retention
- [ ] Incident Response Plan: Documented and tested

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-07-05 | Product Team | Initial draft |
| 1.3 | 2026-07-05 | Product & Engineering Team | Full functional/technical spec, AI architecture, database schema |
| 1.4 | 2026-07-06 | Product & Engineering Team | Corrected AI stack to a realistic two-stage hybrid, fixed inflated cost estimates in Appendix C, removed duplicated content, clarified that handwritten OCR (10.6) and full automatic-confirm on image match (10.4) are lower-confidence/lower-priority capabilities, not core MVP guarantees |
| 1.0 (final) | TBD | TBD | Pending pilot validation |

**Note on team sizing (Appendix D):** the 8-week MVP timeline with ~3.25 FTE is tight for the full scope in Sections 4 and 10 — WhatsApp integration, AI parsing (even in simplified two-stage form), inventory, accounting/tax fields, CRM, dashboard, and Excel export are each nontrivial. Consider either trimming P2/P3 items from the 8-week scope or extending the timeline; validate against a real sprint-planning exercise before committing to 8 weeks externally.

---

**Next Steps:**

1. Review with technical team for feasibility assessment, including a realistic timeline check against Appendix D team sizing
2. Validate with 3-5 target SME users (persona validation) and use that data to replace the unsourced market statistics in the companion whitepaper
3. Build a small technical spike measuring Stage 1 (rule-based) resolution rate on real sample messages, before finalizing the pricing tiers that assume a particular AI cost per order
4. Create detailed sprint plan for MVP
5. Set up development environment and CI/CD pipeline
6. Begin WhatsApp Business API application process

---

*This PRD is a living document. All AI-generated components (especially tax compliance and legal requirements) must be validated by qualified professionals before deployment. The development team should treat this as a starting point for discussion, not a final specification.*
