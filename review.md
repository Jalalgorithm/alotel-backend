# Alotel Spaces Admin — Pending / Outstanding Work

This tracks only what is **not done yet** — missing backend endpoints, known bugs/inconsistencies, and frontend gaps to close before go-live. Anything already working correctly is intentionally left out. For the full endpoint reference (including what already works), see `API_CONTRACT.md`.

---

## A. Backend endpoints that don't exist yet

1. **Units** — no backend endpoint at all. Currently pure `localStorage` fixtures in `src/features/properties/services/propertyService.js` (`mockProperties`). Needs a full API design (list/create/update status, tied to a property).
2. **Amenities** — same as above, no backend endpoint. Currently `localStorage`-only (enable/disable toggle, grouped catalogue).
3. **Revenue & Invoices** — no real endpoint. `financeService.getRevenue()` still reads `src/lib/mock/finance.js`. Needs an endpoint returning invoices, monthly revenue series, and cost breakdown.
4. **Help Center** — no real endpoint. `systemService.getHelp()` still reads `src/lib/mock/system.js`. Needs an endpoint returning categorized help articles.
5. **Calendar view** — no dedicated endpoint; currently synthesized client-side by fetching up to 200 bookings via `/bookings/admin/list/` and bucketing by date in the browser. Decide whether a purpose-built calendar endpoint is worth adding.
6. **Cancellations view** — no dedicated endpoint; reuses `/bookings/admin/list/?status=cancelled`, with the cancellation reason fetched separately per row via the booking timeline (N+1 pattern). Decide whether to add a dedicated endpoint that includes the reason inline.
7. **Short-stay contract acceptance** (`POST /bookings/{id}/accept-agreement/`, for bookings under 183 nights) — referenced only in a code comment, never actually implemented/called anywhere in the frontend. Needs to be built and wired up, or the comment removed if the flow is being handled another way.

## B. Backend bugs / inconsistencies to fix

8. **Tax rule timestamps likely broken**: the frontend's tax rule normalizer reads `createdAt`/`updatedAt` in camelCase, while every other field on that same object is snake_case (`rule_name`, `last_verified_at`, etc.). If the real API is consistently snake_case, `created_at`/`updated_at` are the correct field names and the frontend mapping needs fixing — confirm the actual serializer field names with backend first.
9. **Staff role naming is inconsistent across endpoints**: login (`/auth/admin/login/`) reportedly returns `"admin"` for a Super Admin, while the profile endpoint (`/auth/profile/`) returns `"super_admin"` for the same account. Needs to be reconciled to one consistent value.
10. **Maintenance ticket updates bypass the normal payload pattern**: `maintenanceService.updateTicket` sends whatever object the caller passes straight through as the PATCH body, unlike every other write path in the app which goes through a dedicated payload mapper. Needs a proper `toTicketUpdatePayload`-style mapper once the exact expected field names are confirmed with backend.
11. **Pagination is inconsistent across resources** — three different response shapes coexist today (`{results,count,next,previous}`, `{results,count,page,page_size}`, and bare arrays for `/payouts/`, `/admin/pricing/settings/`, `/operations/expenses/`, `/spaces/admin/`). Should be standardized on one convention.
12. **No server-side search/filter/pagination for `GET /spaces/admin/`** — the frontend currently pulls the entire list and does everything client-side, which won't scale. Needs real query-param support added server-side, plus a corresponding frontend update once available.
13. **Stale mock fixture left in the codebase**: `src/lib/mock/operations.js` still has old `bookings`/`guests`/`checkoutReports`/`cancellations` fixtures with fields (`kyc`, `contract`, `deposit`, `channel`, `duration`) that don't match the real, live API shapes anymore. Should be deleted to avoid confusing future contributors — only `CONTRACT_MATRIX`/`resolveContractType` from that file is still actually used.
14. **`GET /operations/expenses/` response shape unconfirmed** — no normalizer exists in the frontend for the read path; only the create payload is defined. Needs backend confirmation of the exact response fields.
15. **`SystemConfig` key names need backend sign-off** — the frontend invented its own key strings (`admin_two_factor_enabled`, `admin_session_timeout_hours`, etc.) for a generic key-value settings store. Needs backend to confirm these are acceptable or specify their own.

## C. Design decisions needed

16. **Contract type per booking is derived client-side** from a hardcoded nights/country lookup table rather than any API field. Decide whether this logic should move server-side so it's consistent and auditable.

---

## D. Frontend gaps before go-live

17. **Production API URL has no enforced source of truth.** The README describes committed `.env.development`/`.env.production` files that don't actually exist in the repo. A plain build today bakes in whatever `VITE_API_URL` happens to be in the local `.env` (currently `localhost`) unless it's manually overridden in the hosting dashboard. Needs a real, enforced deployment config.
18. **Several features default to mock mode when env vars are unset** (auth fallback, properties, bookings, taxes, pricing, dashboard, analytics). Needs an explicit go/no-go decision per feature and the corresponding `VITE_USE_MOCK_*` flags hard-set to `false` for production.
19. **Zero automated test coverage** — no test framework configured at all, no test files anywhere. Needs at least smoke/unit coverage on the highest-risk logic (tax/pricing calculators, auth refresh flow, RBAC route guarding).
20. **~20 list/table pages silently swallow fetch errors** — they check `isLoading` but never `isError`, so an API outage renders an empty table instead of an error message. Needs a shared error-state pattern applied consistently (Properties page already does this correctly and can be used as the template).
21. **No error-tracking/telemetry wired in** — `ErrorBoundary.jsx` only logs to the browser console today; a code comment already flags this as a stand-in for Sentry/Datadog.
22. **Auth token stored in `localStorage` + a non-httpOnly cookie** — acknowledged in code as a temporary stand-in; should move to httpOnly cookies before go-live given this is a privileged admin portal.
23. **6 env flags used in code are undocumented in `.env.example`** (`VITE_USE_MOCK_SPACES/MAINTENANCE/VERIFICATIONS/ANNOUNCEMENTS/SETTINGS/NOTIFICATIONS`).
24. **No security headers configured** in `vercel.json` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) for a portal handling PII/payment data.
25. **No Node version pinned** (`engines` field / `.nvmrc`) — local build already runs on a Node version Vite 7 flags as unsupported.
26. **Demo password (`Admin123`) still hardcoded** in `src/lib/mock/people.js` — only a risk if `VITE_USE_MOCK_AUTH` is ever left `true` in a live deployment; worth removing or gating more explicitly.

## E. Nice-to-have polish

27. 3 cosmetic ESLint `react-refresh/only-export-components` warnings (README undercounts this as 1).
28. One JS chunk (511 KB / 160 KB gzipped) not yet code-split via `manualChunks`.
29. No request correlation-ID propagation beyond display purposes.
