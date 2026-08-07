# Alotel Spaces — Admin Portal

Operations portal for the Alotel Spaces property platform, built from the Figma admin design.

**Vite · React 19 (JavaScript/JSX) · React Router v6 · TanStack Query v5 · Zustand · Tailwind CSS v4 · Axios**

Runs entirely on a mocked backend out of the box — `npm install && npm run dev` is all you need. It is the sibling of [`alotel-frontend`](../alotel-frontend) (the guest-facing site) and mirrors its structure and conventions exactly.

---

## Quick start

```bash
npm install
cp .env.example .env      # optional: the defaults already work
npm run dev               # http://localhost:5174
```

Port 5174, so it can run alongside the guest frontend (5173).

| Script            | What it does                        |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Dev server with HMR on port 5174    |
| `npm run build`   | Production bundle into `dist/`      |
| `npm run preview` | Serve the built bundle on port 4174 |
| `npm run lint`    | ESLint over the whole project       |

### Demo accounts

Password for all three: **`Admin123`**. The login screen lists them as one-click buttons.

| Email                          | Level | Role              | Lands on       |
| ------------------------------ | ----- | ----------------- | -------------- |
| `m.davies@alotelspaces.com`    | 1     | Super Admin       | `/`            |
| `n.achebe@alotelspaces.com`    | 2     | Facility Manager  | `/`            |
| `k.asante@alotelspaces.com`    | 3     | Cleaner           | `/housekeeping`|

Sign in as each to see the sidebar and permissions change.

---

## Screens

24 screens, grouped exactly as in the Figma sidebar.

| Group | Screens |
| --- | --- |
| **Overview** | Dashboard · KPI Analytics |
| **Property management** | Properties · Add Property (7-step wizard) · Units & Rooms · Amenities · Pricing & Availability · Property Review |
| **Booking management** | Bookings · Guests · Check-ins/Check-outs · Check-out Reports · Contracts & E-Sign · Housekeeping · Calendar · Cancellations |
| **Financials** | Payments · Payouts · Revenue & Invoice · Tax Management |
| **Users & roles** | Staff Management · Roles & Permissions · Audit Log |
| **System** | Settings · Help |

Everything is interactive against the mock backend — the property wizard, the tax-rule builder with its live calculation preview, the check-out damage/deposit maths, the check-in photo flow, review moderation, staff CRUD and the housekeeping board all mutate real (localStorage-backed) state that survives a reload.

---

## Access control

Roles are **enforced, not decorative**. Capabilities are declared once in [src/lib/mock/people.js](src/lib/mock/people.js) and consumed in three places that cannot drift apart:

- the **sidebar** removes items the role can't open (not disabled — removed);
- the **route guard** ([ProtectedRoute.jsx](src/routes/ProtectedRoute.jsx)) rejects direct URL access;
- the **command palette** only searches permitted destinations.

Two distinct outcomes, deliberately kept separate: *not signed in* redirects to `/login` remembering the attempted URL; *signed in without permission* shows a 403 screen. A silent redirect would look like a broken link.

| | Level 1 | Level 2 | Level 3 |
| --- | :---: | :---: | :---: |
| Properties, bookings, guests | ✓ | ✓ | — |
| Housekeeping, units | ✓ | ✓ | ✓ |
| Financials, tax | ✓ | — | — |
| Staff, audit log | ✓ | — | — |

No level can view full card numbers — that is enforced in the data layer, not by permission. No screen is capable of rendering one.

---

## Project structure

```
src/
├── assets/styles/index.css     # Tailwind v4 entry + @theme design tokens
├── components/
│   ├── ui/                     # Button, Input, DataTable, Modal, Badge, Toggle…
│   ├── charts/                 # BarChart, DonutChart, validated palette
│   ├── layout/                 # AdminLayout, Sidebar, Topbar, CommandPalette
│   └── shared/                 # Logo, PageHeader, ListToolbar, Pagination…
├── features/                   # Feature-first modules — every route lives in one
│   ├── auth/  dashboard/  analytics/
│   ├── properties/  bookings/  finance/  people/  system/
│   └── …                       # each: components/ hooks/ services/ index.js
├── hooks/                      # useDebouncedValue, useMediaQuery, useHotkey…
├── lib/                        # apiClient, queryClient, queryKeys, storage, mock/
├── providers/                  # AppProviders, QueryProvider, AuthProvider
├── routes/                     # index.jsx, paths.js, navigation.js, ProtectedRoute.jsx
├── stores/                     # Zustand: auth (+capabilities), ui
├── utils/                      # classNames, format, validators, errors
├── App.jsx
└── main.jsx
```

### Conventions

Identical to the guest frontend:

- Components are `.jsx`; hooks, services and utilities are `.js`.
- **Named exports only** — no `export default` anywhere in `src/`.
- Every route belongs to a feature; there is no `pages/` folder.
- Each feature owns its `components/`, `hooks/`, `services/` and exposes a public API through `index.js`.
- Server state → TanStack Query. Client state → Zustand.
- Import from the root with the `@/` alias.

---

## Mock mode vs. a real backend

`VITE_USE_MOCK` decides which implementation each service uses. Both live side by side in the same file with an identical public surface, so **no component or hook changes** when you switch:

```js
const backend = env.useMock ? mockProperties : realProperties;
```

```dotenv
VITE_API_URL=https://api.your-backend.com
VITE_USE_MOCK=false
```

`src/lib/apiClient.js` attaches the bearer token, sends cookies, and on a 401 refreshes once and replays the original request — with concurrent 401s queued behind that single refresh.

---

## Design & brand

The palette, logo and typography come from the guest frontend; the admin adds only what a dense tool needs.

| Token | Value | Use |
| --- | --- | --- |
| `brand-700` | `#12603F` | Primary buttons |
| `brand-600` | `#1B6E4A` | Links, icons, active nav |
| `logo` / `logo-deep` | `#5AAA40` / `#2A4A20` | The logo lockup only |
| `canvas` / `surface` | `#F4F8F1` / `#FFFFFF` | Page and card backgrounds |
| `ok` / `warn` / `danger` / `info` | `#1F9254` / `#C8742A` / `#D14343` / `#2F6FED` | Status |
| `--font-display` / `--font-sans` | Poppins / Inter | Headings / UI |
| `--font-serif` | Georgia | Page titles + the "Alotel" wordmark |

The canvas is a lighter wash of the brand tint than the guest site (`#F4F8F1` vs `#E8F0E0`) — the admin is dense with white cards, and full-strength tint leaves too little separation between card and page.

### Sign-in screen

Full-bleed residence photography behind an opaque card. Two things worth knowing if you change the image:

- The scrim is **dark at the top and bottom, light through the middle** — the white brand bar and footer need protection, the card does not. A uniform scrim flattens the photo to solid green and defeats the point.
- Light type sitting directly on the photo uses the `text-on-photo` utility (a text shadow). A scrim alone can't be relied on, because the image crops differently at every viewport.

Swap the photo by changing `BACKGROUND` in [LoginPage.jsx](src/features/auth/components/LoginPage.jsx); it falls back to the brand gradient alone if the image fails to load.

### Charts

Chart colours were **validated, not chosen by eye** — see the reasoning in [src/components/charts/palette.js](src/components/charts/palette.js). The obvious "green, yellow, orange, blue" order fails the normal-vision separation floor because yellow sits next to orange (ΔE 13.7, floor 15). The shipped order separates them and clears every gate; the sub-3:1 contrast warning on two slots is discharged by direct labels, so colour never carries meaning alone.

The revenue chart is a **single series with emphasis** (one column accented, the rest recede) rather than a rainbow — the reader's question is "which day stands out", not "tell these seven days apart".

---

## Responsive behaviour

Verified at 390, 768 and 1280 px across every route — no horizontal scroll at any width.

- Sidebar: docked from `lg`, collapsible to an icon rail (persisted), overlay drawer below.
- Wide tables scroll inside their own card via `.table-scroll`; the page body never scrolls sideways.
- **Container queries** where viewport width is the wrong signal: the donut decides whether its legend sits beside or beneath the ring based on the *card's* width, not the screen's.
- The dashboard's three-panel row goes three-up only at `2xl` — at 1280 the bookings table's six columns would be squeezed into wrapping.

---

## Notes

- Route screens are lazily loaded per feature.
- `ErrorBoundary` wraps both the app root and the routed screen, keyed on pathname.
- Forms use React Hook Form + Zod schemas from [src/utils/validators.js](src/utils/validators.js).
- Settings save on change rather than behind a Save button — an admin switching 2FA off should not be able to walk away believing it stuck.
- Lint reports one `react-refresh` warning (`AuthProvider` exports a hook alongside its component) — cosmetic HMR advice.

## Deployment

Environment values are chosen by Vite's mode, so the same commands work locally
and on Vercel with nothing to remember:

| File | Loaded when | API it points at |
|---|---|---|
| `.env.development` | `npm run dev` | `http://localhost:8000/api/v1` |
| `.env.production` | `npm run build` (what Vercel runs) | `https://api.alotel.synoloopsolutions.com.ng/api/v1` |
| `.env.local` | always, but see precedence below | your own overrides — gitignored |

Vite's precedence runs lowest to highest:

```
.env  <  .env.local  <  .env.[mode]  <  .env.[mode].local
```

The mode file **beats** `.env.local`, which catches people out: a variable
declared in `.env.development` — even as an empty string — overrides the same
variable in `.env.local`. To override a committed value locally, put it in
`.env.development.local` (or `.env.production.local`), which wins over
everything and is also gitignored.

Both mode files are committed on purpose: every `VITE_` value is compiled into
the bundle and served to the browser, so none of it is secret. Anything that
*is* secret must never be a `VITE_` variable.

To point a deploy somewhere else, set `VITE_API_URL` in the Vercel project's
environment variables — dashboard values override the committed file at build
time. Verify a build picked up the right one with:

```bash
npm run build && grep -o 'https://[^"]*api/v1' dist/assets/*.js | head -1
```

`vercel.json` rewrites every path to `index.html`; without it a deep link like
`/properties/<id>` 404s on refresh, because the router only exists client-side.
