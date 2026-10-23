---
version: alpha
name: Miden Drop
description: Private notes in a compact Bread Wallet mini app.
colors:
  miden-vermilion: "#f0440a"
  vermilion-deep: "#c93608"
  charcoal: "#171717"
  warm-paper: "#fcfbf8"
  surface-white: "#ffffff"
  muted-ink: "#5d5b57"
  hairline: "rgba(23, 23, 23, 0.2)"
  structural-line: "rgba(23, 23, 23, 0.62)"
  error-ink: "#a52b11"
  error-surface: "#fff0e9"
  disabled-surface: "#d8d5ce"
typography:
  task-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(29px, 7.3vw, 36px)"
    fontWeight: 600
    lineHeight: 1.16
    letterSpacing: "-0.035em"
  amount:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(42px, 11vw, 58px)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  result-amount:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(36px, 10vw, 52px)"
    fontWeight: 550
    lineHeight: 1.15
  claim-amount:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(36px, 9vw, 48px)"
    fontWeight: 550
    lineHeight: 1.2
  brand:
    fontFamily: "Manrope, sans-serif"
    fontSize: "19px"
    fontWeight: 750
  result-unit:
    fontSize: "20px"
    fontWeight: 500
  claim-unit:
    fontSize: "18px"
    fontWeight: 500
  input:
    fontSize: "16px"
    lineHeight: 1.6
  body:
    fontSize: "15px"
    lineHeight: 1.6
  field-label:
    fontSize: "14px"
    fontWeight: 650
  control:
    fontSize: "13px"
    fontWeight: 650
  helper:
    fontSize: "12px"
    lineHeight: 1.6
  compact-address:
    fontSize: "11px"
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "12px"
    lineHeight: 1.6
rounded:
  none: "0px"
spacing:
  micro: "8px"
  compact: "12px"
  surface: "20px"
  section: "28px"
  mobile-gutter: "24px"
  narrow-gutter: "18px"
  desktop-gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.vermilion-deep}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.charcoal}"
    textColor: "{colors.surface-white}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
    height: "52px"
---

# Design System: Miden Drop

## Direction

Miden Drop is an operational mini app inside Bread Wallet, also accessible by URL. The interface preserves the Local Proof identity: warm paper, white working surfaces, charcoal Manrope type, Miden vermilion, precise rules, and clipped primary actions. The main sequence is compose → share → receive or claim. Educational copy is disclosed in context.

The mini app starts with a task. It has no marketing hero, oversized proof illustration, or repeated brand footer. There is one primary action per state. No balance, history, connection, or transaction status is invented.

## Layout and navigation

Both `/` and `/send` open the same composer. `/receive` accepts a private link and `/claim` reviews, claims, or recovers the note. One column, at most 560px wide, serves wallet viewports and standalone browsers with the same information architecture.

The compact header contains the brand and Mainnet · Cedar label. Bread connection state lives in a separate ruled row, with account details and disconnect disclosed on demand. The persistent root wallet provider preserves connection across routes.

Create and Receive are labeled bottom destinations, with a vermilion active rule and semantic current-page state. Claim belongs to Receive and provides a back link. Navigation reserves space in the page and clears device safe areas. The app uses dynamic viewport height and supports browser zoom.

Horizontal gutters are 24px, 18px below 360px, and 32px in wide browser windows. Task groups have 28px gaps. Titles are left aligned and restrained; amount values have the strongest visual emphasis.

## Creation

The default form shows amount, token, balance or connection guidance, recovery-window summary, and the action. Drop options disclose recovery timing, an optional private message, and a price condition. No core field disappears on mobile. Recovery timing is an estimate in days; the actual threshold is a Miden block.

Fields lock while a transaction or encrypted upload is pending. An upload failure preserves the encrypted note in memory and offers a retry without enabling creation of another note. Creating a drop still requires wallet approval through the existing integration.

## Sharing and receiving

A successful creation replaces the form with amount, claim condition, recovery block, and the private link. Share opens native Web Share when available and falls back to copying. Copy remains explicit, and the complete link is selectable if clipboard access fails. QR and transaction data are disclosed on demand. Keep-link guidance explains how to recover an unclaimed drop.

Receive uses a multiline link field and reviews before requesting any claim. Claim screens retain amount, conditions, network, recovery threshold, and the private message. Loading, invalid link, missing drop, failure, claim success, and recovery success remain distinct states. The UI adds no persistent store of bearer secrets.

## Color, type, and shape

Vermilion marks identity and active state. Deep vermilion provides readable white primary-action text. Muted ink carries helpers; error ink on a pale warm surface communicates failures. Working surfaces use a single border and no shadow, gradient, or glass effect.

Manrope carries labels, prose, amounts, and headings. IBM Plex Mono is reserved for exact links and transaction data. Editable inputs use at least 16px type. Helper text uses 12–14px with open line spacing. Tracking never tightens beyond -0.04em.

Controls use authored SVG icons with 1.6px strokes. Primary actions clip opposing 8px corners; form boundaries stay rectangular so content and focus rings remain readable.

## Interaction and accessibility

Interactive targets are at least 44px tall, with 52px primary actions. Every form control is labeled. Disclosure buttons expose expanded state and panel relationships. Collapsed panels are inert and hidden from assistive technology; their fields stay mounted so values survive repeated opening and closing. Errors use alerts, balance and clipboard feedback use live regions, and the result heading receives focus after creation.

Focus uses a visible deep-vermilion outline; clipped primary buttons use an inset white outline. Hover behavior applies only to pointers that support hover. Mobile fields support appropriate keyboards without disabling zoom.

Motion for React provides a shared navigation indicator, interruptible 240ms disclosures, 120ms press feedback, and 160ms status/error transitions. A clipped private-note outline draws into a checkmark only after confirmed creation or claim; this 420ms sequence is the focal moment. Pending requests use an indeterminate note outline, never an invented percentage. There is no route exit animation or key on the wallet provider that would retain stale forms or remount a wallet session.

The implementation uses LazyMotion with the domMax feature bundle for shared layout, small m components, and a global MotionConfig with reducedMotion="user". Custom SVG, grid, and text transitions also check the user's reduced-motion preference and become immediate. CSS reduced-motion rules continue to disable smooth scrolling and incidental transitions. The only layout-driven animation is a small, user-triggered disclosure; repeated interactions reverse from the current visual position. Native wallet approval, share sheets, and actual financial transactions require verification in the host wallet as well as browser checks.
