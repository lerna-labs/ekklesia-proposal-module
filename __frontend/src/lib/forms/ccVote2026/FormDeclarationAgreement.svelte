<script>
  import Checkbox from "$lib/components/form/Checkbox.svelte";

  let { formData = $bindable(), validationErrors, consortiumExtraCheckbox = false } = $props();

  let declarationErrors = $derived(validationErrors?.properties?.metaData?.properties?.declarationAgreement);
</script>

<div class="pr-2">
  <p class="text-sm text-muted-foreground mb-3">
    Confirm the declarations below before submitting your proposal. These must be confirmed on every submit or
    re-submit.
  </p>
  <div class="space-y-6">
    <section>
      <h3>Accuracy &amp; Public Visibility Consent</h3>
      <Checkbox
        id="accuracyPublicVisibilityConsent"
        bind:value={formData.metaData.declarationAgreement.accuracyPublicVisibilityConsent}
        label="I confirm all information is accurate and consent to it being publicly visible on the Ekklesia candidate directory."
        required
        notPublic
        class="mt-2"
        validationErrors={declarationErrors}
      />
    </section>

    {#if consortiumExtraCheckbox}
      <section>
        <h3>Member Identity Vouching</h3>
        <Checkbox
          id="memberIdentityVouching"
          bind:value={formData.metaData.declarationAgreement.memberIdentityVouching}
          label="I am authorised to vouch for the information provided of all consortium members listed in this application."
          required
          notPublic
          validationErrors={declarationErrors}
          class="mt-2"
        />
      </section>
    {/if}

    <section>
      <h3>Terms &amp; Conditions Agreement</h3>
      <p class="text-sm text-muted-foreground mb-2 mt-2">
        The candidate agrees to the
        <a
          class="link font-medium"
          href="https://docs.hydra-voting.intersectmbo.org/cc-elections/guidelines-for-participation"
          target="_blank"
          rel="noopener noreferrer"
        >
          Intersect CC Election Guidelines for Participation
        </a>
        and
        <a
          class="link font-medium"
          href="https://docs.intersectmbo.org/intersect-knowledge-base/legal/policies-and-conditions/intersect-members-policies/code-of-conduct"
          target="_blank"
          rel="noopener noreferrer"
        >
          Code of Conduct
        </a>
      </p>
      <Checkbox
        id="termsAndConditionsAgreement"
        bind:value={formData.metaData.declarationAgreement.termsAndConditionsAgreement}
        label="I agree to the Intersect CC Election Terms & Conditions and Code of Conduct."
        required
        notPublic
        class="mt-2"
        validationErrors={declarationErrors}
      />
    </section>
  </div>
</div>
