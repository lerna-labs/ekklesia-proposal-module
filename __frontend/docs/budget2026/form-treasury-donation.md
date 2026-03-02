# Budget 2026 — Treasury Donation (form section)

---

| Field            | Detail                                                                 |
|------------------|------------------------------------------------------------------------|
| **Version**      | 1.0.0                                                                  |
| **Created**      | 2025-03-02                                                             |
| **Last Revised** | 2025-03-02                                                             |
| **Component**    | `__frontend/src/lib/forms/budget2026/FormTreasuryDonation.svelte`       |

---

Form section component: `__frontend/src/lib/forms/budget2026/FormTreasuryDonation.svelte`.

Describes the form fields used in this section: path in `formData`, type, constraints, and visibility.

---

## Fields

| Field | formData path | Type | maxLength | required | public |
|-------|----------------|------|-----------|----------|--------|
| Treasury Donation Verification Hash | `formData.metaData.treasuryDonationTxHash` | text | 64 | yes | yes |
| Treasury donation confirmed | `formData.metaData.treasuryDonationConfirmed` | checkbox | — | yes | yes |

---

## Field details

### Treasury Donation Verification Hash
- **Path:** `formData.metaData.treasuryDonationTxHash`
- **Label:** Treasury Donation Verification Hash
- **Description:** The transaction hash confirming the required 1000 ada donation to the Cardano Treasury. This serves as proof of wallet control and commitment.
- **Type:** `text` (Input)
- **maxLength:** 64
- **required:** yes
- **public:** yes
- **min/max:** —

### Treasury donation confirmed
- **Path:** `formData.metaData.treasuryDonationConfirmed`
- **Label:** I confirm that I have made the required 1,000 ADA non-refundable donation to the Cardano Treasury, understand that this donation is required only to participate in the process and does not guarantee proposal approval, funding, or execution, and confirm that I am submitting this proposal using the same wallet that made the donation.
- **Description:** (same as label — confirmation checkbox)
- **Type:** `checkbox` (boolean)
- **maxLength:** —
- **required:** yes
- **public:** yes
- **min/max:** —

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version numbers use the form **MAJOR.MINOR.PATCH** as described in the Versioning section above.

| Version | Date       | Description |
|---------|------------|-------------|
| 1.0.0   | 2025-03-02 | Initial doc: Fields table and field details for Treasury Donation section. |
