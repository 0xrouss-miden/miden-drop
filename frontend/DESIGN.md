---
version: alpha
name: Miden Drop
description: Calm private payments shaped by local proof.
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
typography:
  landing-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(62px, 6.6vw, 96px)"
    fontWeight: 570
    lineHeight: 0.96
    letterSpacing: "-0.04em"
  supporting-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(24px, 2.4vw, 36px)"
    fontWeight: 570
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(58px, 5.7vw, 88px)"
    fontWeight: 570
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  section-headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(44px, 5vw, 74px)"
    fontWeight: 570
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  task-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(42px, 6vw, 64px)"
    fontWeight: 570
    lineHeight: 1
    letterSpacing: "-0.04em"
  amount:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(48px, 4.5vw, 68px)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.04em"
  body-large:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(17px, 1.4vw, 20px)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.4
  control:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  data:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  micro: "8px"
  compact: "12px"
  control-x: "24px"
  surface: "28px"
  section: "34px"
  mobile-gutter: "22px"
  desktop-gutter: "84px"
components:
  button-primary:
    backgroundColor: "{colors.miden-vermilion}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.none}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.vermilion-deep}"
    textColor: "{colors.surface-white}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "48px"
  composer-surface:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.none}"
    padding: "22px 28px 18px"
    width: "500px"
---

# Design System: Miden Drop

## Overview

**Creative North Star: "Local Proof"**

Miden Drop makes private value feel like a calm, credible consumer action. The interface is editorial rather than dashboard-like: generous warm paper, decisive charcoal type, and one Miden vermilion voice carry the promise while proof appears as stippled geometry, exact node lines, and visible structure behind the work.

The system is spacious but operational. Large, low-weight Manrope headlines establish confidence; clipped financial surfaces and hairline rules organize the payment lifecycle without soft-card ornament. The recurring story is understand, compose, share, then receive or claim. Technical ideas are progressively disclosed and never allowed to make the primary action feel complex.

**Key Characteristics:**

- Warm paper and white working surfaces against charcoal type.
- Vermilion reserved for action, proof, active state, and precise emphasis.
- Manrope for the product voice; IBM Plex Mono only for links and bearer data.
- Clipped corners, thin structural rules, stippled commitments, and authored line icons.
- Explicit prototype disclosures wherever a control does not complete a real transaction, import, scan, or claim.

## Colors

The palette is a warm neutral field with a single high-energy vermilion accent and two strengths of charcoal linework.

### Primary

- **Miden Vermilion:** The sole action and proof color, used for primary controls, active indicators, focus outlines, punctuation accents, nodes, and commitment geometry.
- **Deep Vermilion:** The hover and connected-state response for vermilion interactions; use it to deepen the existing accent, never to introduce a second accent family.

### Neutral

- **Charcoal:** Primary text, strong icons, dark fills, and maximum-contrast interaction states.
- **Warm Paper:** The page canvas and inverted text on charcoal hover states.
- **Surface White:** Operational forms, result surfaces, comparison cells, and workspaces.
- **Muted Ink:** Supporting explanation, metadata, helper text, and inactive state labels.
- **Hairline:** Quiet dividers and local containment.
- **Structural Line:** Boundaries that must read as controls or financial surfaces.

### State

- **Error Ink:** Inline validation and error messaging. Error backgrounds may tint toward vermilion, but the semantic text color remains distinct from the primary action accent.

**The One Vermilion Voice Rule.** Vermilion means action, proof, active state, or a pinpoint of emphasis; broad secondary decoration does not compete with it.

**The Warm Canvas Rule.** Use warm paper for the environmental canvas and white only for working surfaces that need separation.

## Typography

**Display Font:** Manrope (with sans-serif fallback)
**Body Font:** Manrope (with sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** Manrope supplies an editorial, approachable financial voice through low-to-medium display weights and tight tracking. IBM Plex Mono is a narrow semantic exception for link payloads and data-entry content, not a decorative technology cue.

### Hierarchy

- **Display:** Large, balanced promise and claim headlines; tightly tracked and set just under solid line height. On compact mobile screens the implementation resolves this role to 47px.
- **Section Headline:** Major receive and continuation headings with the same tight editorial construction at a smaller responsive scale.
- **Task Title:** Compact send and receive headings, centered above the one operational workspace.
- **Amount:** Oversized numeric input and payment value, kept direct and unornamented.
- **Body Large:** First-view explanation, constrained to roughly 560px so it remains a quick read.
- **Body:** Section explanations, generally held near 52–55 characters and given open line spacing.
- **Label:** Controls, navigation, metadata, and state language. Use weight for hierarchy before introducing uppercase; uppercase is reserved for short machine-like field states.
- **Control:** Selected values and concise field content inside task workspaces.
- **Data:** Claim links and pasted bearer data only.

**The Mono Means Bearer Data Rule.** IBM Plex Mono appears only where the content behaves like a link payload or exact data value; product prose, labels, and headings stay in Manrope.

## Layout

The product uses separate persuasive and operational surfaces. The `/` first viewport is an asymmetric landing composition: product promise and routed actions on the left, proof geometry and a concise private-note explanation on the right. The landing page owns the full explanation of the private payment model and lifecycle. `/send`, `/receive`, and `/claim` are deliberately quiet, single-column task surfaces: a short title followed by one compact workspace and one primary action. Proof geometry belongs to the landing context; it does not compete with data entry or review on operational screens.

Horizontal page gutters are fluid from 22px to 84px. Repeated component spacing uses an 8–12px micro rhythm, 22–28px surface padding, and 34px grouping gaps. Large continuation sections use materially more air, while form rows remain compact and scan-oriented.

At 1120px, navigation moves to its own ruled row, the explanation stack becomes one column, and result content reflows. At 820px, hero, receive, and claim layouts become single-column; the proof field remains oversized and is cropped by the page. At 520px, primary hero actions stack full-width, the optional private-message field is hidden, comparison and lifecycle flows turn vertical, and labels shorten where space is constrained.

**The Proof Behind Work Rule.** Commitment geometry may cross, crop, or sit behind an operational surface, but it never interrupts form legibility or becomes a separate explanatory spectacle.

## Elevation & Depth

The system is flat by default and uses no ambient card shadows. Depth comes from the contrast between warm paper and white working surfaces, 1px hairlines, stronger control boundaries, overlap, clipping, and the proof field passing behind the composer. A one-pixel ring around the illustrative QR and an inset vermilion tab indicator are local boundaries, not elevation tokens.

**The Flat Financial Surface Rule.** Working surfaces are separated by tone, border, and overlap; do not add diffuse shadows or glass effects.

## Shapes

Rectangular surfaces use architectural clipping instead of conventional rounding. Primary actions clip opposing 10px corners, wallet controls clip 8px corners, and major work surfaces clip 14–16px corners. Process numbers use an octagonal outline, currency uses a compact hexagonal mark, and proof nodes remain square or circular according to their structural role.

Icons are authored 1.6px SVG strokes with round caps and joins. They support labels and never replace critical text. Proof geometry uses 1px lines, square nodes, dot fills, and translucent facets.

**The Clipped, Never Cushioned Rule.** Use straight edges and opposing clipped corners for controls and financial surfaces; avoid pill buttons and soft rounded-card grids.

## Components

### Buttons

- **Primary:** A full vermilion field, at least 48px tall, with bold Manrope text, a 24px horizontal inset, a 10px opposing-corner clip, and an authored arrow where forward motion is useful. Hover deepens to vermilion and lifts 2px; disabled state becomes neutral gray and does not lift.
- **Secondary:** Transparent with a structural 1px charcoal boundary. Hover inverts to charcoal over warm paper and lifts 2px.
- **Wallet:** Transparent, structurally bordered, and clipped by 8px. Connected state changes the boundary and text to vermilion; connecting state is disabled and visibly subdued.
- **Focus:** Every interactive element receives a 2px vermilion outline with a 3px offset. Focus remains visible independently of hover.

### Cards / Containers

- **Composer:** A nearly opaque white operational surface with a structural border, 14px opposing-corner clips, and compact row dividers. It floats through overlap, not shadow.
- **Receive and Claim Workspaces:** White, structurally bordered surfaces using the same clipping language. They preserve clear heading, details, action, status, and disclosure zones rather than becoming generic cards.
- **Result Surface:** A larger clipped continuation surface that reveals only after valid form submission and separates link, illustrative QR, and lifecycle status.

### Inputs / Fields

- **Amount:** Borderless inside a divided composer section, large enough to read as the primary value. Invalid content uses `aria-invalid`, a stable live error area, and Error Ink.
- **Structured Rows:** A 66px minimum-height grid with icon, label/value, and optional state. Static information does not pretend to be interactive.
- **Link Input:** IBM Plex Mono, structurally bordered, and paired edge-to-edge with the review action on wider screens; it stacks with a complete border on compact mobile.
- **State:** Validation is immediate but restrained. Disabled, waiting, active, copied, scanner-preview, and claim-preview states keep their status text explicit.

### Navigation

The header uses a three-part grid on wide screens: brand, routed Send/Receive/Testnet navigation, and wallet state. Send and Receive always navigate to `/send` and `/receive`; neither is embedded into the landing. Links use a 1px vermilion underline that draws from left to right over 220ms and remains visible for the active route. Below 1120px the nav becomes a second ruled row; below 820px it scrolls horizontally if needed while the network label stays visible. A connected wallet uses a non-interactive address status paired with an explicit Disconnect button, so the address itself never behaves like an ambiguous toggle. On compact screens the address label collapses while the Disconnect action remains named and available. The wallet provider belongs to the persistent root layout, never an individual route: route transitions must not unmount the adapter or trigger a new authorization.

### Proof Field

The signature proof field is a responsive authored SVG: a faceted commitment volume composed of 1px structural lines, square and circular nodes, and dense 7px stipple cells. It inherits vermilion and draws once over 1200ms with a fast-out easing. The compact claim variant is lower-opacity and more distant so the claim surface stays dominant.

### Process and Visibility

The lifecycle is one connected ordered sequence, not three independent cards. Each stage uses an outlined octagonal number and a connecting rule. The adjacent visibility comparison uses two small ruled cells to distinguish private participant data from the network-visible commitment and proof.

### Status and Prototype Disclosure

Errors use `role="alert"`; generated results and preview changes use polite status regions. Any illustrative QR, preview link, scanner, unsubmitted transaction, unimported payload, or unimplemented claim must be labeled in-place with plain language. Expiration recovery is product truth but is not presented as a working control until implemented.

Motion is restrained and structural: 180ms interaction transitions, 220ms navigation rules, a 500ms clipped result reveal, and a 1200ms proof-line draw. `prefers-reduced-motion` removes smooth scrolling and reduces animations and transitions to a single near-instant frame.

**The Prototype Honesty Rule.** A control may demonstrate interface state, but adjacent copy must say when no transaction, camera capture, payload import, or claim has actually occurred.

## Do's and Don'ts

### Do:

- **Do** make the consumer action dominant and let proof remain visible as quiet structure.
- **Do** use warm paper, white working surfaces, charcoal type, and one vermilion accent consistently.
- **Do** preserve the understand → compose → share → receive/claim sequence across responsive layouts.
- **Do** keep controls semantic, labeled, keyboard-focusable, and explicit about status and prototype limits.
- **Do** use authored line icons, clipped corners, hairline rules, and stippled proof geometry as a coherent family.

### Don't:

- **Don't** turn private-note mechanics into prerequisite jargon or a dense technical dashboard.
- **Don't** use IBM Plex Mono for headings, navigation, or atmospheric decoration.
- **Don't** introduce pill controls, soft rounded-card grids, diffuse shadows, gradients, or competing accent colors.
- **Don't** present preview links, QR patterns, scanner state, transactions, imports, claims, or recovery as live capabilities when they are illustrative or not implemented.
- **Don't** let the proof field reduce form contrast, intercept input, or become more important than the payment action.
