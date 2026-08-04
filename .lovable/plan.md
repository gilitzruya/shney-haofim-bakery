# Bakery Wholesale Ordering App — Unified Build Plan

Hebrew (RTL) B2B ordering app for מאפיית שני האופים. One single Lovable project, frontend only, mock data, no backend.

## 1. Package inventory (verified)

15 HTML screens + 15 screenshots + 12 asset images + README. Every HTML file has a matching screenshot.

| # | Screenshot | HTML file | Role |
|---|---|---|---|
| 1 | 01-Home-Mobile | Bakery Home - Mobile | Dashboard / nav tiles |
| 2 | 02-Home-Tablet | Bakery Home - Tablet | Same, tablet layout |
| 3 | 03-Order-Catalog-Mobile | Order Catalog - Mobile | Product selection, sticky bottom bar |
| 4 | 04-Order-Catalog-Tablet | Order Catalog - Tablet | 2-col + sticky cart panel |
| 5 | 05-Order-Catalog-Desktop | Order Catalog - Desktop | Wider 2-col variant |
| 6 | 06-Order-Summary-Mobile | Order Summary - Mobile | Review + confirm |
| 7 | 07-Order-Summary-Tablet | Order Summary - Tablet | Side sticky panel |
| 8 | 08-My-Orders-Mobile | My Orders - Mobile | 3 tabs + filter chips |
| 9 | 09-My-Orders-Tablet | My Orders - Tablet | 2-col card grid |
| 10 | 10-Recurring-Orders-Mobile | Recurring Orders - Mobile | List / details / create / edit |
| 11 | 11-Recurring-Orders-Tablet | Recurring Orders - Tablet | 1fr / 1.35fr split |
| 12 | 12-New-Order-Flow-Mobile | New Order Flow - Mobile | Date + round picker |
| 13 | 13-Business-Details-Mobile | Business Details - Mobile | Profile form |
| 14 | 14-Contact-Mobile | Contact - Mobile | Contact/support |
| 15 | 15-Design-System-Showcase | Design System Showcase | Token/style reference |

Assets: `bakery-logo.png` (used in every header), color-palette reference, 4 inspiration images, 6 pasted reference images. Product photography is intentionally absent — designs use the diagonal-stripe placeholder pattern, which we reproduce exactly.

## 2. Screen consolidation

The 15 files are **9 logical screens** across 3 breakpoints. Mobile/Tablet/Desktop pairs are the same screen at different widths, so they collapse into one responsive route each — no duplicated device-specific pages.

```text
/                     Home
/new-order            New order flow (date + round)
/catalog?mode=...     Shared catalog: order | recurring_create | recurring_edit | onetime
/summary?mode=...     Shared summary + confirm
/orders               My Orders (tabs: קרובות / קודמות / מבוטלות)
/recurring            Recurring list (פעילות / לא פעילות)
/recurring/$id        Recurring details
/recurring/new        Recurring create — step 1 (days + round + name)
/recurring/$id/edit   Recurring edit
/business             Business details
/contact              Contact
/design-system        Style guide reference page
```

Flow: Home → New Order → Catalog(`mode=order`) → Summary → confirmation → My Orders.
Recurring: Recurring list → Create step 1 → Catalog(`recurring_create`) → Summary → back to list. Details → edit / one-time update reuse the same catalog+summary pair with a different mode.

## 3. Shared components (built once, used everywhere)

- `AppHeader` — hamburger, greeting, logo + name, sticky, `0 4px 12px rgba(74,31,45,.06)`
- `SideMenu` — drawer with the full nav list
- `Button` (primary / secondary / ghost / destructive / pill), `IconButton`
- `StatusChip` — draft/approved, needs-update/reopened, completed/cancelled palettes
- `Card` variants: active (white, solid border), muted (`#FBF8F3`, dashed border), attention (right accent `3px #8E3B5B` in RTL)
- `OrderCard` — card-header convention: title pinned right, chip pinned left
- `ProductCard` + `QuantityStepper` (unit: step 1, quick +5; kg: step 0.1 one-decimal, quick +0.5), selected and unavailable states
- `SearchField`, `CategoryPills` (scrollspy + smooth scroll + auto-scroll active pill)
- `SummaryBar` (mobile sticky bottom) and `SummaryPanel` (tablet/desktop sticky side) sharing one `useCart` source
- `Tabs`, `FilterChips`, `WeekdayChips`, `RoundSelector`, `FormField`
- `Modal` (confirm dialogs: pause, cancel, reactivate, one-time update, save changes, copy-as-new), `ActionMenu`, `Toast` (dark `#201518` pill), `Skeleton` (shimmer), `Spinner`, `EmptyState`, `ErrorState`

## 4. Design tokens

All values from the showcase go into `src/styles.css` as semantic tokens (oklch equivalents of the hex values) — no hardcoded colors in components.

- Colors: primary `#8E3B5B`, heading `#4A1F2D`, accent `#E8D1B2`, page bg `#EDEAE4`, canvas `#F8F2EB`, card `#FFFFFF`, border `#E5D8CC`, divider `#C9B8A8`, text `#201518`, muted `#7A666D`, success/warning/error/info pairs
- Typography: Rubik 400–700 via `<link>` in `__root.tsx`; scale 32/700, 18/700, 14/600, 13/400, 12/600, 10/400
- Spacing 4–24, radii 6/8/10/12/14/16/999, the two named shadows
- `dir="rtl"` + `lang="he"` on `<html>`; all directional spacing via logical properties

## 5. Conflicts and duplication found

- **Header, product card, stepper, status chips, order cards, modals** are re-declared inline in every one of the 15 files with 1–2px differences (icon buttons 34px mobile vs 38px tablet, product image 52 vs 56px, card title 13 vs 13.5px). Resolution: one component per element, size driven by a responsive prop/breakpoint — mobile values below `md`, tablet/desktop values above.
- **Catalog exists in 3 versions**; Desktop is a widened Tablet (same structure, wider grid). Resolution: one catalog, three-tier responsive grid.
- **Recurring Orders is a single file holding 4 views** (list/details/create/edit) toggled by state. Resolution: split into 4 routes as above.
- **My Orders encodes 19 demo states** via a `demoState` enum; Recurring and Business/Contact have their own enums. Resolution: mock data covers the realistic default states; loading/empty/error variants are supported by the shared state components rather than a state switcher, unless you want a demo toggle.
- No genuine visual conflicts: token values are consistent across all files.

## 6. Phased implementation

1. **Foundation** — RTL setup, Rubik font, full token set in `styles.css`, logo asset, app shell + header + side menu, `/design-system` route rendering every token and component (living verification against screenshot 15).
2. **Primitives** — buttons, chips, cards, form controls, modal, toast, skeleton, spinner, empty/error states.
3. **Home + static screens** — `/`, `/business`, `/contact` (screenshots 1, 2, 13, 14).
4. **Catalog** — mock product catalog (categories, unit vs kg pricing, unavailable items), product card, stepper, search, scrollspy pills, cart context, mobile bottom bar + tablet/desktop sticky panel (screenshots 3, 4, 5).
5. **Order flow** — `/new-order` date/round picker, `/summary` with per-mode labels, confirm + toast, mock order creation (screenshots 6, 7, 12).
6. **My Orders** — tabs, filter chips, order cards, copy-as-new modal, empty/loading/error, show-more (screenshots 8, 9).
7. **Recurring** — list, details with sticky action panel, create step 1 with 3-step progress bar, edit with inline steppers, all confirm modals, needs-attention and paused states (screenshots 10, 11).
8. **Polish pass** — side-by-side comparison of every route against its screenshot at 390px / 834px / desktop, RTL and Hebrew copy check, per-route SEO metadata.

## 7. Technical notes

- TanStack Start routes as listed; catalog/summary mode read from search params.
- State: React context for cart, orders, and recurring orders, seeded from `src/data/*.ts` mock modules.
- **Persistence: localStorage, no backend.** On first load the app hydrates from a versioned key (e.g. `bakery-demo-state:v1`); if nothing is stored, it seeds from the mock data and writes it. Every mutation — create/edit/confirm/cancel an order, create/edit/pause/reactivate/cancel/one-time-update a recurring order, and cart changes — writes the updated state back. Reopening the app restores the saved state instead of resetting. Hydration happens after mount (SSR-safe), a `resetDemoData` action restores the original mocks, and a bumped version key discards incompatible saved state.
- No Supabase, no Cloud, no auth. The greeting "שלום, מלון יהודה" is a mock constant.
- Product images stay as the CSS diagonal-stripe placeholder with the "תמונת מוצר" label, exactly as designed.
- Logo uploaded as a Lovable asset pointer rather than a repo binary.

