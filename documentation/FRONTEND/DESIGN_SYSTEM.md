# Frontend Design System & UI Specifications

**Platform:** Graviton Academy (Coaching Institute Management System)  
**CSS Engine:** Tailwind CSS 3.4.14 with PostCSS 8.4.47  
**Typography:** Inter (Body/Sans) & Poppins (Display/Headings)  
**Icon Library:** Lucide React 0.454.0  
**Motion Library:** Framer Motion 11.11.11  

---

## 1. Design Philosophy & Visual Identity

Graviton Academy employs an academic yet modern aesthetic blending trust and vibrancy. The visual hierarchy utilizes a **Deep Navy (`#111755` - `#1e2771`)** foundation symbolizing authority, institutional reliability, and educational depth, contrasted with a warm **Saffron / Amber (`#f59e0b`)** accent representing intellectual optimism, energy, and Indian EdTech cultural resonance.

---

## 2. Color Palette & Token Definitions

### 2.1 Brand Primary & Accent Scale
Configured in `tailwind.config.js`:

| Token Name | Hex Code | Semantic Role | Tailwind Utility Class |
|---|---|---|---|
| `brand-50` | `#fffbeb` | Warm light tint / selected card background | `bg-brand-50` |
| `brand-100` | `#fef3c7` | Highlight badge container / soft alert | `bg-brand-100`, `text-brand-900` |
| `brand-400` | `#f59e0b` | **Primary Brand Accent (Saffron)**, CTA buttons, focus rings | `bg-brand-400`, `ring-brand-400` |
| `brand-600` | `#d97706` | Button hover state, active icons | `hover:bg-brand-600`, `text-brand-600` |
| `brand-900` | `#78350f` | High-contrast accent typography | `text-brand-900` |

### 2.2 Institutional Navy Scale

| Token Name | Hex Code | Semantic Role | Tailwind Utility Class |
|---|---|---|---|
| `navy-50` | `#f0f4ff` | Subtle dashboard section tint | `bg-navy-50` |
| `navy-100` | `#e0e9ff` | Divider lines, table header tint | `bg-navy-100` |
| `navy-200` | `#c7d7ff` | Inactive borders, card outlines | `border-navy-200` |
| `navy-300` | `#a5bbff` | Muted subtitle text on dark backgrounds | `text-navy-300` |
| `navy-600` | `#3b4cca` | Faculty portal accents, links | `text-navy-600` |
| `navy-700` | `#2d3a9e` | Secondary button outlines | `border-navy-700` |
| `navy-800` | `#1e2771` | Primary headers, dark card backgrounds | `bg-navy-800`, `text-navy-800` |
| `navy-900` | `#111755` | **Deep Institutional Navy**, global headers, desktop sidebar | `bg-navy-900` |

### 2.3 Role-Specific Semantic Theming
Each user portal features distinct role-tinted accents applied to avatars, badges, and dashboard header banners:

| Portal Role | Base Color | Tint Background | Border Color | Text Color | Gradient Avatar |
|---|---|---|---|---|---|
| **Student** | Emerald / Teal | `bg-emerald-50` | `border-emerald-200/80` | `text-emerald-700` | `from-emerald-600 via-teal-600 to-green-700` |
| **Faculty (Teacher)** | Blue / Indigo | `bg-blue-50` | `border-blue-200/80` | `text-blue-700` | `from-blue-600 via-indigo-600 to-cyan-700` |
| **Administrator** | Purple / Violet | `bg-purple-50` | `border-purple-200/80` | `text-purple-700` | `from-purple-600 via-indigo-600 to-violet-700` |

### 2.4 Status & Feedback Palette
- **Success / Approved / Present:** Emerald (`bg-emerald-500`, `text-emerald-700`, `bg-emerald-50`)
- **Warning / Pending / Trial:** Amber (`bg-amber-500`, `text-amber-700`, `bg-amber-50`)
- **Danger / Rejected / Absent:** Rose / Red (`bg-rose-500`, `text-rose-700`, `bg-rose-50`)
- **Information / Notice:** Sky / Blue (`bg-sky-500`, `text-sky-700`, `bg-sky-50`)
- **Neutrals / Canvas:** Slate (`bg-slate-50/70` for main body, `border-slate-200`, `text-slate-900`, `text-slate-600`)

---

## 3. Typography & Hierarchy

### 3.1 Font Families
- **Display / Headings (`font-display`):** `Poppins, sans-serif` (Google Fonts CDN loaded via `index.html`)
  - Used for `<h1>` through `<h6>`, hero titles, modal headers, KPI numbers, and navigation branding.
  - Weights: `font-semibold` (600), `font-bold` (700), `font-extrabold` (800).
- **Body / Interface (`font-sans`):** `Inter, system-ui, sans-serif`
  - Used for paragraphs, table data, form labels, input values, badges, and tooltips.
  - Weights: `font-normal` (400), `font-medium` (500), `font-semibold` (600).

### 3.2 Type Scale Hierarchy

| Element | Size (px) | Tailwind Utility | Line Height | Tracking | Weight | Example Context |
|---|---|---|---|---|---|---|
| Hero Title | 36 - 48px | `text-4xl md:text-5xl` | 1.15 | `-0.02em` | 800 (Bold) | Landing Page Hero |
| Page Heading (H1) | 28 - 32px | `text-2xl md:text-3xl` | 1.25 | `-0.01em` | 700 (Bold) | Dashboard Topbar |
| Section Header (H2)| 20 - 24px | `text-xl md:text-2xl` | 1.3 | Normal | 600 (Semibold)| Card Section Header |
| Subsection (H3) | 16 - 18px | `text-base md:text-lg` | 1.4 | Normal | 600 (Semibold)| Module Card Title |
| Body Text | 14 - 16px | `text-sm md:text-base` | 1.5 | Normal | 400 (Regular) | Lecture Description |
| Secondary / Meta | 12 - 13px | `text-xs md:text-sm` | 1.4 | Normal | 500 (Medium) | Timestamp, UTR Number |
| Micro / Pill Badge| 10 - 11px | `text-[10px] md:text-xs`| 1.0 | `0.05em` | 700 (Bold) | Status Pill, Role Tag |

---

## 4. Spacing, Elevation & Layout Grid

### 4.1 Spacing Scale
Built on the 4px baseline grid (`rem` based):
- `p-1` (4px), `p-2` (8px): Badge padding, icon button padding.
- `p-3` (12px), `p-4` (16px): Compact card padding, table cell padding.
- `p-6` (24px): Standard dashboard widget and modal content padding.
- `p-8` (32px), `p-12` (48px): Page section padding and landing hero.

### 4.2 Elevation & Shadow Hierarchy
- **Card Flat:** `border border-slate-200/80 bg-white shadow-sm`
- **Interactive Card Hover:** `hover:shadow-md hover:-translate-y-0.5 transition-all`
- **Floating Overlays & Popovers:** `shadow-lg border border-slate-100` (`NotificationPopup`, dropdowns)
- **Modals & Drawers:** `shadow-2xl bg-white` (`ActivityLogModal`, `VideoPlayerModal`)
- **Dark Mode Elevation:** `shadow-navy-950/20` subtle atmospheric glow.

---

## 5. Standard Component Class Tokens (`src/index.css`)

### 5.1 Buttons
- **`.btn-primary`:**
  ```css
  @apply inline-flex items-center justify-center gap-2
         bg-brand-400 hover:bg-brand-600 text-white
         font-semibold px-5 py-2.5 rounded-lg
         transition-all duration-200 ease-in-out
         disabled:opacity-50 disabled:cursor-not-allowed
         focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2;
  ```
- **`.btn-outline`:**
  ```css
  @apply inline-flex items-center justify-center gap-2
         border-2 border-navy-800 text-navy-800
         hover:bg-navy-800 hover:text-white
         font-semibold px-5 py-2.5 rounded-lg
         transition-all duration-200 ease-in-out
         disabled:opacity-50 disabled:cursor-not-allowed;
  ```

### 5.2 Form Inputs
- Standard Input:
  ```css
  border border-slate-300 rounded-lg px-4 py-2.5 text-sm
  focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none
  transition-colors duration-150 bg-white text-slate-900 placeholder:text-slate-400
  ```

---

## 6. Motion & Animation Tokens

Configured in `tailwind.config.js` and `framer-motion`:
- **`slideInRight`:** `slide-in-right 0.3s ease-out` (Mobile navigation drawer slide-in).
- **`fadeIn`:** `fade-in 0.2s ease-out` (Toast notifications, modal backdrops).
- **`pulseSoft`:** `pulse-soft 2s ease-in-out infinite` (Live stream indicator beacon).
- **Framer Motion Page Transitions:**
  ```jsx
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.2 }}
  ```
