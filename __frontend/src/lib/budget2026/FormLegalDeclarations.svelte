<script>
  import Input from "$lib/form/Input.svelte";
  import Checkbox from "$lib/form/Checkbox.svelte";
  let {
    value = $bindable(),
    formSchema,
    validationErrors,
    class: className,
  } = $props();
</script>

<div class="max-h-[70vh] overflow-y-auto space-y-6 pr-2 {className ?? ''}">
  <h2 class="text-xl font-semibold">0. Proposal Submission Legal Declarations</h2>

  <!-- 1. Data Protection -->
  <section class="space-y-3">
    <h3 class="text-base font-medium">1. Data Protection</h3>
    <p class="text-sm text-muted-foreground">
      The proposer acknowledges that personal data submitted in this form may be
      shared with relevant internal stakeholders solely for proposal evaluation,
      voting, contracting, and treasury execution.
    </p>
    <Checkbox
      id="dataProcessingConsent"
      bind:value={value.dataProcessingConsent}
      {formSchema}
      {validationErrors}
    />
    <Checkbox
      id="publicVisibilityConsent"
      bind:value={value.publicVisibilityConsent}
      {formSchema}
      {validationErrors}
    />
  </section>

  <!-- 2. Anti-Bribery and Anti-Corruption -->
  <section class="space-y-2">
    <h3 class="text-base font-medium">2. Anti-Bribery and Anti-Corruption</h3>
    <p class="text-sm text-muted-foreground">
      The vendor confirms that neither they nor any of their representatives
      have offered, nor will offer, any bribes, improper payments, or
      inducements in connection with this proposal.
    </p>
  </section>

  <!-- 3. Proposal Authenticity and Intellectual Property -->
  <section class="space-y-2">
    <h3 class="text-base font-medium">
      3. Proposal Authenticity and Intellectual Property
    </h3>
    <p class="text-sm text-muted-foreground">
      The vendor confirms that this proposal is original, all information
      provided is accurate and complete to the best of their knowledge, and no
      third party owns or has rights that would prevent execution of the
      proposed work.
    </p>
    <p class="text-sm text-muted-foreground">
      The vendor retains ownership of all pre-existing intellectual property.
      Submitted proposals will be treated as confidential and used solely for
      evaluation purposes.
    </p>
  </section>

  <!-- 4. Conflicts with Existing Obligations -->
  <section class="space-y-2">
    <h3 class="text-base font-medium">4. Conflicts with Existing Obligations</h3>
    <p class="text-sm text-muted-foreground">
      The vendor confirms that accepting this contract (if awarded) would not
      violate any existing obligations to other parties.
    </p>
  </section>

  <!-- 5. Compliance with Laws and Regulations -->
  <section class="space-y-2">
    <h3 class="text-base font-medium">
      5. Compliance with Laws and Regulations
    </h3>
    <p class="text-sm text-muted-foreground">
      The vendor confirms compliance with all applicable laws, regulations, and
      export controls in connection with this proposal.
    </p>
  </section>

  <!-- 6. Sanctions / Restricted Parties -->
  <section class="space-y-2">
    <h3 class="text-base font-medium">6. Sanctions / Restricted Parties</h3>
    <p class="text-sm text-muted-foreground">
      The vendor confirms that neither they nor any associated parties are
      located in, or otherwise subject to, countries or individuals on relevant
      sanctions lists.
    </p>
  </section>

  <!-- 7. No Contract Formation / Limitation of Liability -->
  <section class="space-y-2">
    <h3 class="text-base font-medium">
      7. No Contract Formation / Limitation of Liability
    </h3>
    <p class="text-sm text-muted-foreground">
      The vendor acknowledges that submission of this proposal does not create a
      contract, obligation, or entitlement to award.
    </p>
    <p class="text-sm text-muted-foreground">
      The vendor acknowledges that submission of this proposal does not
      guarantee approval and that only the delegated representatives (“DReps”)
      have authority to vote on and approve proposals. DReps reserve sole
      discretion over evaluation, voting, and approval.
    </p>
  </section>

  <!-- 8. Declaration of Submitter -->
  <section class="space-y-4">
    <h3 class="text-base font-medium">8. Declaration of Submitter</h3>
    <div class="grid gap-3">
      <Input
        id="submitterName"
        bind:value={value.submitterName}
        {formSchema}
        {validationErrors}
      />
      <Input
        id="submitterRole"
        bind:value={value.submitterRole}
        {formSchema}
        {validationErrors}
      />
      <Input
        id="submitterEmail"
        bind:value={value.submitterEmail}
        {formSchema}
        {validationErrors}
      />
    </div>
    <Checkbox
      id="authorizedToSubmit"
      bind:value={value.authorizedToSubmit}
      {formSchema}
      {validationErrors}
    />
    <Checkbox
      id="authorizedToAttest"
      bind:value={value.authorizedToAttest}
      {formSchema}
      {validationErrors}
    />
  </section>
</div>
