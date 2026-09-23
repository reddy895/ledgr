# TEST Ledgr v2 Design System

## Color Tokens

All tokens are defined in `app/globals.css` as CSS custom properties on `:root`.

### Background & Surface
| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `oklch(0.985 0.004 90)` | Page background |
| `--surface` | `oklch(1 0 0)` | Card / panel background |
| `--surface-2` | `oklch(0.975 0.006 90)` | Hover / subtle fill |
| `--surface-3` | `oklch(0.955 0.008 90)` | Progress bar track, empty rings |

### Text (Ink scale)
| Token | Value | Use |
|-------|-------|-----|
| `--ink` | `oklch(0.22 0.012 80)` | Primary text |
| `--ink-2` | `oklch(0.42 0.012 80)` | Secondary text |
| `--ink-3` | `oklch(0.58 0.012 80)` | Muted / caption text |
| `--ink-4` | `oklch(0.72 0.008 80)` | Expense bars, disabled |

### Borders
| Token | Value | Use |
|-------|-------|-----|
| `--hair` | `oklch(0.92 0.006 90)` | Default card border |
| `--hair-2` | `oklch(0.88 0.008 90)` | Input / button border |

### Brand (Green)
| Token | Value | Use |
|-------|-------|-----|
| `--brand` | `oklch(0.38 0.055 155)` | Primary brand, income bars |
| `--brand-2` | `oklch(0.46 0.06 155)` | Brand hover |
| `--brand-soft` | `oklch(0.94 0.025 155)` | Brand tint bg (active nav) |
| `--brand-ink` | `oklch(0.98 0.005 155)` | Text on brand bg |

### Semantic Colors
| Token | Value | Use |
|-------|-------|-----|
| `--pos` | `oklch(0.52 0.09 155)` | Positive / income amounts |
| `--pos-soft` | `oklch(0.94 0.03 155)` | Positive badge bg |
| `--neg` | `oklch(0.52 0.12 35)` | Negative / expense amounts |
| `--neg-soft` | `oklch(0.95 0.03 35)` | Negative badge bg |
| `--warn` | `oklch(0.68 0.11 75)` | Warning / Wants budget |
| `--warn-soft` | `oklch(0.95 0.04 75)` | Warning tint bg |
| `--info` | (daisyUI) | Savings / info budget |

### Dark mode
Dark mode overrides sit on `html[data-theme="dark"]` and shift all `--bg`, `--surface-*`, `--ink-*`, `--hair-*`, and `--brand-soft` to their dark equivalents.

---

## Typography System

Three font families are loaded via Next.js `next/font/google`:

| Role | Family | CSS class | Weight / Style |
|------|---------|-----------|----------------|
| Display / headings | **Fraunces** (optical-size serif) | `.display-serif`, `.display-italic` | 500 regular; 400 italic |
| UI / body | **Inter** | default `body` | 400–600 |
| Numbers / mono | **JetBrains Mono** | `.mono` | tabular-nums |

### Type Scale
| Use | Size | Class / notes |
|-----|------|---------------|
| Page title | 44px | `.page-title` (Fraunces 600) |
| Hero amount | ~48px | `.display-serif` inline style |
| Section heading | 17px | `.display-serif` |
| Card value large | 28–30px | `.display-serif` |
| Card value XL | 24px | amount component |
| Body | 14px | default |
| Caption / muted | 11.5–13px | `.muted` |
| Uppercase label | 11–11.5px | `letter-spacing: 0.06em; text-transform: uppercase` |

---

## Card Patterns

All cards use `.v2-card` base class. Common modifiers:

| Class | Description |
|-------|-------------|
| `.v2-card` | White bg, `--hair` border, `border-radius: 16px` |
| `.v2-card-pad` | Adds `padding: 22px 24px` |
| `.v2-card-hover` | Adds hover `border-color: --hair-2`, `box-shadow: --shadow-2` |

The **hero card** uses `padding: 28px 28px 16px` with a two-column grid: left = large serif amount + subtitle; right = area sparkline chart running edge-to-edge with negative margins.

Account cards add a 4px colored top bar (`height: 4px; background: account.color`) flush to the top edge, with `overflow: hidden` on the outer card.

---

## Component Patterns

### Amount Display
Inline `<span>` combining:
- Currency prefix in smaller, muted Inter (`opacity: 0.55`)
- Integer in Fraunces or JetBrains Mono
- Decimal in same font, `opacity: 0.45`
- Color: `--neg` when negative; `--pos` when positive + showSign; `--ink` otherwise

### Delta Badge
Pill with `border-radius: 100px`:
- Green bg (`--pos-soft`) + green text for positive (non-inverted)
- Red bg (`--neg-soft`) + red text for negative
- Tiny arrow icon + absolute value + `%`

### Progress Bar
Full-width track (`--surface-3` bg, `border-radius: 100`), colored fill. Turns `--neg` when `value > max`.

### Chips
`.chip` class: `border-radius: 100px`, `--surface` bg, `--hair-2` border, 12.5px.

### Category Icon Square
28×28px `border-radius: 8px`, `background: {color}1c` (10% opacity hex), `color: {color}`, centered icon.

### LegendDot
Inline-flex row: 8×8px `border-radius: 2px` colored square + 12px muted label.

### Buttons
`.btn` class (overrides daisyUI): `border-radius: 8px`, `border: 1px solid --hair-2`, `--surface` bg.
- `.btn-sm` — smaller padding
- `.btn-ghost` — transparent border/bg, `--ink-2` text
- `.btn-primary` — `--brand` bg, `--brand-ink` text

---

## Layout Structure

### Sidebar Navigation (`.v2-sidebar`)
- Fixed 220px left sidebar, full height
- Top: brand mark (28×28 rounded, Fraunces "ℓ") + wordmark
- Nav items: `.v2-nav-item` with 12px icon + 13.5px label
- Active: `.active` → `--brand-soft` bg, `--brand` text/icon
- Section labels: `.v2-nav-label` — tiny uppercase, muted

### Topbar (`.v2-topbar`)
- `padding: 20px 36px 16px`
- Left: `.page-title` (44px Fraunces 600) + `.page-sub` (13px muted)
- Right: filter controls (account picker, date range)

### Page View
- `flex-col` container, `height: 100%`
- Content area: `flex-1`, `padding: 0 36px 48px`, `overflow-y: auto`
- Component rows use CSS `grid` with `gap: 16px`

---

## Pages

### Dashboard

Layout (top → bottom):
1. **Hero row** — Net worth card (2-col grid: serif amount + area chart)
2. **Summary row** — 3 equal cards: Income, Expenses, Savings Rate
3. **Chart row** (2-col `1fr 320px`) — IncomeExpensesBars + "This period" sidebar
4. **Category row** (2-col `1fr 1fr`) — Donut + category list left; Accounts mini-list right
5. **Bottom row** (2-col `1fr 1.3fr`) — Upcoming recurring + Recent transactions
6. **Insight callout** — `--brand-soft` bg, sparkle icon, action buttons

### Transactions

Standard table layout with:
- Topbar filters: search, date range, account, category, type (income/expense/transfer)
- Table rows: date (day abbr + number), description + category pill + account dot, amount
- Bulk action bar (appears when rows selected)
- Inline edit via modal

### Budget

2-col layout (`2fr 1fr`):

**Left panel:**
- Header: title + month navigation arrows
- Waterfall bar: flex row of colored segments (brand=Needs, warn=Wants, info=Savings), `height: 40px`
- Legend dots + totals
- Category list grouped by Needs / Wants / Savings (icon square + name + progress bar + spent/budget + leftover indicator)

**Right sidebar:**
- "Expected left over" card: large serif amount + combined progress bar (spent=brand, leftover=pos tint)
- "Savings goals" card: named goals with progress bars + "New goal" button

### Accounts

3 summary cards (Total assets, Total debt, Net worth — net worth card uses dark `--ink` background).

Tabs: All / Checking / Savings / Credit cards / Investments.

3-column grid of `AccountCard`:
- 4px color bar top
- Icon (type-based) in colored circle
- Account name + type · bank · last4
- Balance label + Amount
- MiniSpark (20-point polyline, full width)
- In/Out/Transactions stats row (with `--hair` top border)
