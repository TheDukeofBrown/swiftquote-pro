# Flexible Payment Schedules + Stripe Connect

A substantial feature spanning DB schema, edge functions, Stripe Connect onboarding, quote builder UI, customer accept page, PDFs and emails. I'll deliver it in one pass but want to confirm scope and a few decisions before writing code.

## What I'll build

### 1. Database (single migration)
**`quotes` table — new columns:**
- `payment_mode` enum: `none | booking | staged | account` (default `none`)
- `payment_terms_days` int (nullable; for `account` mode: 7/14/30)
- `booking_payment_type` enum: `percent | fixed` (nullable)
- `booking_payment_value` numeric (nullable; the % or £ entered)
- `booking_payment_amount` numeric (nullable; calculated £)
- `staged_payments` jsonb (nullable; `[{label, amount, percentage, timing}]`)

**`companies` table — new columns:**
- `materials_threshold` numeric default `500`
- `stripe_account_id` text
- `stripe_connect_status` enum: `not_connected | pending | active` (default `not_connected`)
- `bank_sort_code` text (optional, for fallback)
- `bank_account_number` text (optional, for fallback)

**New table `quote_payments`:**
`id, quote_id, company_id, stage_label, amount, currency, stripe_payment_intent_id, stripe_checkout_session_id, status (pending|paid), paid_at, created_at`
RLS: company members SELECT/INSERT/UPDATE own rows; super_admins SELECT all; `service_role` ALL. Public quote page never touches it directly — reads flow through `quote-public` edge function only.

### 2. Edge functions
- `stripe-connect-onboard` — creates a Standard connected account and returns an onboarding link
- `stripe-connect-status` — refreshes a company's connect status from Stripe
- `create-booking-checkout` (public, no JWT) — creates a Stripe Checkout Session with `payment_intent_data.transfer_data.destination = company.stripe_account_id` for mode 2 / first stage of mode 3
- `stripe-connect-webhook` (public, no JWT) — verifies `STRIPE_CONNECT_WEBHOOK_SECRET`, handles `checkout.session.completed` (mark `quote_payments.paid`, accept quote, notify trade via existing send-quote infra) and `account.updated` (sync `stripe_connect_status`)

### 3. Quote builder UI
New "Payment schedule" card with the 4 modes. Materials auto-detection: sum of `quote_items` where item kind is materials; if over `materials_threshold`, show a subtle suggestion banner for mode 2 at 25%. Internal copy can say "deposit"; nothing customer-facing does.

### 4. Customer accept page (`/q/:token`)
- Mode 1/4: existing accept flow
- Mode 2: Accept → Stripe Checkout (or bank-transfer fallback panel if not connected)
- Mode 3: Show payment plan table, collect first stage via Stripe (or fallback), remaining stages shown as pending
- All copy uses "booking payment" / "materials payment" / "secure your booking" — never "deposit/upfront/advance"

### 5. Settings → "Get Paid" section
- Materials threshold field
- Bank details (sort code / account number) for fallback
- Stripe Connect button — only surfaced once the company has at least one quote using mode 2 or 3 (per your instruction). Shows connected / pending / reconnect states.

### 6. PDF + emails
PDF gets a "Payment plan" section when mode ≠ none. Trade notification email on booking payment received uses existing send-quote function pattern.

## Technical notes
- Stripe Connect Standard accounts use OAuth; needs `STRIPE_CONNECT_CLIENT_ID` + `STRIPE_CONNECT_WEBHOOK_SECRET` secrets. `STRIPE_SECRET_KEY` already exists.
- `transfer_data.destination` on the PaymentIntent routes funds direct to the trade; the platform takes no fee unless you want one (see Q3).
- Existing `customers` table is unrelated to Stripe customers — no collision.
- `quote_payments` writes happen in the webhook using `service_role`, bypassing RLS safely.

## Questions before I build

1. **Stripe Connect secrets** — I'll need you to add `STRIPE_CONNECT_CLIENT_ID` (from Stripe Dashboard → Connect settings) and `STRIPE_CONNECT_WEBHOOK_SECRET` (from the webhook endpoint you'll create). OK to request these once the edge functions are scaffolded?
2. **Platform fee** — Do you want QuoteSorted to take an `application_fee_amount` on each booking payment (e.g. 1%)? Default: **no fee**, money goes 100% to the trade.
3. **Mode 3 stage timing field** — Free text (e.g. "Week 1 milestone") or structured (`on_acceptance | days_after_start | on_completion`)? Default: **free text** for speed.
4. **Webhook endpoint URL** — I'll deploy it at `/functions/v1/stripe-connect-webhook`; you'll paste that into Stripe Dashboard when adding the webhook. Confirm OK.

Reply with answers (or "go with defaults") and I'll ship it in one pass.