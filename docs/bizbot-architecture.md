# BizBot on Portable Agency CRM — Architecture & Build Plan

How the Bangladeshi SME-friendly BizBot features (whitepaper + PRD) are
built **on top of** the existing CRM template without forking its data
model or contradicting later modules. Read this before adding a feature.

## Canonical entity mapping

BizBot concepts map onto the CRM's existing Supabase tables wherever one
already exists. We only add tables that are genuinely missing.

| BizBot concept | CRM entity | Notes |
|---|---|---|
| Business / agency | `accounts` | one row per install; `default_currency` (ISO-4217, **one currency per account**, no FX) |
| Customer | `contacts` | WhatsApp number is the identity; already exists |
| Order / sale | `deals` (a pipeline) | a deal **is** a sale/order; the order lifecycle = pipeline stages |
| Product / SKU | `products` | **NEW** (inventory module) |
| Stock | `inventory` | **NEW** (inventory module), per product × location |
| Expense | `expenses` | **NEW** (accounting module) |
| Team member | `profiles` / `account_members` | already exists |
| AI order parser | background job → creates `deals` | writes the same entity a human would |

## Design principles (non-negotiable for coherence)

1. **Reuse, don't duplicate.** No parallel `orders` table next to
   `deals`; no `businesses` table next to `accounts`. One source of
   truth per concept.
2. **`account_id` scoping + RLS on every new table**, identical to the
   existing tables. Multi-tenant isolation is preserved.
3. **Single currency per account.** Bangladeshi businesses use **BDT
   (৳)**; the picker already supports it. No cross-currency math.
4. **Localization is additive.** UI strings live in `messages/*.json`
   (next-intl); `bn` is the Bengali locale. Per-deploy via
   `NEXT_PUBLIC_APP_LOCALE=bn`. Bengali numerals are an account
   preference rendered with `toBengaliDigits()` — never a fork of the
   formatter.
5. **WhatsApp is the channel, not a silo.** Inbound messages already
   create/link `contacts` and `deals`; the AI parser only automates
   what a human does today.

## Build cascade (low-effort / high-impact → toughest)

Each phase is independently shippable and builds only on prior phases.
Phases already shipped are marked ✅.

- ✅ **P0 — Foundation:** BDT currency, Bengali (`bn`) locale,
  `toBengaliDigits()` helper, `formatCurrencyBengali` /
  `formatNumberBengali`, `BANGLADESH` defaults.
- **P1 — Localization depth + Bengaliness:** deeper `bn.json`
  coverage; **Bengali-numerals account preference** (toggle in
  Appearance → uses `formatCurrencyBengali`); **Bangladesh business
  profile** fields (VAT/TIN, bKash/Nagad) on the account.
- **P2 — Inventory & stock:** `products`, `locations`, `inventory`,
  `inventory_adjustments` tables + UI; stock deduction on deal
  confirmation; **low-stock WhatsApp alerts**; multi-location transfers.
  The first genuinely new module, and the core BizBot differentiator.
- **P3 — Accounting & VAT/TDS:** `expenses` table + UI; P&L, cash flow,
  simplified balance sheet; **VAT/TDS fields + tax reports** (validated
  by a human before filing); **Excel-first (`.xlsx`) export** with
  formulas, per the PRD's ACC-010.
- **P4 — AI order extraction:** two-stage Bangla/Banglish parser
  (rule-based + hosted LLM) that creates `deals` from chat, with a
  manual-review queue. Writes the same `deals` entity as P2/P3.
- **P5 — Reach:** offline PWA cache for core views; bKash/Nagad
  payment-method awareness on deals; demand-forecast analytics.

Every phase keeps the mapping above, so a feature added in P4 (an AI
order) is indistinguishable at the data layer from a human-created deal
in P2 — they never conflict.
