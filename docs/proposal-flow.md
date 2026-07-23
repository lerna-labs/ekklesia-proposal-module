# Proposal flow — draft, save, and submit

---

| Field              | Detail                                                                                                  |
|--------------------|---------------------------------------------------------------------------------------------------------|
| **Document Title** | Proposal Flow – Draft, Save, and Submit                                                                 |
| **Version**        | 0.1.5                                                                                                   |
| **Created**        | February 18, 2026                                                                                       |
| **Last Revised**   | July 23, 2026                                                                                           |
| **Companion Doc**  | [System Architecture Specification](system-architecture.md) · [API Specification](api-specification.md) |
| **Prepared By**    | Adam Dean · <adam@crypto2099.io>, Mad Orkestra · <mad@madorkestra.com>                                  |
| **Status**         | Draft                                                                                                   |

---

This document describes the **proposal lifecycle** and the rule that
**drafts can be saved without full validation** until the proposal status is set
to **live**. It complements the [API Specification](api-specification.md) and
the [Proposal schema description](proposal-schema-description.md).

---

## 1. Principle: draft vs live validation

- **Draft proposals** — The user must be able to **save drafts at any time** without the system enforcing full proposal validation. Partial or incomplete data is allowed. The API accepts create/update requests for proposals with `status: "draft"` without requiring every mandatory field or legal declarations.
- **Live proposals** — When the user **submits** the proposal (i.e. sets `status` to `"live"`), the system **must** validate the full proposal (including all required fields and legal declarations). The API rejects the request with `400 Bad Request` if validation fails (e.g. missing legal declarations or submission outside the vote window).

```mermaid
flowchart TD
    A([Receive proposal request]) --> B{status = live?}

    B -- No / draft --> C{now before submissionEndDate?}
    C -- No --> D[400 Bad Request Submission deadline passed]
    C -- Yes --> E[Partial validation only no legal declarations required]
    E --> F([Save draft ✓])

    B -- Yes / live --> G{now before submissionStartDate?}
    G -- Yes --> H[400 Bad Request Submission window not yet open]
    G -- No --> I{now after submissionEndDate?}
    I -- Yes --> J[400 Bad Request Submission deadline passed]
    I -- No --> K{All required fields present?}
    K -- No --> L[400 Bad Request Validation failed]
    K -- Yes --> M{All 4 legal declarations = true?}
    M -- No --> N[400 Bad Request Legal declarations required]
    M -- Yes --> O([Proposal goes live ✓])
```

---

## 2. Proposal statuses

| Status                | Meaning                                                                                                                                                       |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `draft`               | Work in progress. Visible only to the proposer (and vote admins for that vote). Can be saved repeatedly without full validation. Can be deleted.              |
| `live`                | Submitted for review. Visible publicly. Full validation applied at transition from draft → live. Status is immutable once live (cannot be set back to draft). |
| `withdrawnByProposer` | Withdrawn by the proposer.                                                                                                                                    |
| `withdrawnByAdmin`    | Withdrawn by a vote admin.                                                                                                                                    |
| `archived`            | Previous version of a live proposal after an update (historical copy).                                                                                        |

```mermaid
flowchart TD
    START(( )) --> DRAFT[draft]

    DRAFT -->|Save changes| UPDATED[updated draft<br />no versioning]
    UPDATED --> DRAFT

    DRAFT -->|Delete<br />proposer only| DEL([Deleted])

    DRAFT --> SUB{Submit?}
    SUB -->|Fails validation<br />or outside window| DRAFT
    SUB -->|Passes full validation<br />within submission window| LIVE[live]

    LIVE -->|Update<br />current version archived| ARCHIVED[archived]
    ARCHIVED -->|New version published| LIVE

    LIVE --> WDL{Withdraw?}
    WDL -->|Proposer · before feedbackEndDate| WBP([withdrawnByProposer])
    WDL -->|Admin · before reviewEndDate| WBA([withdrawnByAdmin])
```

---

## 3. User actions and API mapping

### 3.1 Create proposal (draft)

- **User:** Starts a new proposal (e.g. “Create proposal” in a vote).
- **API:** `POST /proposals` with `voteId`, `title`, `summary` (optional for draft), `metaData` (can be minimal), and optionally `status: "draft"` (default).
- **Validation:** Only basic requirements (e.g. valid `voteId`, valid structure). **No** requirement for complete `metaData`, legal declarations, or other mandatory fields from the full schema.
- **Result:** Proposal is created with `status: "draft"`. User can continue editing and saving.

```mermaid
sequenceDiagram
    actor Proposer
    participant Frontend
    participant Backend
    participant MongoDB

    Proposer->>Frontend: Click "Create Proposal" in vote
    Frontend->>Backend: POST /proposals<br/>{ voteId, title, status: "draft" }
    Backend->>Backend: Validate voteId exists<br/>Check now < submissionEndDate
    Backend->>MongoDB: Insert proposal (status: draft)
    MongoDB-->>Backend: { _id, ... }
    Backend-->>Frontend: 201 Created<br/>{ _id, status: "draft", ... }
    Frontend-->>Proposer: Open proposal editor
```

### 3.2 Save draft

- **User:** Saves the proposal without submitting (e.g. "Save draft").
- **API:** `PUT /proposals/{proposalId}` with current form data and
  **`status: "draft"`** (or omit status to leave it unchanged).
- **Validation:** Same as create — **no** full schema or legal-declarations
  validation. Partial data is acceptable.
- **Result:** Proposal is updated. User can keep editing and saving until they
  submit.

```mermaid
sequenceDiagram
    actor Proposer
    participant Frontend
    participant Backend
    participant MongoDB

    Proposer->>Frontend: Edit form fields
    Proposer->>Frontend: Click "Save Draft"
    Frontend->>Backend: PUT /proposals/{id}<br/>{ status: "draft", ...partial data }
    Backend->>Backend: Verify proposer owns proposal<br/>Check now < submissionEndDate<br/>Partial validation only
    Backend->>MongoDB: Update proposal in place
    MongoDB-->>Backend: ok
    Backend-->>Frontend: 200 OK<br/>{ status: "draft", ... }
    Frontend-->>Proposer: Draft saved
```

### 3.3 Submit proposal (draft → live)

- **User:** Clicks "Submit" (or equivalent), confirming they want the proposal
  to become visible and reviewed.
- **API:** `PUT /proposals/{proposalId}` with the full proposal body and
  **`status: "live"`** (or create with `POST /proposals` and `status: "live"`).
- **Validation:** **Full validation** applies:
  - All required fields per [proposal-schema-description.md](proposal-schema-description.md) and API spec.
  - **Legal declarations** required and all four checkboxes must be `true` (see [api-specification.md §5.1](api-specification.md#51-post-proposals)).
  - Current time must be within the vote’s **submission window** (`submissionStartDate` ≤ now ≤ `submissionEndDate`).
- **Result:** If validation passes, proposal becomes `live`. If validation fails, API returns `400 Bad Request` with an error message; proposal remains `draft`.

```mermaid
sequenceDiagram
    actor Proposer
    participant Frontend
    participant Backend
    participant MongoDB

    Proposer->>Frontend: Click "Submit Proposal"
    Frontend->>Frontend: Run full client-side validation (Zod)

    alt Client-side validation fails
        Frontend-->>Proposer: Show field errors Proposal remains draft
    else Client-side validation passes
        Frontend->>Backend: PUT /proposals/{id}<br/>{ status: "live", legalDeclarations, ...full data }
        Backend->>Backend: Verify proposer owns proposal
        Backend->>Backend: Check submissionStartDate ≤ now ≤ submissionEndDate
        Backend->>Backend: Full schema validation
        Backend->>Backend: Check all 4 legal declarations = true

        alt Any validation fails
            Backend-->>Frontend: 400 Bad Request + error message
            Frontend-->>Proposer: Show error Proposal remains draft
        else All validation passes
            Backend->>MongoDB: Update proposal (status: live, submittedAt: now)
            MongoDB-->>Backend: ok
            Backend-->>Frontend: 200 OK<br/>{ status: "live", submittedAt, ... }
            Frontend-->>Proposer: Proposal submitted ✓
        end
    end
```

### 3.4 Update a live proposal

- **User:** Edits an already-submitted (live) proposal.
- **API:** `PUT /proposals/{proposalId}` with updated data. **`status` must
  remain `"live"`** (server rejects any attempt to change status).
- **Behavior:** Server creates an **archived** copy of the current version, then
  updates the proposal in place and appends the previous version to
  `versions`
  (
  see [api-specification.md §5.2](api-specification.md#52-put-proposalsproposalid)).

```mermaid
sequenceDiagram
    actor Proposer
    participant Frontend
    participant Backend
    participant MongoDB

    Proposer->>Frontend: Edit live proposal
    Proposer->>Frontend: Click "Save Changes"
    Frontend->>Backend: PUT /proposals/{id}<br/>{ status: "live", ...updated data }
    Backend->>Backend: Verify proposer owns proposal
    Backend->>Backend: Check now ≤ reviewEndDate
    Backend->>Backend: Full schema validation

    alt Validation fails
        Backend-->>Frontend: 400 Bad Request
        Frontend-->>Proposer: Show error
    else Validation passes
        Backend->>MongoDB: Copy current doc → new doc<br/>{ status: "archived", new _id }
        MongoDB-->>Backend: { archivedId, archivedAt }
        Backend->>MongoDB: Overwrite proposal at original {id}<br/>Append { archivedId, archivedAt } to versions[]
        MongoDB-->>Backend: ok
        Backend-->>Frontend: 200 OK<br/>{ status: "live", version: N+1, versions: [...] }
        Frontend-->>Proposer: Changes saved ✓
    end
```

### 3.5 Withdraw proposal

- **User (proposer or vote admin):** Withdraws a **live** proposal.
- **API:** `PUT /proposals/{proposalId}/withdraw` with `category` and `comment` (both required). See [api-specification.md §5.3](api-specification.md#53-put-proposalsproposalidwithdraw).
- **Constraints:** Only **live** proposals can be withdrawn. Proposer can withdraw until the vote’s `feedbackEndDate`, admin until `reviewEndDate`. Draft proposals cannot be withdrawn; use **Delete proposal** (§3.6) instead.

```mermaid
sequenceDiagram
    actor User as Proposer / Admin
    participant Frontend
    participant Backend
    participant MongoDB

    User->>Frontend: Click "Withdraw Proposal"
    Frontend->>Frontend: Prompt for category (+ optional comment)
    User->>Frontend: Confirm withdrawal
    Frontend->>Backend: PUT /proposals/{id}/withdraw<br/>{ category, comment }

    Backend->>Backend: Identify caller role<br/>(proposer or admin)
    Backend->>Backend: Check proposal is live

    alt Proposal is live AND caller is Proposer
        Backend->>Backend: Check now ≤ feedbackEndDate
    else Proposal is live AND caller is Admin
        Backend->>Backend: Check now ≤ reviewEndDate
    end

    alt Date check fails
        Backend-->>Frontend: 400 Bad Request Withdrawal window has closed
        Frontend-->>User: Show error
    else Date check passes
        Backend->>MongoDB: Set status: withdrawnByProposer or withdrawnByAdmin<br/>Store withdrawalDetails
        MongoDB-->>Backend: ok
        Backend-->>Frontend: 200 OK<br/>{ status: "withdrawnBy...", withdrawalDetails }
        Frontend-->>User: Proposal withdrawn ✓
    end
```

### 3.6 Delete proposal

- **User:** Deletes a **draft** proposal.
- **API:** `DELETE /proposals/{proposalId}`. Only proposals with
  `status: "draft"` can be deleted
  (
  see [api-specification.md §5.4](api-specification.md#54-delete-proposalsproposalid)).

```mermaid
sequenceDiagram
    actor Proposer
    participant Frontend
    participant Backend
    participant MongoDB

    Proposer->>Frontend: Click "Delete Proposal"
    Frontend->>Frontend: Confirm deletion prompt
    Proposer->>Frontend: Confirm
    Frontend->>Backend: DELETE /proposals/{id}
    Backend->>Backend: Verify proposer owns proposal

    alt Proposal status is not draft
        Backend-->>Frontend: 400 Bad Request Only draft proposals can be deleted
        Frontend-->>Proposer: Show error
    else Proposal status is draft
        Backend->>MongoDB: Delete proposal document
        MongoDB-->>Backend: ok
        Backend-->>Frontend: 200 OK { status, message: Proposal deleted }
        Frontend-->>Proposer: Proposal deleted ✓
    end
```

---

## 4. Submission window (vote dates)

- **Draft create/update:** Allowed while current time is **before** the vote’s `submissionEndDate`. No requirement for `submissionStartDate`.
- **Submit (draft → live):** Current time must be **between** `submissionStartDate` and `submissionEndDate` (inclusive). Requests outside this window receive `400 Bad Request` with a message about the submission window (see [api-specification.md §5.1](api-specification.md#51-post-proposals)).

---

## 5. Legal declarations (required only when live)

When `status` is `"live"`, the API and backend require:

- Presence of `metaData.legalDeclarations`.
- All four boolean fields `true`: `dataProtection`, `publicVisibilityConsent`,
  `authorizationEntity`, `authorizationAttestation`.
- Optional but recommended: `submitterName`, `submitterRole`, `submitterEmail`
  (see [api-specification.md](api-specification.md)
  and [proposal-schema-description.md](proposal-schema-description.md)).

When `status` is `"draft"`, **none** of these are required for save. The
frontend may collect them at any time, but the backend does not enforce them
until the proposal is set to live.

---

## 6. Frontend implications

- **Draft save:** Call `PUT /proposals/{proposalId}` (or `POST /proposals` for
  new) with `status: "draft"` and current form data. Do **not** block save on
  full client-side validation; allow partial data so the user can save progress.
- **Submit (go live):** Before calling the API with `status: "live"`, the
  frontend **should** run full client-side validation (e.g. Zod schema) and show
  errors so the user can fix them. The API will still enforce the same rules and
  return `400` if something is missing or invalid.
- **UX:** Clearly separate "Save draft" (no validation gate) from "Submit"
  (validation required; may show errors or confirm legal declarations).

---

## 7. Summary

| Action          | Status in request  | Full validation? | Legal declarations required? |
|-----------------|--------------------|------------------|------------------------------|
| Create proposal | `draft` (default)  | No               | No                           |
| Save draft      | `draft`            | No               | No                           |
| Submit          | `live`             | Yes              | Yes (all four checkboxes)    |
| Update live     | `live` (unchanged) | Yes              | Yes (already satisfied)      |
| Withdraw        | —                  | N/A              | N/A                          |
| Delete          | — (draft only)     | N/A              | N/A                          |

**Users can save drafts without validation until the proposal status changes to
live.**

---

## Revision History

This document follows [Semantic Versioning 2.0.0](https://semver.org/). Version
numbers use the form **MAJOR.MINOR.PATCH**:

- **MAJOR** — Incompatible flow or contract changes (e.g. different validation
  rules, removed actions).
- **MINOR** — Backwards-compatible additions (e.g. new actions, new
  constraints).
- **PATCH** — Backwards-compatible fixes and clarifications (e.g. typo
  corrections, alignment with implementation).

| Version | Date       | Description                                                                                                                                                                   |
|---------|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 0.1.5   | 2026-07-23 | Align draft delete success with API: `200 OK` JSON instead of `204 No Content` (F-027).                                                                                         |
| 0.1.4   | 2026-02-20 | Terminology change, modify references to "Budgets" to be "Votes"                                                                                                              |
| 0.1.3   | 2026-02-19 | Remove the concept/ability to "withdraw" a draft proposal. Draft proposals may be deleted by the author, otherwise only live proposals may be withdrawn by admin or the user. |
| 0.1.2   | 2026-02-19 | Add sequence diagrams and flowcharts for documenting various state changes of proposals.                                                                                      |
| 0.1.1   | 2026-02-19 | Grammar, formatting, and minor tweaks and changes.                                                                                                                            |
| 0.1.0   | 2026-02-18 | Document metadata block and revision history. Fixed: create uses `summary` (not `description`); withdraw applies to live or draft, date limits only for live.                 |
