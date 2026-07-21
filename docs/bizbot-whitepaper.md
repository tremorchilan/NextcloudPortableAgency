# Whitepaper: BizBot — WhatsApp-First Commerce & Inventory Platform for Bangladeshi SMEs

**Version:** 1.4

**Date:** July 6, 2026

**Author:** Strategic Planning Document

**Classification:** Internal — For Development Team & Validation

**Changes from v1.3:** Replaced unverified AI infrastructure claims with a realistic hybrid stack; reframed market statistics as pilot-stage assumptions pending sourcing; reconciled the pricing model with actual recurring costs; removed duplicated content; corrected version history.

---

## 1. Executive Summary

Bangladesh's SME sector is large, WhatsApp-dependent for sales, and largely undigitized outside a handful of sectors like plastics manufacturing. The figures commonly cited for this market (millions of SMEs, majority relying on manual order tracking) are directionally credible but **have not yet been independently sourced or verified for this document** — see the flagged assumptions in Section 2.1. They should be treated as working hypotheses to validate during the pilot, not settled facts to build a funding pitch on.

**BizBot** is a lightweight, WhatsApp-native commerce and inventory platform for this market. It extracts orders from customer chat messages, tracks inventory, generates basic accounting reports, and provides a simple dashboard — without asking SMEs to change their existing sales channel.

This version of the whitepaper is deliberately more conservative than v1.3 on two fronts: the AI stack (described honestly rather than aspirationally) and the business model (recurring costs are now reflected in recurring, not one-time, revenue). The goal is a document that survives technical and financial due diligence.

---

## 2. Market Opportunity

### 2.1 The SME Landscape in Bangladesh — Assumptions Requiring Validation

| Metric | Figure (working assumption) | Status |
|--------|--------|--------|
| Total SMEs | ~5.6 million (rural areas alone) | **Needs citation** — verify against Bangladesh Bureau of Statistics / SME Foundation Bangladesh data |
| SME Contribution to GDP | ~25% | **Needs citation** |
| SME Employment | ~80% of non-farm employment | **Needs citation** |
| Digital Adoption Rate | Low outside plastics sector | Directionally plausible, not independently verified |
| Primary Sales Channel | WhatsApp (informal, manual) | To be confirmed via pilot outreach |
| Customer Loss Rate | Cited elsewhere as "87% losing customers daily" | **Drop this figure** until a source is found — it is too precise to state without one |
| Digital Marketing Strategy | Cited elsewhere as "13% have one" | **Needs citation** |

**Recommendation:** before this document circulates outside the immediate team, either find primary sources (BBS, SME Foundation, World Bank enterprise surveys, Bangladesh Bank SME reports) for each figure above, or replace them with ranges qualified as "informal estimates" and validate against the 10-SME pilot in Section 6.3.

### 2.2 Sector-Specific Pain Points (Illustrative — Based on Informal Observation, Not Survey Data)

| Sector | Key Pain Point | Current Workaround |
|--------|---------------|-------------------|
| Leather Goods | No POS or order management system | Facebook posts + manual tracking |
| Light Engineering | Excel-based accounting, no digital marketing | Spreadsheets + word-of-mouth |
| Designer Goods | Social media sales with no inventory system | Memory-based stock tracking |
| Agro-Processed Food | Excel/Tally for accounting, no automation | Manual ledgers |
| Electrical/Electronics | No e-commerce integration | WhatsApp catalog images |
| Furniture | Traditional methods, minimal digital presence | Physical showrooms only |

These should be confirmed with actual pilot participants in Phase 1 (Section 6.3) before being used as the basis for product prioritization.

### 2.3 The Digital Adoption Gap

Reported barriers to ICT adoption among Bangladeshi manufacturing SMEs (plausible, still pending sourcing):

1. **Financial constraints** — SMEs cannot afford enterprise software
2. **Technical literacy gap** — complex tools are unusable without training
3. **Behavior change resistance** — SMEs are reluctant to abandon WhatsApp as a channel
4. **Lack of localized solutions** — most existing tools are English-only and foreign-designed

### 2.4 Why WhatsApp-First Is the Working Strategy

- WhatsApp is reportedly the dominant sales channel for a large share of target SMEs (to confirm in pilot)
- SMEs are unlikely to migrate to an unfamiliar platform for order-taking
- WhatsApp Business API is accessible in Bangladesh today
- Working on top of an existing channel means no new habit to build
- This is a reasonable starting hypothesis, but "the only viable strategy" is a stronger claim than the evidence in this document supports — competitors like ShopUp show a marketplace-first model can also gain traction, just with a different value proposition

---

## 3. Competitive Landscape

### 3.1 Direct Competitors

| Competitor | Offering | Weakness vs. BizBot |
|-----------|----------|---------------------|
| **bKash Merchant** | Payment collection | No inventory, no order management |
| **ShopUp** | B2B marketplace | Forces SMEs onto new platform, has capital and distribution BizBot lacks |
| **Pickaboo/Daraz** | E-commerce marketplace | High fees, complex onboarding, not SME-native |
| **Tally/QuickBooks** | Accounting software | Too complex, English-only, no WhatsApp integration |
| **Generic POS Systems** | Retail POS | Expensive hardware, no WhatsApp orders |

Note: ShopUp in particular is well-funded and could add WhatsApp order capture faster than BizBot could build distribution. Speed and depth of Bengali-language UX are the realistic differentiators, not a permanent technical moat.

### 3.2 Indirect Competitors

- **Facebook Shops**: Free but no inventory management, no order tracking
- **Excel/Google Sheets**: Free but error-prone, not scalable, no automation
- **Pen & Paper**: Zero cost but maximum inefficiency

### 3.3 Realistic Differentiators (Not a Permanent Moat)

1. **Bengali-first UX**: interface, messages, and reports in Bengali
2. **Zero behavior change**: works on top of existing WhatsApp usage
3. **Offline-capable core workflows**: order viewing, inventory browsing, and manual entry work without connectivity — AI-based parsing requires a network connection (see Section 5, corrected from earlier drafts that implied full offline AI)
4. **Hybrid pricing**: lower upfront cost than SaaS competitors, structured to actually cover recurring infrastructure and AI costs (see Section 6.1 — this is revised from v1.3's pure one-time-fee model, which did not match the underlying cost structure)
5. **Local tax context**: built with Bangladesh VAT/tax fields in mind, but all tax logic requires sign-off from a qualified Bangladeshi tax professional before customers rely on it
6. **Excel-native reporting**: exports in .xlsx with live formulas for owners and accountants who already work in Excel

None of these are defensible indefinitely — a well-funded competitor could replicate the product surface quickly. The realistic moat is execution speed, trust built during the pilot, and depth of Bengali-language support.

---

## 4. Product Vision & Value Proposition

### 4.1 Vision Statement

> "Every Bangladeshi SME, regardless of size or technical skill, deserves a digital nervous system that turns their WhatsApp conversations into organized business operations."

### 4.2 Core Value Proposition

**For SME Owners:**

- Stop losing orders buried in WhatsApp chats
- Know what's in stock without manually counting
- Get a basic profit/loss picture without an accountant
- Generate reports that speed up (but do not replace) professional tax filing
- Inspect and adjust sales data directly in Excel — no lock-in

**For SME Customers:**

- Faster order confirmations
- Accurate stock availability
- Professional receipts and tracking

### 4.3 Target User Personas

#### Persona 1: "Rahim — Leather Goods Artisan"

- Age: 34, Dhaka outskirts
- Business: Custom leather bags and wallets
- Sales: 15–20 orders/day via WhatsApp
- Current process: Screenshots orders, writes in a notebook, checks stock mentally
- Pain: Frequently oversells, forgets custom requests, loses repeat customers
- Tech comfort: Uses WhatsApp and Facebook, intimidated by computers

#### Persona 2: "Fatima — Agro-Food Processor"

- Age: 41, Rural Mymensingh
- Business: Packaged spices and pickles
- Sales: 30–40 orders/day, ~50% repeat customers
- Current process: Excel for accounting, WhatsApp for orders, no link between the two
- Pain: Cannot tell which products are profitable, stockouts of popular items
- Tech comfort: Comfortable with smartphone, uses bKash regularly

#### Persona 3: "Karim — Electronics Retailer"

- Age: 29, Chattogram
- Business: Mobile accessories and small electronics
- Sales: 50+ orders/day across multiple WhatsApp numbers
- Current process: 3 employees manage 3 phones; chaos at month-end
- Pain: No centralized view, suspected employee theft, tax-filing burden
- Tech comfort: Tech-savvy, wants automation but can't afford enterprise tools

*(These personas are illustrative composites, not documented interview subjects. Section 6.3's pilot should replace or validate them with real participant data.)*

---

## 5. Technical Architecture

### 5.1 System Overview (Realistic Version)

```
┌─────────────────────────────────────────────────────────────┐
│                    BIZBOT ARCHITECTURE v1.4                  │
├─────────────────────────────────────────────────────────────┤
│  Customer (Mobile) → WhatsApp Business (SME) → WhatsApp API  │
│                                                    │           │
│                                                    ▼           │
│                                          Message Processor     │
│                                          (Router + Queue)      │
│                                                    │           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                CORE PLATFORM (Cloud)                     │ │
│  │  Order Engine │ Inventory DB │ Accounting │ Reports      │ │
│  │  Customer CRM │ Product Catalog │ Tax/VAT Fields         │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │ AI PARSING LAYER (network-dependent)              │   │ │
│  │  │  Stage 1: Rule-based parser (fast, free, offline- │   │ │
│  │  │           capable) — handles common patterns      │   │ │
│  │  │  Stage 2: Hosted multimodal LLM API (text/image/  │   │ │
│  │  │           audio) — handles ambiguous cases only    │   │ │
│  │  │  Optional Stage 3 (post product-market fit): self- │   │ │
│  │  │           hosted small open model on rented GPU,   │   │ │
│  │  │           if volume justifies the infra cost        │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                          │                                     │
│  DATA LAYER: PostgreSQL (primary) │ Redis (cache/queue) │      │
│              SQLite (local/offline) │ S3-compatible storage    │
│                          │                                     │
│  SME DASHBOARD (Mobile-first PWA): Orders, Inventory,          │
│  Analytics, Tax Reports, Customer Insights, Excel Exports      │
└─────────────────────────────────────────────────────────────┘
```

**What changed from v1.3:** the earlier architecture described a self-hosted 30B-parameter multimodal model ("NVIDIA NIM + Gemma 4 31B") running on the same low-cost VPS as the rest of the stack, alongside a claim of full offline AI parsing. Neither is realistic: a model at that scale needs dedicated GPU infrastructure, and any cloud-model call requires connectivity. The revised architecture is honest about this — a two-stage parser (free rule-based first, paid API second) that actually matches the stated infrastructure budget, plus a clearly-scoped offline mode limited to non-AI functions (viewing orders/inventory, manual data entry, syncing when connectivity returns).

### 5.2 Component Specifications

#### 5.2.1 WhatsApp Integration Layer

- WhatsApp Business API (Cloud API via Meta)
- Webhook-based message ingestion
- Supported message types: text, images, voice notes, documents
- Automated order confirmation, stock availability, delivery updates

#### 5.2.2 AI Message Parser (Order Extraction Engine)

- **Input:** Raw WhatsApp messages in Bengali (Bangla script + Romanized)
- **Output:** Structured order objects (product, quantity, price, customer info)
- **Stage 1 — Rule-based parser:** regex/keyword matching for common order phrasing ("[product] [quantity] [color] lagbe"); free, fast, works offline once a message is queued
- **Stage 2 — Hosted LLM API:** used only when Stage 1 confidence is low or the message includes an image/audio; a general-purpose multimodal API (e.g., Claude or GPT-4o class) rather than a self-hosted large model, at least through the pilot and early scale phase
- **Fallback:** anything below a confidence threshold is flagged for manual owner review in the dashboard, never silently auto-confirmed
- **Training data:** target of 1,000+ annotated real SME WhatsApp conversations, collected with pilot participant consent

#### 5.2.3 Inventory Management System

- SQLite (local) + PostgreSQL (cloud sync)
- Real-time stock deduction on order confirmation
- Low-stock alerts via WhatsApp
- Multi-location support (godown, shop, transit)
- Unit management (piece, kg, dozen, box)
- Full offline capability for viewing and manual entry; sync when connection returns

#### 5.2.4 Accounting Module

- Revenue tracking per product/category
- Expense logging
- Profit/loss per order and per period
- Cash flow statement, basic balance sheet
- VAT/TDS fields present, but **all tax logic requires validation by a licensed Bangladeshi tax professional before any customer relies on it for filing**
- Excel-first exports (default), PDF summary, CSV for portability

#### 5.2.5 Customer CRM

- Auto-created customer profiles from WhatsApp number
- Purchase history, repeat-customer identification
- Customer lifetime value (CLV) calculation
- Optional preference memory (e.g., "usually orders the black variant") stored per business, exportable, and deletable on request

#### 5.2.6 Dashboard (Mobile-First Web App)

- React + Tailwind CSS (PWA)
- Views: Home, Orders, Inventory, Customers, Reports, Settings

### 5.3 Data Flow: A Typical Text Order

```
1. Customer sends WhatsApp: "Bhai, 2 ta leather bag lagbe, black color er. Price koto?"
2. WhatsApp API → Message Processor
3. Stage 1 rule-based parser attempts extraction:
   - Product: "leather bag", Quantity: 2, Variant: "black"
   - If confidence is high, skip Stage 2 (no API cost)
   - If ambiguous, send to Stage 2 hosted LLM for extraction
4. System checks inventory: Black leather bag — 5 in stock
5. Auto-reply to customer confirms availability and price
6. Customer confirms → inventory deducted, revenue logged, owner notified
7. Dashboard updates in near-real-time
```

### 5.3b Data Flow: A Typical Image Order

```
1. Customer sends a product photo via WhatsApp
2. Image is downloaded, compressed, and stored (S3-compatible)
3. Sent to the hosted multimodal LLM API for description + embedding
4. Vector similarity search (pgvector) against the product catalog
5. Match confidence >= 70%: pre-fill the order for owner one-tap confirmation
   (never auto-confirm on image match alone — the owner must confirm)
6. Match confidence < 70%: flagged for manual review with top-3 candidates shown
7. Owner's correction is stored to improve future matching
```

### 5.3c Data Flow: A Typical Voice Order

```
1. Customer sends a WhatsApp voice note
2. Audio is downloaded and sent to a hosted speech-to-text + extraction API
3. Transcription confidence below threshold → flagged for manual review
4. Otherwise, transcribed text flows through the same pipeline as text orders
```

### 5.4 Security & Privacy

- End-to-end encryption for WhatsApp messages (provided by WhatsApp itself)
- Data residency: customer data stored in Bangladesh or an approved jurisdiction
- Data export and deletion available on request
- Role-based access control (owner, manager, staff, accountant)
- Daily automated backups, 30-day retention

---

## 6. Business Model

### 6.1 Revenue Streams (Revised: Hybrid Model)

The v1.3 draft proposed pure one-time pricing while the underlying cost structure (WhatsApp API fees, LLM API calls, hosting) is recurring. That mismatch is corrected here.

| Stream | Description | Price Point |
|--------|-------------|-------------|
| **Setup/License Fee** | One-time onboarding, initial configuration, data migration | ৳10,000–25,000 |
| **Monthly Platform Fee** | Covers hosting, WhatsApp API pass-through, and AI parsing costs | ৳500–1,500/month depending on tier |
| **Annual Support** | Updates, backup, priority support | ৳3,000/year |
| **Customization** | Tailored features for specific sectors | ৳10,000–50,000/project |
| **White-Label** | License to IT shops for resale | ৳50,000–100,000 |

This still undercuts subscription-only competitors on upfront cost while actually covering marginal cost per customer as usage scales — the thing the one-time model in v1.3 did not do.

### 6.2 Pricing Tiers

| Tier | Setup Fee | Monthly Fee | Features |
|------|-------|----------|----------|
| **Starter** | ৳10,000 | ৳500/month | 1 WhatsApp number, 100 products, basic reports, rule-based parsing priority |
| **Professional** | ৳18,000 | ৳900/month | 3 WhatsApp numbers, unlimited products, advanced analytics, higher AI-parsing quota |
| **Enterprise** | ৳25,000 | ৳1,500/month | Unlimited numbers, multi-location, API access, priority support |

**Before finalizing these numbers:** calculate actual cost-per-order (WhatsApp conversation fee + LLM tokens per Stage-2 call) at realistic order volumes per persona (15–50 orders/day) and confirm the monthly fee covers it with margin. The figures above are placeholders pending that calculation, not final prices.

### 6.3 Go-to-Market Strategy

#### Phase 1: Pilot (Months 1–2)

- **Target**: 10 SMEs in one sector (e.g., leather goods in Dhaka)
- **Method**: Direct outreach, free or heavily discounted pilot in exchange for feedback and testimonials
- **Goal**: Validate product-market fit, refine the parser, and replace every unsourced market assumption in Section 2 with real data from these 10 businesses

#### Phase 2: IT Shop Partnership (Months 3–6)

- **Target**: 5–10 local IT shops as white-label partners
- **Value prop**: they sell, BizBot maintains; revenue split 70/30
- **Goal**: scale distribution without building an internal sales team

#### Phase 3: Sector Expansion (Months 7–12)

- **Target**: 3–4 additional sectors
- **Goal**: 100 paying SMEs

#### Phase 4: Government & Enterprise (Year 2+)

- **Target**: e-GP registration, government digital-tool tenders
- **Goal**: institutional contracts

### 6.4 Unit Economics (Year 1 Projection — Illustrative, Pending Real Cost Data)

| Metric | Value | Note |
|--------|-------|------|
| Target Customers | 100 SMEs | |
| Average Setup Revenue | ৳15,000 (one-time) | |
| Average Monthly Fee Revenue | ৳900/month × 100 × 12 = ৳1,080,000/year | |
| Gross Revenue (Year 1) | ~৳2,580,000 | Setup + monthly, blended |
| Hosting Costs | ৳60,000/year | |
| WhatsApp API Costs | ৳150,000–300,000/year | Scales with message volume — get a real quote from Meta before finalizing |
| LLM API Costs (Stage 2 only) | ৳300,000–600,000/year | **This is the figure v1.3 underestimated** — assumes Stage 1 rule-based parser resolves 60–70% of orders without an API call; validate this resolution rate in the pilot before trusting this number |
| Development (1 senior dev) | ৳1,200,000/year | Tight for an 8-week MVP of this scope — see PRD note on team sizing |
| Marketing & Sales | ৳300,000/year | |
| **Net Position** | **Roughly breakeven to modestly profitable, sensitive to the LLM cost assumption above** | This is a materially different picture than v1.3's ৳760,000 profit claim, which assumed unrealistically low AI costs |

**Bottom line:** the business is viable, but the margin depends heavily on how much order-parsing can be handled by the free rule-based layer versus the paid LLM layer. That ratio is unknown until the pilot runs — treat this table as a model to update with real data, not a forecast to raise money on yet.

---

## 7. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI parser accuracy low for Bengali/Banglish/dialects | Medium | High | Hybrid rule-based + LLM approach, continuous correction-based improvement |
| Actual AI/API costs exceed budget at scale | **Medium-High** | High | Monitor Stage 1 vs. Stage 2 resolution rate closely from week 1 of pilot; revisit pricing tiers if margins don't hold |
| SMEs resist any recurring fee | Medium | High | Keep monthly fee low and transparent; emphasize it's below what subscription competitors charge |
| WhatsApp API policy or pricing changes | Medium | Medium | Build a thin abstraction layer to ease multi-channel expansion later |
| Competitor (e.g., ShopUp) adds similar WhatsApp capture | High | Medium | Speed to market, deep Bengali-language quality, trust from pilot testimonials — not a durable technical moat |
| Data privacy concerns | Medium | High | Local hosting, transparent policy, opt-in data use for training |
| Scaling beyond 1,000 customers | Medium | Medium | Cloud architecture designed for horizontal scale; re-evaluate self-hosted model option once volume justifies GPU cost |

---

## 8. Success Metrics (KPIs)

| Metric | Target (Year 1) | Measurement |
|--------|----------------|-------------|
| Paying SMEs | 100 | Active subscriptions |
| Order Processing Accuracy | >95% | Manual audit of AI-extracted orders |
| Stage 1 (rule-based) Resolution Rate | Track from week 1 | % of orders resolved without an LLM API call — directly drives unit economics |
| Customer Retention | >80% | Renewal rate |
| NPS Score | >50 | Quarterly survey |
| Revenue | Per Section 6.4, updated with real pilot data | Monthly tracking |
| Time Saved per SME | 10+ hrs/week | User self-reporting |

---

## 9. Future Roadmap

### Year 1: Foundation

- Core WhatsApp commerce platform
- 3 sector verticals
- 100 SME customers
- Real cost-per-order data replacing the estimates in Section 6.4

### Year 2: Scale

- Multi-channel (Facebook Messenger, SMS)
- Advanced analytics (demand forecasting)
- Supplier integration
- e-GP tender participation
- Extended customer memory: price history, address changes, seasonal ordering patterns
- Evaluate self-hosted model for cost reduction, if order volume justifies the GPU investment

### Year 3: Ecosystem

- SME marketplace (B2B procurement)
- Micro-loan integration (via bKash/Nagad)
- AI-powered business advisor
- Regional expansion (Nepal, Sri Lanka)

---

## 10. Conclusion

Bangladesh's SME sector is a large, underserved market with real pain points and a dominant, technically accessible communication channel in WhatsApp. That opportunity is genuine. What this version of the whitepaper changes is the honesty of the path to it: the AI architecture is now described as it would actually be built, the pricing model matches the real cost structure, and the market statistics are flagged as assumptions to validate rather than facts to present as settled.

The opportunity is real. The technology is feasible with a conventional hybrid AI approach — it does not require an unproven self-hosted large model. The market size needs sourcing. The pricing needs a real cost-per-order calculation. The next concrete step is the 10-SME pilot in Section 6.3, which should be used to replace every "needs validation" flag in this document with real numbers before it goes in front of investors or partners.

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-06-XX | Product Team | Initial draft |
| 1.3 | 2026-07-05 | Strategic Planning | Added AI/memory architecture, business model detail |
| 1.4 | 2026-07-06 | Strategic Planning | Corrected AI stack claims, flagged unsourced market stats, reconciled pricing model with real costs, removed duplicated content |

*This whitepaper is a living document. All projections are estimates requiring validation through pilot implementation — see flagged items throughout.*
