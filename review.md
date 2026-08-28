# Alotel Spaces Admin — API Contract

This document specifies the exact endpoints and request/response payload shapes the **admin frontend** (`alotel-spaces-admin`, Vite + React) already expects. It was reverse-engineered from the frontend's service layer, Zod validators, `*Schema.js` payload mappers, and mock-data fixtures, so backend implementers can build/verify real endpoints without guessing field names.

Where the frontend still runs on mock data with no confirmed real endpoint, this is called out explicitly — those are **open items**, not a contract to match.

## Conventions

- **Base URL**: `env.apiUrl` (`VITE_API_URL`, default `/api/v1`).
- **Auth**: every request carries `withCredentials: true` and `Authorization: Bearer <token>` (token from `authStorage.getToken()`), except that `Content-Type` is stripped for `FormData` bodies so the browser sets the multipart boundary.
- **Token refresh**: on any `401`, the client auto-calls `POST /auth/refresh/` once (concurrent 401s queue behind a single refresh call), rotates the refresh token, and retries the original request. Refresh is never attempted for `/auth/refresh`, `/auth/login`, `/auth/admin/login`, `/auth/admin/2fa` themselves.
- **Field casing**: the frontend normalizes most snake_case API responses into camelCase for internal use. This doc quotes the **raw wire field names** (snake_case, as sent/received over HTTP) unless noted.
- **Pagination is inconsistent across resources today** — three different conventions coexist:
  1. `{ results, count, next, previous }` (DRF default) — e.g. `/properties/`
  2. `{ results, count, page, page_size }` — e.g. `/bookings/admin/list/`, `/auth/admin/guests/`, `/operations/maintenance/tickets/`, `/admin/audit-log/`
  3. Bare array, no envelope — e.g. `/payouts/`, `/admin/pricing/settings/`, `/operations/expenses/`, `/spaces/admin/`

  See **Open Items #12** — worth deciding whether to standardize.

---

## Table of contents

1. [Auth](#1-auth)
2. [Properties](#2-properties-incl-wizardunitsamenities)
3. [Pricing](#3-pricing)
4. [Taxes](#4-taxes)
5. [Bookings](#5-bookings-incl-guests-check-incheckout-contracts-housekeeping-calendar-cancellations)
6. [Payments, Deposits, Payouts, Expenses](#6-payments-deposits-payouts-expenses)
7. [Spaces](#7-spaces)
8. [Maintenance](#8-maintenance)
9. [Dashboard](#9-dashboard)
10. [Analytics](#10-analytics)
11. [People (staff, roles, audit log)](#11-people-staff-roles-audit-log)
12. [Notifications](#12-notifications)
13. [System / Settings / Announcements / Help](#13-system--settings--announcements--help)
14. [Open items for backend team](#open-items-for-backend-team)

---

## 1. Auth

Talks to the real API unconditionally — no mock branch exists for this feature regardless of `VITE_USE_MOCK_AUTH`.

| Method | Path | Request body | Response |
|---|---|---|---|
| POST | `/auth/admin/login/` | `{ email, password }` | `{ access, refresh }` **or** `{ detail: "2FA code sent" }` (no `access` key present → frontend routes to 2FA) |
| POST | `/auth/admin/2fa/confirm/` | `{ email, code }` | `{ access, refresh }` |
| POST | `/auth/admin/2fa/resend/` | `{ email }` | — |
| GET | `/auth/profile/` | — | see below |
| POST | `/auth/logout/` | `{ refresh }` | — (a 400 for an already-blacklisted token is treated as success) |
| POST | `/auth/password-reset/` | `{ email }` | — (a 400 "no user with this email" is swallowed client-side and treated as success, to avoid email enumeration) |
| POST | `/auth/password-reset-confirm/{uid}/{token}/` | `{ new_password }` | — |
| POST | `/auth/refresh/` | `{ refresh }` | `{ access, refresh? }` (rotated refresh is persisted if present, else the old one is kept) |

**`GET /auth/profile/` response** (raw → normalized `toAdminUser`):
```jsonc
{
  "id": "...", "email": "...",
  "role": "...",               // raw role string, mapped to L1/L2/L3 via levelForApiRole()
  "first_name": "...", "last_name": "...",
  "profile": {
    "assigned_properties": [/* used only for a count/regions display */],
    "shift": "...",
    "enable_2fa": true
  }
}
```

**Frontend session storage**: token → localStorage key `alotel.admin.token` + cookie `alotel_admin_session`; refresh token → `alotel.admin.refresh`; user → `alotel.admin.user` (JSON). Token read on every request, localStorage first, cookie fallback.

**Zod validation** (`validators.js`): `loginSchema = { email, password, remember (client-only, never sent) }`. No zod schema exists for 2FA/forgot/reset flows — the plain shapes above are authoritative.

---

## 2. Properties (incl. wizard/units/amenities)

### 2.1 Property CRUD

| Method | Path | Query params (all optional) | Notes |
|---|---|---|---|
| GET | `/properties/` | `page`, `q` (search), `status` (omit if `'All'`), `property_type`, `location`, `classification`, `price_min`, `price_max`, `bedrooms`, `amenities` (comma-joined), `accessibility` (comma-joined or `'true'`), `sort` ∈ `{price_asc, price_desc}` | page size fixed at **10**, assumed server-side, never sent as a param |
| GET | `/properties/{id}/` | — | |
| POST | `/properties/` | — | always creates as `status: 'draft'` |
| PATCH | `/properties/{id}/` | — | partial — only changed keys sent |
| DELETE | `/properties/{id}/` | — | |
| POST | `/properties/{id}/publish/` | — | dedicated publish endpoint, stamps `publishedAt` |

**Request payload** (`toApiPayload(form, {partial})` — the true wire format; the Zod `propertyWizardSchema` only validates step-1 fields before submit):
```jsonc
{
  "name": "string",
  "classification": "Alotel | Third-Party | Third-Party — Social Housing",
  "country": "string", "state": "string", "city": "string", "address": "string",
  "location": "UK | Spain | Nigeria | UAE Dubai | US",           // optional
  "type": "Room | Studio | 1-3 Bed Flat | House | Duplex | Bungalow | Luxury Suite | Other",
  "bedrooms": 0, "bathrooms": "2", "maxGuests": 0, "area": "45.5",
  "furnished": "...", "pets": "...",
  "accessFeatures": ["..."], "amenities": ["..."],
  "baseRate": "120.00", "minStay": 1, "instantBook": true,
  "postal_code": "string",                    // snake_case exception; sent only if non-empty
  "coordinates": { "lat": 0, "lng": 0 },       // only if both present
  "weekendRate": "string", "monthlyRate": "string", "cleaningFee": "string", "securityDeposit": "string",
  "maxStay": 0,
  "status": "string"                           // present only on a deliberate status change, never on create
}
```

**Response** (`toProperty` input shape):
```jsonc
{
  "id": "...", "host": "...", "name": "...", "classification": "...", "status": "draft|published|archived|under_review",
  "country": "...", "state": "...", "city": "...", "address": "...", "coordinates": {}, "location": "...",
  "postal_code": "...", "postal_code_verified": true, "postal_code_verified_at": "...",
  "type": "...", "bedrooms": 0, "bathrooms": "2", "maxGuests": 0, "area": "45.5", "furnished": "...", "pets": "...",
  "accessFeatures": [], "amenities": [],
  "baseRate": "120.00", "weekendRate": "...", "monthlyRate": "...", "cleaningFee": "...", "securityDeposit": "...",
  "minStay": 1, "maxStay": 0, "instantBook": true,
  "thumbNail": "...", "rating": "4.5", "reviewCount": 0,
  "createdAt": "...", "updatedAt": "...", "publishedAt": "...",
  "price_breakdown": { "currency": "..." }   // detail endpoint only — list endpoint has NO currency field
}
```
List envelope: `{ results, count, next, previous }` (DRF-style) → normalized to `{ items, total, page, pageSize, totalPages, hasNext, hasPrevious }`.

### 2.2 Property media

| Method | Path | Body |
|---|---|---|
| GET | `/properties/{id}/images/` | — returns `data.results ?? data ?? []`, sorted client-side by `order` |
| POST | `/properties/{id}/images/` | multipart: `property_image` (file), `roomType` (default `'Other'`), `caption`, `order` |
| DELETE | `/properties/{id}/images/{imageId}/` | — |
| GET / POST / DELETE | `/properties/{id}/videos/...` | same shape, fields `property_video`, `roomType` (default `'Walkthrough'`), `caption`, `order` |
| PATCH | `/properties/{id}/` | multipart `thumbNail` (file) — cover photo lives on the property record, not the gallery |

### 2.3 Availability

| Method | Path | Body |
|---|---|---|
| GET | `/properties/{id}/availability/` | — if empty, API is expected to synthesize one unsaved row (`id: null`, full year, base rate) as the default |
| POST | `/properties/{id}/availability/` | raw passthrough |
| PATCH | `/properties/{id}/availability/{id}/` | raw passthrough |
| DELETE | `/properties/{id}/availability/{id}/` | — |

### 2.4 Reviews

| Method | Path | Body |
|---|---|---|
| GET | `/reviews/{propertyId}/` | — public, per-property, excludes flagged |
| POST | `/reviews/{id}/response/` | `{ body }` — one official response; expect 400 if one already exists |
| POST | `/reviews/{id}/flag/` | `{ reason }` — no unflag endpoint |

### 2.5 Geocoding (Super Admin only, property wizard)

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/listings/geocode/forward/` | `{ address, city?, state?, location? }` | `{ formatted_address, postal_code, city, state, country, lat, lng }` |
| POST | `/listings/verify-postal-code/` | `{ location, postal_code, address, city?, state?, property_id? }` | `{ valid_format, format_error, verified, matched_postal_code, coordinates, detail }` |
| GET | `/listings/postcode-lookup/` | `{ postcode, location? }` | `{ postcode, manual_override_required, addresses: [{formatted_address, postal_code, city, state, country, lat, lng}] }` |

### 2.6 Units & Amenities — ⚠️ no backend endpoint exists today

Both are entirely `localStorage`-only fixtures (`mockProperties` in `propertyService.js`, seeded from `src/lib/mock/catalogue.js`). See **Open Items #1**.

- Units shape: `{ id, label, propertyId, property, floor, status ('Ready'|'Needs Cleaning'|'Occupied'|'Maintenance'), note, beds, baths, lastCleaned }`.
- Amenities shape: `{ groups: <AMENITY_GROUPS structure>, enabled: string[] }`.

---

## 3. Pricing

Three independent resources; Super-Admin write, public read.

### 3.1 Discounts

| Method | Path | Body |
|---|---|---|
| GET | `/properties/discounts/` | — |
| POST | `/properties/discounts/` | see below |
| PATCH | `/properties/discounts/{id}/` | partial |
| DELETE | `/properties/discounts/{id}/` | — |

Request: `{ country, name, percentage: "0-100 as string", startDate, endDate, isActive: bool }` (endDate ≥ startDate, enforced client-side).
Response: `{ id, country, name, percentage: number, startDate, endDate, isActive, createdAt, updatedAt }`. List: `data?.results ?? data ?? []` (tolerant of either shape).

### 3.2 Pricing configs (country fee defaults)

| Method | Path | Body |
|---|---|---|
| GET | `/properties/pricing-configs/` | — |
| POST | `/properties/pricing-configs/` | see below |
| PATCH | `/properties/pricing-configs/{id}/` | partial |
| DELETE | `/properties/pricing-configs/{id}/` | — |

Request: `{ country, currency, cleaningFee: "string", securityDeposit: "string", isActive: bool }`. **`currency` is auto-derived client-side** from a fixed map and never user-entered:
```
UK → GBP, Spain → EUR, Nigeria → NGN, 'UAE Dubai' → AED, US → USD
```
This mapping must match backend validation exactly. Response: `{ id, country, currency, cleaningFee: number, securityDeposit: number, isActive, createdAt, updatedAt }`.

### 3.3 Global pricing rules (deposit/seasonal)

| Method | Path | Body |
|---|---|---|
| GET | `/admin/pricing/settings/` | — bare array, no pagination |
| PUT | `/admin/pricing/settings/` | upsert by `(region, property_type)` — no per-id CRUD |

Request:
```jsonc
{
  "region": "UK|ES|US|AE|NG|ALL",
  "property_type": "...",
  "default_security_deposit": "string",
  "deposit_currency": "GBP",              // uppercased, ≤3 chars
  "default_cleaning_fee": "string",
  "seasonal_price_rules": [{ "label": "...", "start": "MM-DD", "end": "MM-DD", "multiplier": 1.2 }]
}
```
`start`/`end` must match `^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$`; `multiplier` > 0.

Response: `{ id, region, property_type, default_security_deposit, deposit_currency, default_cleaning_fee, seasonal_price_rules, updated_by, created_at, updated_at }` (snake_case on the wire, camelCased internally).

---

## 4. Taxes

Tax Rule Builder v2 — public read, Super-Admin write. Base: `/properties/taxes/`.

| Method | Path | Params/Body |
|---|---|---|
| GET | `/properties/taxes/` | `country?`, `state?`, `city?`, `status?` |
| POST | `/properties/taxes/` | see below |
| PATCH | `/properties/taxes/{id}/` | see below |
| DELETE | `/properties/taxes/{id}/` | — |
| PATCH | `/properties/taxes/{id}/approve/` | empty body — sets `status=active`, stamps `approved_by/approved_at/last_verified_at` |
| PATCH | `/properties/taxes/{id}/reject/` | `{ reason }` (required) |
| POST | `/properties/taxes/suggest/` | `{ country, state?, city? }` — Gemini-backed, Super Admin only, read-only |
| GET | `/properties/taxes/coverage-alerts/` | — Super Admin only |
| GET | `/properties/taxes/coverage/` | `{ country, state?, city? }` |
| POST | `/properties/taxes/no-tax-confirmation/` | `{ country, state?, city?, reason }` — idempotent upsert |
| POST | `/properties/taxes/bulk-import/` | multipart `file` — Super Admin only, all-or-nothing |

**Request (create/update)**:
```jsonc
{
  "rule_name": "string",
  "country": "UK|Spain|USA|UAE|Nigeria",     // distinct enum from properties' `location`
  "state": "string", "county": "string", "city": "string",
  "guest_segment": ["citizen|resident|eu_foreigner|non_eu_foreigner|tourist_all"],
  "tax_type": "percentage|fixed",
  "value": "string",                          // ≤100 if tax_type is percentage
  "frequency": "per_night|per_booking",
  "display_label": "string",
  "status": "active",                          // default
  "source": "manual|ai_suggested|csv_import",  // default "manual"
  "source_url": "string", "confidence": "string", "caveat": "string"   // optional
}
```

**Response** (`toTaxRule` input):
```jsonc
{
  "id": "...", "rule_name": "...", "country": "...", "state": "...", "county": "...", "city": "...",
  "guest_segment": [], "tax_type": "...", "value": "...", "frequency": "...",
  "display_label": "...", "status": "...", "source": "...",
  "ai_generated": true, "source_url": "...", "confidence": "...", "caveat": "...",
  "last_verified_at": "...", "approved_by": "...", "approved_at": "...", "rejected_reason": "...",
  "createdAt": "...", "updatedAt": "..."   // ⚠️ see Open Items #5 — camelCase amid an otherwise snake_case object
}
```

`GET .../coverage-alerts/` → `{ count, alerts: [{ id, country, state, city, property_ids, first_seen_at, last_seen_at }] }`.
`GET .../coverage/` → `{ has_active_coverage, matched_rules, no_tax_confirmed }`.
`POST .../bulk-import/` → `{ imported_count, rules: [...raw tax rules] }`. CSV columns: `rule_name, country, state, county, city, tax_type, value, frequency, display_label`.

---

## 5. Bookings (incl. guests, check-in/checkout, contracts, housekeeping, calendar, cancellations)

### 5.1 Core bookings

| Method | Path | Params/Body |
|---|---|---|
| GET | `/bookings/admin/list/` | `page`, `q` (search), `status` (omit if `'All'`), `check_in_from`, `check_in_to`, `page_size` |
| GET | `/bookings/{id}/` | — |
| GET | `/bookings/{id}/timeline/` | — |
| GET | `/bookings/{id}/receipt/` | — |
| POST | `/bookings/{id}/confirm/` | empty — re-runs compliance checks |
| POST | `/bookings/{id}/approve/` | empty — manual approval for non-instant-book (400 if instant-book) |
| POST | `/bookings/{id}/cancel/` | `{ reason }` (default `''`) |

⚠️ There is **no generic update endpoint** — `updateBooking` deliberately throws a 405 client-side. Every state transition has its own dedicated endpoint above.

`status` enum: `pending_payment, pending_approval, pending_kyc, confirmed, active, completed, cancelled, refunded`.

**List row** (`toBookingRow`): `{ id, property_id, property_name, country, guest_id, guest_name, guest_email, status, check_in_date, check_out_date, nights, currency, total, created_at }`.
Pagination: `{ results, count, page, page_size }` → `{ items, total, page, pageSize, totalPages }` (defaults `page=1`, `pageSize=20`).

**Detail** (`toBookingDetail`):
```jsonc
{
  "id": "...", "property_id": "...", "guest_id": "...", "status": "...",
  "check_in_date": "...", "check_out_date": "...", "nights": 0, "adults": 0, "children": 0, "infants": 0,
  "currency": "...",
  "pricing": { "nightly_total": 0, "discount_total": 0, "cleaning_fee": 0, "tax_total": 0, "security_deposit": 0, "total_due_now": 0 },
  "line_items": [{ "id": "...", "line_type": "...", "label": "...", "unit_amount": 0, "quantity": 1, "total_amount": 0, "currency": "...", "metadata": {} }],
  "status_history": [{ "from_status": "...", "to_status": "...", "reason": "...", "triggered_by": "...", "created_at": "..." }],
  "created_at": "...", "updated_at": "..."
}
```

`GET /bookings/{id}/timeline/` → array (or `{results}`) of `{ from_status, to_status, reason, triggered_by, created_at }`.

`GET /bookings/{id}/receipt/` (`toReceipt`):
```jsonc
{
  "booking_id": "...", "status": "...", "currency": "...", "totals": {},
  "line_items": [{ "label": "...", "line_type": "...", "total_amount": 0, "currency": "..." }],
  "payments": [{ "id": "...", "provider": "...", "status": "...", "amount": 0, "currency": "...", "provider_reference": "...", "created_at": "..." }],
  "generated_at": "..."
}
```

### 5.2 Guests

| Method | Path | Params/Body |
|---|---|---|
| GET | `/auth/admin/guests/` | `page`, `search`, `is_active` (bool), `page_size` — **no `kyc`/`country` filters exist** |
| GET | `/auth/admin/guests/{id}/` | — |
| PATCH | `/auth/admin/guests/{id}/` | `{ is_active?, first_name?, last_name? }` — **only these fields are editable** |
| GET | `/auth/admin/guests/{id}/bookings/` | `{ status? }` |

`toGuest`: `{ id, first_name, last_name, email, is_active, date_joined }` — deliberately thin, no phone/country/KYC on the base record.
`toGuestDetail` adds: `{ phone, kyc_status, stay_stats: { total_bookings, completed_stays, total_spend } }`.
Guest-history row: `{ id, property_id, property_name, property_main_image, check_in_date, check_out_date, status, nights, currency, created_at }`.
Pagination: `{ results, count, page, page_size }`, default `pageSize=20`.

### 5.3 Contracts

No "list contracts" endpoint — the Contracts screen is built from `GET /bookings/admin/list/` plus per-booking lookups.

| Method | Path | Body |
|---|---|---|
| GET | `/contracts/booking/{bookingId}/text/` | — 404 = nothing issued yet; returns `{ contract_id, status, template_name, template_version, content }` |
| POST | `/contracts/send/` | `{ booking_id, template_id? }` |
| GET | `/contracts/{contractId}/status/` | — `{ contract_id, status, signed_document_url, sent_at, signed_at }` |
| GET | `/contracts/templates/` | — |
| POST | `/contracts/templates/` | see below |
| PATCH | `/contracts/templates/{id}/` | see below |
| DELETE | `/contracts/templates/{id}/` | — |

Template payload: `{ name, region: 'UK|ES|US|AE|NG', stay_type: 'short_stay|medium_residential|medium_commercial|long_residential|long_commercial', content, version: "1.0", is_active: bool }`. Unique together on `(region, stay_type, version)` server-side.

Contract status values: `not_sent | sent | signed | declined | expired`. `CONTRACT_REQUIRED_MIN_NIGHTS = 183` — below this, a short-stay flow uses `POST /bookings/{id}/accept-agreement/` (referenced only in a code comment; not called anywhere in the current codebase — **unconfirmed, see Open Items #3**).

⚠️ The "contract type" per row (`resolveContractType`) is derived **client-side** from a hardcoded nights/country matrix (`CONTRACT_MATRIX` in `src/lib/mock/operations.js`), not read from any API field — see **Open Items #2**.

### 5.4 Check-in / check-out inspections & damage

| Method | Path | Body |
|---|---|---|
| POST | `/inspections/{bookingId}/{stage}/` | multipart: `room_area`, `file`, `caption?` — one photo per request |
| GET | `/inspections/{bookingId}/compare/` | — `{ checkin: {photos_by_area, photos, guest_acknowledged, guest_acknowledged_at}, checkout: {...same} }` |
| POST | `/inspections/{bookingId}/checkin/complete/` | `{ notes?, contract_id? }` |
| POST | `/inspections/{bookingId}/checkout/complete/` | `{ notes? }` |
| GET | `/inspections/{bookingId}/damage/` | — |
| POST | `/inspections/{bookingId}/damage/` | `{ room_area, description, severity: 'minor|moderate|major', estimated_cost: "string", currency }` |
| PATCH | `/inspections/{bookingId}/damage/{damageId}/` | `{ approved_cost?: "string"|null, deduct_from_deposit?: bool }` |
| GET | `/inspections/{bookingId}/report/` | — 404 until generated |
| POST | `/inspections/{bookingId}/report/` | empty — deducts damages from deposit, auto-releases remainder; safe to re-call |

Damage response: `{ id, booking, inspection, room_area, description, severity, photo, estimated_cost, approved_cost, currency, deduct_from_deposit, logged_by, logged_at }`.
Checkout report response: `{ id, booking, pdf_url, sent_to_guest, sent_at, admin_signature_url, deposit_deduction_total, delivery_log, generated_at, damage_items: [...] }`. Bare `/media/...` file paths are resolved client-side against the API origin.

### 5.5 Housekeeping

| Method | Path | Params/Body |
|---|---|---|
| GET | `/operations/rooms/today/` | — `{ date, rooms: [{property_id, property_name, status, booking_id, cleaning_task_id}] }` |
| GET | `/operations/tasks/` | `{ property_id?, status?, task_type? }` → `[{id, property, booking, assigned_to, task_type, status, due_date, notes, completed_at}]` |
| PATCH | `/operations/tasks/{id}/status/` | `{ status: pending|in_progress|cleaned|blocked|ready, notes? }` |
| POST | `/operations/issues/report/` | `{ property_id, booking_id?, title, description, severity }` |
| GET | `/operations/issues/report/` | `{ property_id?, status?, severity? }` → `[{id, property, booking, reported_by, title, description, severity, status, created_at, resolved_at}]` |
| PATCH | `/operations/issues/{id}/status/` | `{ status: open|in_progress|resolved|wont_fix }` |
| GET | `/operations/properties/assigned/` | — `[{id, name}]` |

### 5.6 Calendar — ⚠️ no dedicated endpoint

Built client-side from `GET /bookings/admin/list/` with `{ check_in_from, check_in_to, page_size: 200 }`, bucketed by night in the browser. See **Open Items #4**.

### 5.7 Cancellations — ⚠️ no dedicated endpoint

Reuses `GET /bookings/admin/list/?status=cancelled`; the cancellation reason is fetched separately via the booking's timeline. See **Open Items #4**.

⚠️ **Stale mock warning**: `src/lib/mock/operations.js` still contains an old `bookings`/`guests`/`checkoutReports`/`cancellations` fixture whose fields (`kyc`, `contract`, `deposit`, `channel`, `duration`, etc.) **do not match** the real shapes above. Only `CONTRACT_MATRIX`/`resolveContractType` from that file is still live — do not use the rest of it as a reference.

---

## 6. Payments, Deposits, Payouts, Expenses

`VITE_USE_MOCK_PAYMENTS` defaults to `false` — this area is already real-backend-driven.

### 6.1 Payments

| Method | Path | Params/Body |
|---|---|---|
| GET | `/payments/` | `page`, `status?`, `provider?`, `transaction_type?`, `booking_id?`, `start_date?`, `end_date?`, `page_size?` |
| POST | `/payments/refund/` | `{ booking_id, amount: "string", currency, reason?, provider? }` |
| GET | `/deposits/{bookingId}/` | — |
| POST | `/payments/deposit/preauth/` (Stripe) or `/payments/deposit/charge/` (Flutterwave) | `{ booking_id, amount: "string", currency, provider? }` |
| POST | `/deposits/{bookingId}/capture/` | `{ amount?: "string" }` |
| POST | `/payments/deposit/release/` | `{ booking_id }` |
| POST | `/deposits/{bookingId}/deduct/` | `{ amount: "string", reason }` |
| GET | `/payments/fx-rate/` | `{ base }` |

Payment row (`toPayment`): `{ id, provider_reference, booking, guest_email, property_name, provider, transaction_type, amount, currency, status, failure_reason, processed_at, created_at }`. No `fee`/`net` fields exist. List envelope: `{ results, count, page, page_size }`.

`GET /deposits/{bookingId}/` → `{ ledger: {...collection_method, status, amount_captured, amount, currency,...}, claims: [...] }` — flattened client-side so callers read `.status`/`.amount_captured` directly.

`GET /payments/fx-rate/` → `{ base, rates, supported_currencies, payment_provider_by_currency, note }`.

### 6.2 Payouts

| Method | Path | Params/Body |
|---|---|---|
| GET | `/payouts/` | `property_id?`, `status?` (lowercased, omit if `'All'`) — **bare array, no pagination envelope**; frontend does client-side filtering/paging |
| POST | `/payouts/{id}/release/` | empty |
| POST | `/payouts/` | see below (Super Admin only) |

Create request: `{ property_id, amount: "string", currency: "≤3 chars", period_start, period_end }` (`period_end` ≥ `period_start`).
Response (`toPayout`): `{ id, property, property_name, host_email, amount, currency, status: pending|released|failed, period_start, period_end, released_by, released_at, created_at, updated_at }`. No gross/commission/net split; payee is `Property.host` directly, no separate Owner entity.

### 6.3 Expenses

| Method | Path | Params/Body |
|---|---|---|
| GET | `/operations/expenses/` | `category?`, `start_date?`, `end_date?` |
| POST | `/operations/expenses/` | `{ category: operation|staff|marketing|others, amount: "string", date, note }` |

⚠️ No response normalizer exists — the returned shape is presumed to mirror the create payload plus an id/timestamp, but this is **unconfirmed** (see Open Items #9).

### 6.4 Revenue & Invoices — ⚠️ fully mock, no real endpoint

`financeService.getRevenue()` still reads `src/lib/mock/finance.js`. If/when a real endpoint is built, target this shape:
```jsonc
{
  "invoices": [{ "id":"", "bookingId":"", "client":"", "issuedAt":"", "dueAt":"", "currency":"", "subtotal":0, "tax":0, "total":0, "status": "Paid|Due" }],
  "revenueByMonth": [{ "label": "Feb", "value": 0 }],
  "costBreakdown": [{ "label": "", "value": 0, "isOther": false }]
}
```
See **Open Items #7**.

---

## 7. Spaces

Real backend confirmed. Notable gaps: **no delete-space endpoint**; layouts/add-ons/operating-hours are **create + delete only, no update**; no stored `currency` on a Space (derived from `location` at booking time); no `archived` status for `slot_unit`.

### 7.1 Space CRUD

| Method | Path | Notes |
|---|---|---|
| GET | `/spaces/admin/` | ⚠️ no confirmed server-side search/filter/pagination — frontend paginates/filters the full returned array client-side (search: title/city/country; filter: status) |
| GET | `/spaces/{id}/` | |
| POST | `/spaces/admin/` | |
| PATCH | `/spaces/{id}/` | full payload or `{ status }` alone for publish/unpublish |

Request payload:
```jsonc
{
  "title": "...", "description": "...",
  "space_type": "Meeting Room|Boardroom|Event Hall|Conference Center|Studio|Other",
  "status": "draft|published",
  "country": "...", "state": "...", "city": "...", "address": "...", "coordinates": {},
  "size_sqm": 0, "base_rate": "string",
  "slot_unit": "hour|half_day|full_day|custom_minutes",
  "slot_unit_minutes": 0,       // only when slot_unit === custom_minutes
  "min_slots": 1, "max_slots": 0,
  "booking_mode": "instant|request", "approval_expiry_hours": 24,
  "location": "UK|Spain|Nigeria|UAE Dubai|US"   // optional, only if country matches
}
```

Response: `{ id, host, title, space_type, description, status, published_at, country, state, city, address, coordinates, location, images, size_sqm, base_rate, slot_unit, slot_unit_minutes, min_slots, max_slots, booking_mode, approval_expiry_hours, max_capacity, created_at, updated_at }`.

### 7.2 Layouts / Add-ons / Operating hours / Blackout dates / Images (all scoped under `/spaces/admin/{spaceId}/...`)

| Sub-resource | GET | POST body | DELETE | Notes |
|---|---|---|---|---|
| `layouts/` | list | `{ layout_name, max_capacity }` | `{id}` | delete fails (protected FK) if a booking references it |
| `addons/` | list | `{ category, name, price: "string", unit_type: flat\|per_person\|per_hour, min_qty, max_qty }` | `{id}` | |
| `operating-hours/` | list | `{ day_of_week: 0-6 (0=Mon), open_time, close_time }` | `{id}` | one row per open weekday, no `is_open` flag, no bulk endpoint |
| `blackout-dates/` | list | `{ date, reason }` | `{id}` | |
| `images/` | list | multipart `{ image (file), order, caption? }` | `{id}` | bare `/media/...` paths resolved client-side |

None of these sub-resources support PATCH/update — a change requires delete + recreate.

### 7.3 Space bookings, approval queue, calendar

| Method | Path | Params/Body |
|---|---|---|
| GET | `/spaces/bookings/` | `page`, `status?` (omit if `'All'`), `space_id?` — approval queue reuses this with `status: 'pending_host_approval'`; calendar reuses it with `{ spaceId, pageSize: 200 }` |
| GET | `/spaces/bookings/{id}/` | — |
| PATCH | `/spaces/bookings/{id}/approve/` | empty |
| PATCH | `/spaces/bookings/{id}/decline/` | `{ reason }` |

No create/edit endpoint exists from the admin side — this resource is output-only for the admin UI.

Response (`toSpaceBooking`):
```jsonc
{
  "id":"", "space":"", "space_title":"", "layout":"", "layout_name":"", "guest_name":"", "guest_email":"",
  "start_datetime":"", "end_datetime":"", "guest_count":0,
  "addon_lines": [{ "id":"", "addon":"", "addon_name":"", "qty":0, "price_at_booking":0 }],
  "base_price":0, "addons_price":0, "tax_total":0, "total_price":0, "currency":"",
  "status": "pending_payment|pending_host_approval|confirmed|declined|expired|cancelled|completed",
  "approval_due_at":"", "decline_reason":"", "created_at":"", "updated_at":""
}
```
Pagination: bare array or `{ results, count, page, page_size }` → `{ items, total, page, pageSize, totalPages }`.

---

## 8. Maintenance

Real backend confirmed.

### 8.1 Worker directory

| Method | Path | Params/Body |
|---|---|---|
| GET | `/operations/maintenance/workers/` | `page`, `search?`, `employment_type?`, `status?` |
| GET | `/operations/maintenance/workers/{id}/` | — |
| POST | `/operations/maintenance/workers/` | see below |
| PATCH | `/operations/maintenance/workers/{id}/` | see below |
| POST | `/operations/maintenance/workers/{workerId}/assignments/` | `{ property: propertyId }` |
| DELETE | `/operations/maintenance/workers/{workerId}/assignments/{assignmentId}/` | — |

Request: `{ name, phone, email?, specialty_tags: string[] (min 1), employment_type: in_house|external_vendor, company_name (required only if external_vendor, else forced ''), rate_basis: hourly|flat|per_job, rate_amount: "string"|null }`.

Response: `{ id, name, phone, email, specialty_tags, employment_type, company_name, rate_basis, rate_amount, status: active|inactive, assigned_property_count, created_at, updated_at }`. Assignment: `{ id, worker, property, assigned_at }`.

### 8.2 Tickets

| Method | Path | Params/Body |
|---|---|---|
| GET | `/operations/maintenance/tickets/` | `page`, `search?`, `status?`, `priority?`, `category?`, `property?`, `space_id?`, `assigned_worker?` |
| GET | `/operations/maintenance/tickets/{id}/` | — |
| POST | `/operations/maintenance/tickets/` | see below |
| PATCH | `/operations/maintenance/tickets/{id}/` | ⚠️ raw `values` passthrough, not mapped through a payload builder like every other write path — see Open Items #8 |
| POST | `/operations/maintenance/tickets/{id}/costs/` | JSON or multipart (with `receipt_file`) — see below |
| POST | `/operations/maintenance/tickets/{id}/photos/` | multipart `{ file, caption }` |
| GET | `/operations/maintenance/dashboard/` | `property?` |

Create request: `{ property_id, space_id (exactly one of the two; space_id is Super-Admin-only), category, description, priority: low|medium|high|urgent, assigned_worker_id? }`.

Cost log request: `{ cost_type: materials|labor|other, amount: "string", note, invoice_reference: string|null }` (+ `receipt_file` if multipart).

Response: `{ id, property, property_name, space, space_title, category, description, priority, status, assigned_worker, assigned_worker_name, created_by, resolution_notes, created_at, updated_at, resolved_at, total_cost, costs: [...], photos: [...] }`. Status flow: `open → assigned → in_progress → resolved → closed`.

`GET /operations/maintenance/dashboard/` → `{ open_count, avg_resolution_hours, total_spend }`.

---

## 9. Dashboard

One endpoint serves the whole overview — do not split it into per-widget endpoints.

| Method | Path | Params |
|---|---|---|
| GET | `/admin/dashboard/` | — role-dependent response, see below |
| GET | `/admin/dashboard/revenue-overview/` | `start_date?`, `end_date?` |
| GET | `/admin/dashboard/cost-breakdown/` | `start_date?`, `end_date?` |
| GET | `/admin/dashboard/badges/` | — |
| GET | `/kyc/full/pending/` | — |
| POST | `/kyc/full/approve/` | `{ kyc_check_id, decision: "approved"|"rejected", review_notes? }` |

`GET /admin/dashboard/` response (role-dependent):
- Super Admin / Facility Manager: `{ role, cards: { active_bookings: Card, occupancy_rate: Card, revenue_mtd: Card, ... } }` where `Card = { value, unit?, sub_text?, delta_pct? }`. Frontend requires exactly the keys `active_bookings`, `occupancy_rate`, `revenue_mtd` among others.
- Housekeeper: `{ role: 'housekeeper', today, tasks: [{ id, property_id, task_type, status, due_date, notes }] }`

`revenue-overview` → `{ series: [{ day, revenue }] }` (Mon–Sun).
`cost-breakdown` → `{ breakdown: [{ category, amount }] }` — Maintenance category is server-derived from ticket costs; the rest come from `ExpenseEntry`.
`badges` → `{ properties, reviews, bookings, checkins, checkout_reports, contracts, housekeeping, payments }` (all optional numbers).
`GET /kyc/full/pending/` → `{ results: [{ kyc_check_id, booking_id, guest_id, guest_name, provider, status, created_at }] }`.

---

## 10. Analytics

| Method | Path | Params/Body |
|---|---|---|
| GET | `/analytics/kpis/` | `range?` (`today|7d|30d|this_month|last_month`), `country?` (omit if `'All'`), `property_id?`, `currency?` |
| POST | `/analytics/export/` | `{ format, range?, country?, currency? }`, `responseType: 'blob'` |

This single `/analytics/kpis/` call is meant to replace any narrower per-metric analytics endpoints — do not implement separate ones.

`GET /analytics/kpis/` → `{ kpis: {...} }`:
```jsonc
{
  "occupancy_rate":0, "adr":0, "revpar":0, "total_revenue":0, "revenue_growth":0, "total_bookings":0,
  "conversion_rate":0, "listing_views":0, "booking_lead_time_days":0, "alos_nights":0,
  "cancellation_rate":0, "refund_rate":0, "review_score":0, "turnover_efficiency_hours":0,
  "review_trend": [{ "date":"YYYY-MM-DD", "avg_rating":0 }],
  "channel_mix": { "direct":0, "platform":0, "other":0 }
}
```
`POST /analytics/export/` returns a binary blob (CSV/PDF), not JSON.

---

## 11. People (staff, roles, audit log)

| Method | Path | Params/Body |
|---|---|---|
| GET | `/admin/staff/` | `page_size: 100` (hardcoded) |
| POST | `/admin/staff/` | see below (create) |
| PATCH | `/admin/staff/{id}/` | see below (partial edit) |
| GET | `/admin/audit-log/` | `method?`, `user_id?`, `start_date?`, `end_date?`, `page?`, `page_size?` |

Note: "roles" (`getRoles()`) is **not a network call** — it resolves the frontend's own hardcoded capability matrix. Never expect a request for this.

Create staff:
```jsonc
{
  "email": "...", "password": "8+ chars",
  "role": "facility_manager|housekeeper",   // only these two are creatable via this form
  "first_name": "...", "last_name": "...", "other_name": "",
  "profile": { "assigned_properties": ["..."] }
}
```
Edit staff (partial — only supplied keys sent): `{ first_name?, last_name?, other_name?, profile?: { assigned_properties }, is_active? }`. Role and email are immutable after creation.

Staff response: `{ id, first_name, last_name, other_name, email, role: super_admin|admin|facility_manager|housekeeper, is_active, profile: { assigned_properties } }`. ⚠️ Backend role naming is inconsistent between endpoints — `/auth/admin/login/` reportedly returns `"admin"` for Super Admin while `/auth/profile/` returns `"super_admin"` for the same person; both are mapped to `L1` client-side (see Open Items #10). List response: `{ results: [...] }` (no total/page consumed).

Audit log params: `method (GET|POST|PATCH|PUT|DELETE)`, `user_id`, `start_date`, `end_date`, `page`, `page_size` — this is a raw HTTP request log, no free-text search or role filter.
Response: `{ results: [{ id, created_at, method, path, status_code, action, ip_address, duration_ms, user_id }], count, page, page_size }`.

---

## 12. Notifications

Mounted under `guest.urls` per a code comment.

| Method | Path | Body |
|---|---|---|
| GET | `/notifications/{userId}/` | — polled every 60s |
| PUT | `/notifications/{id}/read/` | empty |
| GET | `/notifications/unread-count/` | — self-scoped, no id in path; polled every 60s |
| POST | `/notifications/read-all/` | empty |

`GET /notifications/{userId}/` → array of `{ id, channel, trigger_key, title, body, status, sent_at, read_at, created_at }`.
`GET /notifications/unread-count/` → `{ unread_count }`.
`POST /notifications/read-all/` → `{ marked_read }`.
`PUT /notifications/{id}/read/` → single notification row, same shape as the list.

---

## 13. System / Settings / Announcements / Help

### 13.1 Settings

| Method | Path | Body |
|---|---|---|
| GET | `/admin/system/config/` | — |
| GET | `/notifications/preferences/{userId}/` | — |
| GET | `/admin/integrations/` | — |
| PUT | `/admin/system/config/` | `{ key, value }` — one key at a time |
| PUT | `/notifications/preferences/{userId}/` | `{ email_enabled?, sms_enabled?, in_app_enabled? }` |

⚠️ `SystemConfig` is a generic string key-value store — the following key names are the **frontend's own choice** and need backend sign-off (see Open Items #11):
```
twoFactor              → admin_two_factor_enabled
sessionHours           → admin_session_timeout_hours
gdprMode               → admin_data_protection_mode
autoReleaseDeposit     → deposit_auto_release_enabled
stripePreAuth          → stripe_preauth_enabled
contractReminderHours  → contract_reminder_hours
kycReminderHours       → kyc_reminder_hours
autoCancelOnKycFailure → kyc_auto_cancel_on_failure
```
Values are sent as `String(value)`; booleans are read back via `raw === 'true' || raw === true`.

`GET /admin/system/config/` → bare array or `{ results: [{ key, value }] }`.
`GET /notifications/preferences/{userId}/` → `{ email_enabled, sms_enabled, in_app_enabled }`.
`GET /admin/integrations/` → `{ "<integration_key>": { label, configured, note? }, ... }` for keys including `stripe_identity`, `dropbox_sign`, `flutterwave`, `onfido`, `sendgrid`.

### 13.2 Announcements

| Method | Path | Body |
|---|---|---|
| GET | `/admin/announcements/` | — |
| POST | `/admin/announcements/` | `{ title, body }` (Super Admin only) |

Response: `{ id, title, body, created_by, is_active, created_at, updated_at }`.

### 13.3 Help — ⚠️ fully mock, no real endpoint

`systemService.getHelp()` still reads `src/lib/mock/system.js`. Target shape if built:
```jsonc
[{ "id":"", "category": "Getting started|Bookings|Finance|Access", "title":"", "body":"" }]
```
See Open Items #7.

---

## Open items for backend team

1. **Units & Amenities have zero backend endpoints today** (`src/features/properties/services/propertyService.js`) — currently pure `localStorage` fixtures. Needs a full API design, not just contract-matching against a mock.
2. **Contract type per booking row** is derived client-side from a hardcoded nights/country matrix (`CONTRACT_MATRIX`/`resolveContractType` in `src/lib/mock/operations.js`) rather than any API field. Confirm whether this logic should move server-side.
3. **`POST /bookings/{id}/accept-agreement/`** (short-stay contract flow, <183 nights) is referenced only in a code comment — never actually called anywhere in the current codebase. Its shape is unconfirmed; verify independently with backend before relying on it.
4. **Calendar and Cancellations have no dedicated endpoints** — both are synthesized client-side from `GET /bookings/admin/list/`. Decide whether to keep this pattern or add purpose-built endpoints.
5. **`toTaxRule` reads `createdAt`/`updatedAt` in camelCase** off an otherwise fully snake_case raw object (`rule_name`, `last_verified_at`, etc.) — likely should be `created_at`/`updated_at`. Confirm actual serializer field names; as written, this normalizer would silently produce `undefined` for both fields against a consistently snake_case API.
6. **Stale mock fixture**: `src/lib/mock/operations.js`'s `bookings`/`guests`/`checkoutReports`/`cancellations` arrays are inconsistent with the real, live shapes in `bookingSchema.js`/`checkoutSchema.js` (extra fields like `kyc`, `contract`, `deposit`, `channel`, `duration` that don't exist on the real API). Do not use them as a shape reference.
7. **Revenue & Invoices and Help Center have no real endpoints at all** — both still read local mock fixtures (`src/lib/mock/finance.js`, `src/lib/mock/system.js`). These need to be designed from scratch; the mock shapes above are only a starting reference, not a confirmed spec.
8. **`maintenanceService.updateTicket`** sends the raw `values` object directly as the PATCH body with no payload-mapping step, unlike every other write path in the app. Confirm exact field names expected by `PATCH /operations/maintenance/tickets/{id}/` for status transitions and reassignment.
9. **`financeService.getExpenses`/`createExpense`** (`/operations/expenses/`) has no response normalizer in the frontend — the read-back shape is presumed to mirror the create payload but is unconfirmed.
10. **Staff role-naming inconsistency**: `/auth/admin/login/` reportedly returns `"admin"` for Super Admin while `/auth/profile/` returns `"super_admin"` for the same account. Both map to `L1` client-side today, but this should be reconciled on the backend for consistency.
11. **`SystemConfig` key names** (`admin_two_factor_enabled`, etc.) are the frontend's own naming choice for a generic key-value config store — confirm the backend is fine standardizing on exactly these strings.
12. **Pagination convention is inconsistent across resources** — three different shapes coexist (`{results,count,next,previous}`, `{results,count,page,page_size}`, and bare arrays for `/payouts/`, `/admin/pricing/settings/`, `/operations/expenses/`, `/spaces/admin/`). Decide whether to standardize on one envelope going forward.
13. **`GET /spaces/admin/`** has no confirmed server-side search/filter/pagination — the frontend currently fetches the full list and paginates/filters client-side. If real pagination is added here, the frontend's `listSpaces` call will need a corresponding update.
