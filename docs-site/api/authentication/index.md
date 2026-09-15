---
layout: default
title: Authentication
description: Signing in to the Proposal Module with a Cardano wallet.
---

Authentication is a challenge and response against a Cardano key. The server
issues a nonce, the wallet signs it, and the server returns a session cookie.
Nothing is stored that could be replayed: the nonce is consumed on use and
expires after five minutes.

## The flow

### 1. Request a challenge

```http
POST /api/v0/session
Content-Type: application/json

{
  "signerAddress": "stake1...",
  "signType": "stake"
}
```

`signType` is `stake`, `drep` or `pool`. The response carries the nonce to sign
as `dataHex`, along with the identity the session will be opened under:

```json
{
  "dataHex": "Sign in! 0f3c...",
  "userId": "stake1...",
  "userIdHex": "e1...",
  "signerAddressHex": "e1..."
}
```

### 2. Sign it

Sign `dataHex` with the wallet. Both CIP-8 message signing through a CIP-30
browser wallet and command line signers such as
[cardano-signer](https://github.com/gitmachtl/cardano-signer) produce an
acceptable signature. The signature is submitted as an object, not a string: the
COSE key and signature as the wallet returns them.

### 3. Exchange it for a session

```http
PUT /api/v0/session
Content-Type: application/json

{
  "signerAddress": "stake1...",
  "signType": "stake",
  "signature": { "signature": "845...", "key": "a401..." }
}
```

On success the server sets an `httpOnly` cookie named `token` and returns the
expiry and the session identity:

```json
{
  "expiresIn": "2026-09-16T10:04:11.000Z",
  "userId": "stake1..."
}
```

The token is only ever delivered in the cookie. It is not in the response body,
and a browser client never needs to read it. Send subsequent requests with
credentials included so the cookie travels with them.

If `signType` is `drep`, the DRep must be registered on chain at the moment of
signing. An unregistered DRep is refused even with a valid signature.

## Sessions

`GET /api/v0/session` returns the current session:

```json
{
  "userId": "drep1...",
  "name": "example.handle",
  "expiresIn": "2026-09-16T10:04:11.000Z",
  "adminVoteIds": ["6512..."]
}
```

`name` is resolved from on-chain metadata, a DRep name or an ADA handle, where
one exists. `adminVoteIds` lists the vote cycles where this identity holds admin
rights, and is omitted when there are none.

`DELETE /api/v0/session` clears the cookie and invalidates every token already
issued to that identity, not just the one presented.

## Multi-signature login

A group holding a native script can open one shared session. Include the script
address in both calls:

```http
POST /api/v0/session
Content-Type: application/json

{
  "signerAddress": "drep1...",
  "signType": "drep",
  "scriptAddress": "drep1...script..."
}
```

The script address must be a CIP-129 script address. A session is issued when
the submitted signature comes from a key that is party to that script, and the
session identity is the script address rather than the individual signer. Any
member can therefore act for the group, and a proposal created this way is owned
by the group.

Script addresses are refused on the single-wallet path, and single wallets are
refused on the multi-signature path.

## Errors

Authentication failures return a single message rather than saying which step
failed:

```json
{
  "status": "error",
  "message": "Authentication failed. Please request a new nonce and try again."
}
```

Request a fresh nonce and retry. Every outstanding nonce for an identity is
cleared once that identity signs in.
