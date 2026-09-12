# GeoAI — Short Landing Request Form Proposal

Status: Proposal only; no new form implementation, backend, persistence or submission authority.
Date: 2026-09-10
Authority: Founder feedback and [Sprint07 CR](SPRINT07_USER_JOURNEY_RECOVERY_CR.md).

## Proposed interaction

Keep two landing actions: **Open map** (primary) and **Leave a request** (secondary). The proposed secondary action opens a short accessible dialog; on a narrow screen it becomes a full-width sheet. It must not interrupt the map entry or require registration.

| Field | Control | Requirement | Behaviour |
|---|---|---|---|
| Full name | One text field, autocomplete name | Optional in the low-friction proposal | First and last name in the same field; no separate mandatory boxes |
| Profile | One dropdown | Optional in the low-friction proposal | Grouped choices below; no role-dependent extra questions |
| Email | Email field, autocomplete email | Required, as requested | Inline format validation; do not require a corporate domain |
| Phone | Telephone field, autocomplete tel | Optional, as requested | International number; do not assume country from location or citizenship |

The founder explicitly marked email as mandatory and phone as optional. Name/profile are proposed as optional to avoid adding an unstated lead requirement; the founder may choose to make either mandatory before implementation.

Dropdown groups:

- **Business:** Developer; Real estate fund / investor; Asset owner / manager; Consultant / broker; Infrastructure / public-sector professional; Technology / data partner.
- **Personal:** Buying / investing for myself; Renting / moving; Exploring an area.
- **Other / not specified.**

Profile is a contact-interest signal only. It does not grant product permissions, assign an account role or establish eligibility for any service.

## Copy and consent boundary

Title: **Talk to GeoAI**. Help: **Tell us how to reach you. We will contact you about your request.** Future submission label: **Send request**. Success must only appear after a confirmed accepted response from an approved destination. Failed submission retains the fields and offers a deliberate retry without duplicating a lead.

Before enabling submission, approve the receiving organisation/channel, privacy notice, purpose, retention/deletion period, processor access and any relevant consent language. No preselected marketing subscription, hidden analytics transmission, fingerprinting or automatically created account. Do not claim that a request was received while only preparing local text.

## Current implementation boundary

Sprint07 keeps the existing `/request-access` route and its truthful local-only request-brief workflow. It is not this new short form. The proposal is delivered for review; switching the landing CTA to a new transmitting form requires a separate explicit approval and verified destination. The existing map image, centered selection, three action bubbles and attribution are independently addressed in the landing layout correction.

## Acceptance when approved

Keyboard focus and Escape/close work; focus returns to the CTA; 393 px layout does not overflow; only email blocks submission when empty; optional fields can be omitted; errors are associated with fields; success is not fabricated; data is neither sent nor persisted before the explicit submit action; repeated submission is idempotent.
