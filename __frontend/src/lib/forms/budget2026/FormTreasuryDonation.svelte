<script>
  import * as Card from "$lib/components/ui/card/index.js";
  import Input from "$lib/components/form/Input.svelte";
  import Checkbox from "$lib/components/form/Checkbox.svelte";
  let { formData, vote, categories, proposal, validationErrors } = $props();
</script>

<h2>Treasury Donation – Required Before Submission</h2>

<h3>Why is this required?</h3>
<p>
  To participate in the Intersect budget proposal process, proposers are
  required to make a <strong>1,000 ADA non-refundable donation</strong>
  to the Cardano Treasury. This idea originated from DReps and has strong support
  from both DReps and vendors.
</p>

<p class="mb-0">This donation:</p>
<ul>
  <li>Confirms proposer commitment</li>
  <li>Demonstrates control of the submitting wallet</li>
  <li>Helps protect the process from spam or low-effort submissions</li>
</ul>

<h4>Important: What this donation does not mean</h4>

<p class="mb-1">
  Making this donation <strong>does not:</strong>
</p>
<ul>
  <li>Guarantee proposal approval</li>
  <li>Guarantee on-chain execution</li>
  <li>Guarantee funding, even if off-chain voting thresholds are met</li>
  <li>
    Guarantee that Intersect will submit or sponsor a Treasury Withdrawal Action
  </li>
</ul>
<p>
  All proposals remain subject to governance review, voting outcomes, and Net
  Change Limit (NCL) constraints.
</p>

<Card.Root class="mt-4 gap-2">
  <Card.Header class="pb-0 mb-0">
    <Card.Title>Wallet requirement</Card.Title>
  </Card.Header>
  <Card.Content class="space-y-2 pt-0 text-sm pb-0 mb-0">
    <p>
      You <strong>must use the same wallet</strong>
      to:
    </p>

    <ol>
      <li>Make the 1,000 ADA treasury donation</li>
      <li>Submit your proposal in this application</li>
    </ol>

    <p class="pb-0 mb-0">
      This allows reviewers to verify proposer identity and wallet ownership.
      Proposals submitted from a different wallet than the donation
      <strong>is not possible.</strong>
    </p>
  </Card.Content>
</Card.Root>

<Input
  id="treasuryDonationTxHash"
  bind:value={formData.metaData.treasuryDonationTxHash}
  label="Treasury Donation Verification Hash"
  description="The transaction hash confirming the required 1000 ada donation to the Cardano Treasury. This serves as proof of wallet control and commitment."
  placeholder="Transaction hash"
  required
  maxLength={64}
  {validationErrors}
  class="mt-4"
/>

<p class="mt-4 font-medium">Before you continue, please confirm</p>

<Checkbox
  id="treasuryDonationConfirmed"
  bind:value={formData.metaData.treasuryDonationConfirmed}
  label="I confirm that I have made the required 1,000 ADA non-refundable donation to the Cardano Treasury, understand that this donation is required only to participate in the process and does not guarantee proposal approval, funding, or execution, and confirm that I am submitting this proposal using the same wallet that made the donation."
  required
  {validationErrors}
  class="mt-4"
/>
