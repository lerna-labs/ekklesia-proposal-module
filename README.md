# Ekklesia Proposal Module

> [!CAUTION]
> **CONFIDENTIAL & PROPRIETARY**
> This repository and its contents are the confidential and proprietary
> information of Ekklesia Voting Tech. Access is restricted to authorized
> personnel only. Unauthorized copying, distribution, disclosure, or use of any
> materials contained herein is strictly prohibited and may result in legal
> action. By accessing this repository, you agree to maintain strict
> confidentiality of all contents.

## Overview

Full-stack Cardano governance proposal platform for collecting proposals and
facilitating public comment and revision. Users authenticate by signing a nonce
challenge with their Cardano wallet (Ed25519/CIP-30 signatures).

**Stack:** Express.js backend, MongoDB (Mongoose), SvelteKit frontend.

## Getting Started

1. Copy `.env.example` to `.env` and fill in required variables
2. `npm install`
3. `npm start`

See [System Architecture](docs/system-architecture.md) for a full overview of
components and deployment.

## Documentation

| Document                                               | Description                                                                              |
|--------------------------------------------------------|------------------------------------------------------------------------------------------|
| [System Architecture](docs/system-architecture.md)     | Components, data flows, role-based access control, and infrastructure                    |
| [API Specification](docs/api-specification.md)         | All public, authenticated, and admin API endpoints with request/response formats         |
| [Login Flow](docs/login-flow.md)                       | Wallet-based authentication flow (nonce challenge, signature verification, JWT issuance) |
| [User Flows](docs/user-flows.md)                       | User journeys for public viewers, proposers, DReps, and admins                           |
| [Proposal Flow](docs/proposal-flow.md)                 | Proposal lifecycle state machine (draft, live, withdrawn, archived)                      |
| [Proposal Schema](docs/proposal-schema-description.md) | Complete field reference for proposals including validation rules and enums              |
| [Vote Schema](docs/vote-schema-description.md)         | Vote (funding cycle) schema with submission, feedback, and review date windows           |
| [Comment Schema](docs/comment-schema-description.md)   | Comment and reply schema including likes and withdrawal details                          |
| [User Schema](docs/user-schema-description.md)         | User schema with Bech32 address keys and runtime role derivation                         |

