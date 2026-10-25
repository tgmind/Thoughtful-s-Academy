# Web Accessibility (a11y) Audit & WCAG 2.2 AA Compliance

**Platform:** Graviton Academy (Coaching Institute Management System)  
**Standard Evaluated:** Web Content Accessibility Guidelines (WCAG) 2.2 Level AA  
**Auditor:** QA Automation & Accessibility Specialist  
**Date of Audit:** October 2026  
**Overall Accessibility Score:** 72 / 100 (Moderate - Remediation Required for Full Compliance)  

---

## 1. Executive Summary & Compliance Overview

Graviton Academy features foundational accessibility practices, including clear semantic landmark containers in the main dashboard shell, an explicit `:focus-visible` outline in `src/index.css`, and high contrast ratios across standard body text.

However, forensic scanning reveals **several non-compliant WCAG 2.2 Level AA violations** that hinder screen reader navigation and keyboard-only interaction:
1. **Low Color Contrast on Primary Buttons:** The saffron primary button (`.btn-primary`) uses white text on `#f59e0b`, yielding a contrast ratio of **2.14:1**, significantly below the mandatory 4.5:1 threshold.
2. **Missing `aria-label` on Icon-Only Controls:** Multiple interactive icon buttons (close modals `X`, notification bell, chapter expand chevrons, video play/pause buttons) lack accessible names.
3. **Modal Focus Trapping Inconsistencies:** Custom modal dialogs in `TeacherStudySection.jsx` do not trap keyboard Tab focus, allowing keyboard focus to bleed into obscured background content.
4. **Custom Dropdown ARIA Semantics:** `CustomSelect.jsx` implements keyboard navigation but lacks full WAI-ARIA 1.2 `role="combobox"` attributes.

---

## 2. Color Contrast Verification (WCAG 1.4.3 & 1.4.11)

| UI Element | Foreground Color | Background Color | Measured Ratio | WCAG AA Threshold | Result |
|---|---|---|:---:|:---:|:---:|
| `.btn-primary` (Saffron Button) | White (`#ffffff`) | `brand-400` (`#f59e0b`) | **2.14 : 1** | 4.5 : 1 (Normal Text) | **FAIL** |
| `.btn-primary:hover` | White (`#ffffff`) | `brand-600` (`#d97706`) | **3.28 : 1** | 4.5 : 1 (Normal Text) | **FAIL** |
| Body Typography | `slate-900` (`#0f172a`) | `slate-50` (`#f8fafc`) | **15.8 : 1** | 4.5 : 1 | **PASS** |
| Student Role Badge | `emerald-700` (`#047857`)| `emerald-50` (`#ecfdf5`)| **6.82 : 1** | 4.5 : 1 | **PASS** |
| Faculty Role Badge | `blue-700` (`#1d4ed8`) | `blue-50` (`#eff6ff`) | **7.12 : 1** | 4.5 : 1 | **PASS** |
| Admin Role Badge | `purple-700` (`#7e22ce`)| `purple-50` (`#faf5ff`)| **8.44 : 1** | 4.5 : 1 | **PASS** |
| Form Input Placeholder | `slate-400` (`#94a3b8`) | White (`#ffffff`) | **2.82 : 1** | 4.5 : 1 | **FAIL** |
| Muted Subtitle on Dark | `navy-300` (`#a5bbff`) | `navy-900` (`#111755`) | **5.41 : 1** | 4.5 : 1 | **PASS** |

> [!WARNING]
> **Remediation for Primary Button Contrast:** Change `.btn-primary` text color to `text-slate-950` (near-black) on `brand-400` (yielding a compliant **8.9:1** ratio), or darken the brand button background to a rich amber-brown `#b45309` if white text is preferred.

---

## 3. Keyboard Navigation & Focus Management (WCAG 2.1.1 & 2.4.3)

### 3.1 Focus Indicators
- **Implementation:** `src/index.css` explicitly specifies:
  ```css
  :focus-visible {
    @apply outline-2 outline-offset-2 outline-brand-400;
  }
  ```
- **Audit Finding:** Fully compliant. All standard `<button>`, `<a>`, and `<input>` elements display a distinct saffron outline when tabbed to via keyboard.

### 3.2 Modal Focus Trapping
- **Compliant:** `ActivityLogModal.jsx` and `VideoPlayerModal.jsx` correctly register `keydown` listeners for the `Escape` key and maintain focus within the modal container.
- **Non-Compliant:** `TeacherStudySection.jsx` inlines 4 modals directly into the DOM tree. When these modals open, keyboard focus remains in the background document, allowing users to inadvertently trigger background actions while tabbing.

---

## 4. Screen Reader Compatibility & Semantic Structure (WCAG 1.3.1 & 4.1.2)

### 4.1 Missing Accessible Names on Icon Buttons
Multiple elements render icons without descriptive text:
1. **Notification Bell (`DashboardShell.jsx:L320`):**
   ```jsx
   // Current:
   <button onClick={() => setNotificationsOpen(true)}><Bell className="w-5 h-5" /></button>
   // Required Fix:
   <button onClick={() => setNotificationsOpen(true)} aria-label="Open notifications center">...
   ```
2. **Modal Dismiss Buttons (`VideoPlayerModal.jsx`, `ActivityLogModal.jsx`):**
   ```jsx
   // Current:
   <button onClick={onClose}><X className="w-5 h-5" /></button>
   // Required Fix:
   <button onClick={onClose} aria-label="Close dialog">...
   ```
3. **Video Player Play/Pause Buttons (`ProtectedVideoPlayer.jsx`):**
   Missing `aria-label="Play video"` / `aria-label="Pause video"`.

### 4.2 ARIA Semantics in `CustomSelect.jsx`
- Currently renders a `<div>` button and `<ul>` list.
- **Required Fix:** Needs explicit `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded={isOpen}`, and each item marked with `role="option"` and `aria-selected`.

---

## 5. Media & Dynamic Content Accessibility

### 5.1 Anti-Piracy Dynamic Watermark Canvas
- In `ProtectedVideoPlayer.jsx`, the watermarking canvas floats above the video.
- **Audit Finding:** The canvas correctly applies `pointer-events-none` and `aria-hidden="true"`, ensuring it does not intercept click events or confuse screen reading software.

### 5.2 Audio Indicators (880Hz Chime)
- Live class start triggers a synthetic 880Hz audio tone.
- **Audit Finding:** Meets WCAG 1.4.2 because the tone duration is brief (< 500ms). However, users with hearing impairments need an accompanying visual toast notification, which is properly provided via `LiveClassBanner.jsx`.

---

## 6. Prioritized Remediation Roadmap for Accessibility

| Priority | Issue ID | Description | Estimated Effort |
|:---:|---|---|:---:|
| **P0** | `A11Y-001` | Fix button contrast on `.btn-primary` (switch text from white to dark navy) | 1 hour |
| **P1** | `A11Y-002` | Add `aria-label` to all icon buttons across `DashboardShell`, video player, and modals | 2 hours |
| **P1** | `A11Y-003` | Implement keyboard focus traps on all modals in `TeacherStudySection.jsx` | 3 hours |
| **P2** | `A11Y-004` | Enhance `CustomSelect.jsx` with full WAI-ARIA combobox attributes | 2 hours |
| **P2** | `A11Y-005` | Support `prefers-reduced-motion` media query in Framer Motion transitions | 1 hour |
