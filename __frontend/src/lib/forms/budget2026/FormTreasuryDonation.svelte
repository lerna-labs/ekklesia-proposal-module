<script>
  /** @see __frontend/docs/budget2026/form-treasury-donation.md Version: 1.0.0 */
  /** Pre-submission step: Treasury Donation Verification (content aligned with spec). */
  import Input from "$lib/components/form/Input.svelte";
  import Checkbox from "$lib/components/form/Checkbox.svelte";
  let { formData = $bindable(), vote, proposal, validationErrors } = $props();

  /** Errors for this section: metaData.treasuryDonation* so Input/Checkbox can resolve by id. */
  let treasuryDonationErrors = $derived(validationErrors?.properties?.metaData);
</script>

<p class="text-muted-foreground mb-4 text-sm">
  Provide the transaction hash confirming the required 1000 ADA donation to the Cardano Treasury.
  This serves as proof of wallet control and proposer commitment.
</p>

<Input
  id="treasuryDonationTxHash"
  bind:value={formData.metaData.treasuryDonationTxHash}
  label="Treasury Donation Verification Hash"
  description="The transaction hash confirming the required 1000 ada donation to the Cardano Treasury. This serves as proof of wallet control and commitment."
  placeholder="Transaction hash"
  required
  maxLength={64}
  disabled={proposal?.status === "live"}
  validationErrors={treasuryDonationErrors}
  class="mb-4"
/>

<h3>Before you submit your proposal, please confirm</h3>

<Checkbox
  id="treasuryDonationConfirmed"
  bind:value={formData.metaData.treasuryDonationConfirmed}
  label="I confirm that I have made the required 1,000 ADA non-refundable donation to the Cardano Treasury, understand that this donation is required only to participate in the process and does not guarantee proposal approval, funding, or execution, and confirm that I am submitting this proposal using the same wallet that made the donation."
  required
  validationErrors={treasuryDonationErrors}
  class="mb-8"
/>
