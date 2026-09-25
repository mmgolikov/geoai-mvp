# COMPLETE25 product palette

Founder requirement: one active accent and two lighter shades, preserving white/grey and meaningful warning/error states.

- Active accent: `#087f8c`.
- Soft accent surface: `#e5fafa`.
- Pale accent surface: `#f4fbfb`.
- Small text on the soft surface uses neutral `#344054`: primary on soft only reaches 4.38:1, below 4.5:1. Primary on white/pale reaches 4.75:1 / 4.53:1.
- Borders and muted text use neutral grey, not extra green hues. Status warnings/errors and external geographic/material colors are not recoded into false monochrome semantics.
- Find selection uses active fill, white text and an outline; shortlist/hover use the soft surface and neutral text. Existing identifiers, selection state and geometry opacity are unchanged.
- Climate controls have a 44px minimum target. Temperature and humidity remain on distinct scales; mean/maximum lines also differ by dash pattern.

The static palette/contrast check and actual browser CSS assertions supplement, not replace, visual inspection. No authentication, data retrieval, generation geometry or saved-result schema changes are part of this palette patch. Final integrated browser results belong to the exact tested candidate, not to this note.
