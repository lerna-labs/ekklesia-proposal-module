---
layout: default
title: Ekklesia Proposal Module
description:
  Proposal submission, feedback and review for Cardano governance votes.
---

The Proposal Module is a self-contained component for running the stage of a
governance vote that happens before anyone votes: collecting proposals, opening
them to public comment, and holding them through a review period. It has its own
API, its own frontend, and its own database, and it can be deployed on its own
or alongside the Ekklesia voting platform.

Authentication is by Cardano wallet signature. A proposer, a DRep or an SPO
signs a challenge with the key they already hold, and no account or password is
created.

<div class="card-grid">

<a href="{{ '/lifecycle/' | relative_url }}" class="card">
<h3>Proposal Lifecycle</h3>
<p>The states a proposal moves through, who can move it, and when each transition closes.</p>
</a>

<a href="{{ '/vote-cycles/' | relative_url }}" class="card">
<h3>Vote Cycles</h3>
<p>The four date windows that govern submission, feedback, review and voting.</p>
</a>

<a href="{{ '/roles/' | relative_url }}" class="card">
<h3>Roles and Access</h3>
<p>Proposer, DRep, SPO, vote admin and public, and what each one may do.</p>
</a>

<a href="{{ '/api/' | relative_url }}" class="card">
<h3>API</h3>
<p>Every endpoint, with an interactive specification and a Postman collection.</p>
</a>

</div>

## How it fits with the voting platform

The Proposal Module produces the content that a ballot is built from. It does
not run the vote itself: tabulation, voter eligibility and settlement belong to
the Ekklesia voting platform, documented separately at
[docs.ekklesia.vote](https://docs.ekklesia.vote/).

The two systems are deployed and operated separately, and each has its own API,
its own authentication and its own database.

## Scope of these pages

These pages describe the public HTTP surface of the module: the endpoints an
external integrator can call, the rules the server enforces, and the shapes it
returns. Deployment configuration, database schemas and operational runbooks are
not published here.
