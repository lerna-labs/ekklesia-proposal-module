---
layout: default
title: Roles and Access
description: Who can do what, and how the module decides which is which.
---

The module has no user accounts and no role table. Identity is a Cardano
credential, and rights follow from what that credential is and from what it
owns.

## Identity

A session is opened by signing a challenge with a wallet. The signature type
declares what kind of credential is signing:

| Sign type | Credential                     | Identity stored          |
| --------- | ------------------------------ | ------------------------ |
| `stake`   | Stake address                  | The bech32 stake address |
| `drep`    | DRep, checked for registration | The CIP-129 DRep id      |
| `pool`    | Stake pool, via a Calidus key  | The bech32 address       |

That identity is the user id everywhere else in the API: it is the `proposerId`
on a proposal, the author of a comment, and the entry in a cycle's admin list. A
DRep session is only issued if the DRep is registered on chain at the time of
signing.

Multi-signature login is supported. The signer proves it is party to a native
script, and the script address becomes the session identity, so a group can act
as one proposer.

## Roles

| Role       | How it is established                 | What it allows                                                          |
| ---------- | ------------------------------------- | ----------------------------------------------------------------------- |
| Public     | No session                            | Read live, withdrawn and archived proposals, and live comments          |
| Signed in  | Any valid session                     | Create proposals, comment, reply, like, manage notification settings    |
| Proposer   | Owning the proposal being acted on    | Edit and withdraw that proposal, see and delete their own drafts        |
| Vote admin | Listed in `admins` on that vote cycle | See drafts, withdraw proposals and comments, filter by withdrawn status |

There is no global administrator. Admin rights are granted per vote cycle, and
an admin on one cycle is an ordinary user on every other. A session response
lists the cycles where the caller holds admin rights.

## Visibility rules

**Proposals.** Live, withdrawn and archived proposals are readable by anyone.
Drafts are readable only by their proposer and by admins of the cycle. A listing
request that asks for drafts is rejected unless the caller is an admin of that
cycle or is querying their own proposals.

**Comments.** Live comments are readable by anyone. A withdrawn comment stays
visible to its author and to cycle admins, and is hidden from everyone else.
Only admins may filter comments by a status other than live.

**Fields.** A vote cycle can declare fields of a proposal as non-public. Those
fields are stripped from responses for everyone except the proposal's own
proposer and the cycle's admins. The rule is applied on every read path, single
and list alike.

## Editing windows by role

| Action                   | Role       | Allowed until            |
| ------------------------ | ---------- | ------------------------ |
| Edit a live proposal     | Proposer   | Review end               |
| Withdraw a live proposal | Proposer   | Review end               |
| Withdraw a live proposal | Vote admin | Voting start             |
| Edit a comment           | Author     | 15 minutes after posting |
| Withdraw a comment       | Vote admin | Feedback end             |
| Post a comment or reply  | Signed in  | Feedback end             |
