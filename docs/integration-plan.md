# Ekklesia Budget Module — Integration Plan

---

| Field              | Detail                         |
|--------------------|--------------------------------|
| **Document Title** | Ekklesia Integration Plan      |
| **Version**        | 0.2.0                          |
| **Created**        | February 3, 2026               |
| **Last Revised**   | February 4, 2026               |
| **Companion Doc**  | API Specification              |
| **Prepared By**    | Adam Dean · adam@crypto2099.io |
| **Status**         | Draft                          |

---

## 1. Purpose & Objectives

The Budget Module does not re-implement authentication or DRep identity. It integrates with the existing Ekklesia
platform as the single source of truth for both. This document defines exactly how that integration works, what the
Budget Module depends on, and how errors or outages in the upstream system are handled.

**Integration objectives:**

- Reuse Ekklesia DRep identity verification without duplicating registration logic.
- Delegate wallet-signature authentication to a shared, battle-tested flow already available in Ekklesia.
- Keep the Budget Module decoupled so it can be deployed and scaled independently.
- Define clear fallback behaviour so the Budget Module degrades gracefully when Ekklesia is unavailable.

---

## 2. Integration Scope

| Capability           | How the Budget Module uses it                                                                                                                       |
|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| **DRep Identity**    | Budget Module queries Ekklesia to confirm whether a wallet address is a registered DRep and to retrieve the associated DRep ID.                     |
| **Wallet Signature** | The nonce-challenge → sign → verify flow is implemented by Ekklesia; the Budget Module calls it to authenticate any user who wishes to comment.     |
| **CLI Signing Path** | Users who cannot connect a CIP-30 wallet can sign via the Cardano CLI. Ekklesia exposes the same verification endpoint for CLI-produced signatures. |

---

## 3. DRep Authentication Flow

When a user logs in claiming DRep status, the Budget Module performs the following steps:

1. User initiates login and presents their wallet address.
2. Budget Module calls the Ekklesia DRep-lookup endpoint, passing the wallet address.
3. Ekklesia returns the DRep record if the address is a registered DRep, or a `404` / empty result otherwise.
4. If confirmed, the Budget Module stores the DRep ID (in `drep1…` bech32 format) alongside the session; the user's role
   is set to **DRep**.
5. If not confirmed, the user is treated as a standard **Viewer** for the remainder of the session.

> **Note:** The Budget Module never caches DRep status for longer than the session. DRep status is re-verified on each
> new session.

---

## 4. Wallet-Signature Authentication Flow

This flow governs any action that requires authentication: commenting and (for Proposers) publishing or withdrawing
proposals. The first step — obtaining a nonce — is performed via the dedicated `POST /auth/nonce` endpoint (API Spec
§4.1). The remainder of the flow uses the nonce to produce and verify a signature.

1. Client calls `POST /auth/nonce`, supplying an `identifier_type` (`wallet` or `drep`) and the corresponding
   `identifier` (wallet address or `drep1…` bech32 ID).
2. Budget Module generates a cryptographically random nonce, associates it with the identifier and a 5-minute TTL, and
   returns both the `nonce` and its `expires_at` timestamp to the client.
3. Client signs the nonce using either a **CIP-30 wallet extension** or the **Cardano CLI**.
4. Client submits the signed request to the target write endpoint, including the `nonce` and `signature` in the
   `Authorization` header (API Spec §5).
5. Budget Module forwards the `(nonce, signature, identifier)` tuple to the Ekklesia signature-verification endpoint.
6. Ekklesia returns success or failure.
7. **On success:** the action is permitted and the authenticated identity is recorded with the action. **On failure:**
   HTTP `401` is returned and the nonce is invalidated.

> **Note:** Anonymous comments are explicitly prohibited. The backend must reject any comment request that has not
> passed this verification.

### Sequence Diagram (Textual)

```
Client                  Budget Module           Ekklesia
  │                          │                      │
  │── POST /auth/nonce ─────>│                      │
  │   {identifier_type,      │                      │
  │    identifier}           │                      │
  │<─ {nonce, expires_at} ───│                      │
  │                          │                      │
  │── sign(nonce) ───────────│                      │
  │   (CIP-30 or CLI)       │                      │
  │                          │                      │
  │── POST /…/comment ──────>│                      │
  │   Authorization:         │                      │
  │   Signature|DRep         │                      │
  │   id:sig:nonce           │                      │
  │                          │── verify(nonce,      │
  │                          │   sig, id) ─────────>│
  │                          │<─── OK / FAIL ───────│
  │<─── 201 or 401 ──────────│                      │
```

---

## 5. Ekklesia Service Contract (Dependencies)

The Budget Module depends on the following Ekklesia-provided capabilities. If any are unavailable, the behaviour
described in the **Degraded Mode** column applies.

| Service          | Provides                                                                  | Degraded Mode                                                                              |
|------------------|---------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| DRep lookup      | Verify DRep status + retrieve ID                                          | User treated as Viewer; DRep badge not shown.                                              |
| Signature verify | Validate CIP-30 / CLI signatures                                          | Commenting blocked; read-only access remains.                                              |
| Nonce issuance   | Issues nonces via `POST /auth/nonce`; managed internally by Budget Module | N/A — no external dependency. Nonce endpoint remains available even when Ekklesia is down. |

---

## 6. Error & Timeout Handling

- **Timeouts:** Ekklesia calls time out at **5 seconds**. If exceeded, the Budget Module returns an appropriate error
  and does not block the user's session.
- **Retries:** Up to **2 automatic retries** with exponential back-off for transient `5xx` errors from Ekklesia.
- **Full outage:** If Ekklesia is fully unavailable, the Budget Module continues to serve all public (read) data and
  displays a clear UI banner:

> *"Authentication temporarily unavailable – please try again later."*

---

## 7. Security Considerations

- Nonces are **single-use** and expire after 5 minutes.
- All communication between the Budget Module and Ekklesia uses **TLS 1.2+**.
- The Budget Module stores only the identity fields required for the authenticated session: a wallet address for
  wallet-signature users, or a `drep1…` bech32 DRep ID for DRep-credential users (a DRep session does not necessarily
  carry a wallet address). It never stores private keys or raw signatures beyond the verification request.
- Admin wallet addresses are **pre-registered** in the backend; there is no self-service admin registration path.

> **Note:** A formal security audit is not in scope for the current phase of development.

---

## 8. Open Items & Decisions Required

| ID    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                            |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| OI-01 | Ekklesia DRep-lookup endpoint URL and authentication credentials need to be supplied by the Ekklesia team before integration work begins.                                                                                                                                                                                                                                                                                                              |
| OI-02 | Confirm whether the Ekklesia signature-verification endpoint supports both CIP-30 and CLI signatures in a single call, or requires separate paths.                                                                                                                                                                                                                                                                                                     |
| OI-03 | Agree on the exact DRep-status cache TTL (currently proposed: session-only, no persistent cache).                                                                                                                                                                                                                                                                                                                                                      |
| OI-04 | ~~Budget Template category taxonomy must be finalised so that the filter options in the API and UI are accurate.~~ **Resolved:** Categories are now defined per budget cycle and served via a dedicated `GET /budgets/{budget_id}/categories` endpoint. Each category object carries its own `name`, `value`, `description`, and `sort_order` — no global taxonomy is required, and the frontend can cache the response for the lifetime of the cycle. |

---

## Appendix A — Acceptance Criteria Alignment

The following checklist confirms that this document and the companion API Specification together cover the expected
scope for the integration and API surface of the Budget Module.

| Acceptance Criterion                                            | Covered In           | Status |
|-----------------------------------------------------------------|----------------------|--------|
| API spec covers proposal listing & detail endpoints             | API Spec §3.3 / §3.4 | ✓      |
| API spec covers budget categories endpoint                      | API Spec §3.2        | ✓      |
| API spec covers nonce endpoint                                  | API Spec §4.1        | ✓      |
| API spec covers comment endpoint                                | API Spec §3.5 / §5.1 | ✓      |
| API spec covers status model (Draft / Live / Withdrawn ×2)      | API Spec §3.3 / §6   | ✓      |
| Integration plan describes DRep authentication flow             | This doc §3          | ✓      |
| Integration plan describes wallet-signature authentication flow | This doc §4          | ✓      |
| Open items requiring resolution are documented                  | This doc §8          | ✓      |

---

## Revision History

Versioning follows [Semantic Versioning 2.0.0](https://semver.org). While the document remains in `0.x.x`, minor
versions indicate new or restructured sections and patch versions indicate corrections or clarifications with no change
to substance.

| Version | Date       | Author    | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|---------|------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0.2.0   | 2026-02-04 | Adam Dean | Rewrote §4 authentication flow to make `POST /auth/nonce` (API Spec §4.1) the explicit first step — steps 1–2 now describe the endpoint call and its `nonce` + `expires_at` response. Updated sequence diagram to show the full `POST /auth/nonce` request/response and the `Authorization` header on the write call. Updated §5 nonce-issuance service-contract row to reference the endpoint and note it remains available during Ekklesia outages. Added nonce-endpoint row to Appendix A; updated comment-endpoint and status-model cross-refs to match API Spec renumbering (§5.1, §6). |
| 0.1.5   | 2026-02-04 | Adam Dean | Updated §3 step 4 to specify `drep1…` bech32 format for stored DRep IDs. Rewrote §7 security bullet on stored identity to clarify that DRep-credential sessions carry only a `drep1…` ID and do not necessarily include a wallet address.                                                                                                                                                                                                                                                                                                                                                    |
| 0.1.4   | 2026-02-04 | Adam Dean | Updated OI-04 resolution to reference the new dedicated `GET /budgets/{budget_id}/categories` endpoint. Added categories endpoint row to Appendix A. Updated all §-cross-references to match renumbered API Spec.                                                                                                                                                                                                                                                                                                                                                                            |
| 0.1.3   | 2026-02-04 | Adam Dean | Marked OI-04 as resolved. Category taxonomy is now per-budget via `eligible_categories` in the API — no global taxonomy required.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 0.1.2   | 2026-02-04 | Adam Dean | Removed all internal-facing metadata and prose: Milestone badge, Related Doc, Prepared For, SOW references from Status. Rewrote §7 security audit note and Appendix A intro + last row to be standalone.                                                                                                                                                                                                                                                                                                                                                                                     |
| 0.1.1   | 2026-02-04 | Adam Dean | Removed all references to subscriptions (out of scope per SOW v1.1). Updated §2 scope table, §4 intro, §5 service contract degraded-mode cell, and Appendix A acceptance criterion.                                                                                                                                                                                                                                                                                                                                                                                                          |
| 0.1.0   | 2026-02-03 | Adam Dean | Initial draft. Integration scope (§2), DRep auth flow (§3), wallet-signature auth flow with sequence diagram (§4), service contract and degraded-mode behaviour (§5), error/timeout handling (§6), security considerations (§7), and open items OI-01 through OI-04 (§8) defined.                                                                                                                                                                                                                                                                                                            |