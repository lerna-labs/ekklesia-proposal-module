<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Input from "$lib/form/Input.svelte";
  import Textarea from "$lib/form/Textarea.svelte";
  import Checkbox from "$lib/form/Checkbox.svelte";
  import RadioGroup from "$lib/form/RadioGroup.svelte";
  import Switch from "$lib/form/Switch.svelte";
  import FormCountrySelect from "$lib/form/FormCountrySelect.svelte";
  import FormLinks from "$lib/budget2026/FormLinks.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  let {
    value = $bindable(),
    formSchema,
    validationErrors,
    class: className,
  } = $props();

  function opts(id) {
    return formSchema.shape[id]?.meta()?.options ?? [];
  }
  function isNotPublic(id) {
    return formSchema.shape[id]?.meta()?.notPublic === true;
  }
</script>

<Field.Set class={className}>
  <!-- 1. Intersect Administrator? (only this at first) -->
  <Switch
    id="intersectAdministrator"
    bind:value={value.intersectAdministrator}
    notPublic={isNotPublic("intersectAdministrator")}
    {formSchema}
    {validationErrors}
  />

  {#if value.intersectAdministrator != null}
    <!-- 2. When Intersect is NOT admin: Other Administrators? -->
    {#if value.intersectAdministrator === false}
      <Textarea
        id="otherAdministrators"
        bind:value={value.otherAdministrators}
        notPublic={isNotPublic("otherAdministrators")}
        {formSchema}
        {validationErrors}
      />
    {/if}

    <!-- 3. Contracting Party Details (both branches) -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Contracting Party</Card.Title>
      </Card.Header>
      <Card.Content class="flex flex-col gap-3">
        <RadioGroup
          id="contractingParty"
          bind:value={value.contractingParty}
          options={opts("contractingParty")}
          notPublic={isNotPublic("contractingParty")}
          {formSchema}
          {validationErrors}
        />

        <!-- 4a. Company-only fields -->
        {#if value.contractingParty === "company"}
          <Input
            id="legalEntityName"
            bind:value={value.legalEntityName}
            notPublic={isNotPublic("legalEntityName")}
            {formSchema}
            {validationErrors}
          />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="registeredAddress"
              bind:value={value.registeredAddress}
              notPublic={isNotPublic("registeredAddress")}
              {formSchema}
              {validationErrors}
            />
            <FormCountrySelect
              id="countryOfIncorporation"
              bind:value={value.countryOfIncorporation}
              notPublic={isNotPublic("countryOfIncorporation")}
              {formSchema}
              {validationErrors}
            />
          </div>
          <div class="w-full md:w-1/2">
            <Input
              id="registrationNumber"
              bind:value={value.registrationNumber}
              notPublic={isNotPublic("registrationNumber")}
              {formSchema}
              {validationErrors}
            />
          </div>
        {/if}

        <!-- 4b. Individual-only fields -->
        {#if value.contractingParty === "individual"}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="fullResidentialAddress"
              bind:value={value.fullResidentialAddress}
              notPublic={isNotPublic("fullResidentialAddress")}
              {formSchema}
              {validationErrors}
            />
            <FormCountrySelect
              id="countryOfResidence"
              bind:value={value.countryOfResidence}
              notPublic={isNotPublic("countryOfResidence")}
              {formSchema}
              {validationErrors}
            />
          </div>
          <div class="w-full md:w-1/2">
            <Input
              id="govtIssuedIdNumber"
              bind:value={value.govtIssuedIdNumber}
              notPublic={isNotPublic("govtIssuedIdNumber")}
              {formSchema}
              {validationErrors}
            />
          </div>
        {/if}

        <!-- 5. Shared: Primary Contact, X Handle, Signatory, etc. -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            id="primaryContactFullName"
            bind:value={value.primaryContactFullName}
            notPublic={isNotPublic("primaryContactFullName")}
            {formSchema}
            {validationErrors}
          />
          <Input
            id="primaryContactEmail"
            bind:value={value.primaryContactEmail}
            notPublic={isNotPublic("primaryContactEmail")}
            {formSchema}
            {validationErrors}
          />
        </div>
        <div class="w-full md:w-1/2">
          <Input
            id="xHandle"
            bind:value={value.xHandle}
            notPublic={isNotPublic("xHandle")}
            {formSchema}
            {validationErrors}
          />
        </div>

        <Card.Root class="mt-4">
          <Card.Header>
            <Card.Title>Signatory</Card.Title>
          </Card.Header>
          <Card.Content class="flex flex-col gap-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                id="signatoryTitle"
                bind:value={value.signatoryTitle}
                notPublic={isNotPublic("signatoryTitle")}
                {formSchema}
                {validationErrors}
              />
              <Input
                id="signatoryName"
                bind:value={value.signatoryName}
                notPublic={isNotPublic("signatoryName")}
                {formSchema}
                {validationErrors}
              />
            </div>
            <div class="w-full md:w-1/2">
              <Input
                id="signatoryEmail"
                bind:value={value.signatoryEmail}
                notPublic={isNotPublic("signatoryEmail")}
                {formSchema}
                {validationErrors}
              />
            </div>
            <div class="w-full md:w-1/2 mt-2">
              <p class="text-sm text-muted-foreground mb-2 italic">
                The above individual is authorized to execute a binding
                agreement on behalf of the vendor entity, subject to selection
                and contract execution.
              </p>
              <Checkbox
                id="signatoryAuthorization"
                bind:value={value.signatoryAuthorization}
                notPublic={isNotPublic("signatoryAuthorization")}
                {formSchema}
                {validationErrors}
              />
            </div>
          </Card.Content>
        </Card.Root>
      </Card.Content>
    </Card.Root>

    <Input
      id="totalProposalsSubmitted"
      bind:value={value.totalProposalsSubmitted}
      notPublic={isNotPublic("totalProposalsSubmitted")}
      {formSchema}
      {validationErrors}
    />
    <Switch
      id="kycKybSubmitted"
      bind:value={value.kycKybSubmitted}
      notPublic={isNotPublic("kycKybSubmitted")}
      {formSchema}
      {validationErrors}
    />
    {#if value.kycKybSubmitted === false || value.kycKybSubmitted == null}
      <Input
        id="kycContactEmail"
        bind:value={value.kycContactEmail}
        notPublic={isNotPublic("kycContactEmail")}
        {formSchema}
        {validationErrors}
      />
    {/if}

    <!-- 6. Other fields (not related to choosing Admin) -->
    <Switch
      id="treasuryRepayment"
      bind:value={value.treasuryRepayment}
      notPublic={isNotPublic("treasuryRepayment")}
      {formSchema}
      {validationErrors}
    />
    {#if value.treasuryRepayment === true}
      <Textarea
        id="repaymentCircumstances"
        bind:value={value.repaymentCircumstances}
        notPublic={isNotPublic("repaymentCircumstances")}
        {formSchema}
        {validationErrors}
      />
    {/if}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <RadioGroup
        id="initiativeType"
        bind:value={value.initiativeType}
        options={opts("initiativeType")}
        notPublic={isNotPublic("initiativeType")}
        {formSchema}
        {validationErrors}
      />
      <RadioGroup
        id="typeOfProposal"
        bind:value={value.typeOfProposal}
        options={opts("typeOfProposal")}
        notPublic={isNotPublic("typeOfProposal")}
        {formSchema}
        {validationErrors}
      />
    </div>
    <Textarea
      id="priorFunding"
      bind:value={value.priorFunding}
      notPublic={isNotPublic("priorFunding")}
      {formSchema}
      {validationErrors}
    />
    <Input
      id="treasuryDonationVerificationHash"
      bind:value={value.treasuryDonationVerificationHash}
      notPublic={isNotPublic("treasuryDonationVerificationHash")}
      {formSchema}
      {validationErrors}
    />
    <Textarea
      id="thirdPartyAssurers"
      bind:value={value.thirdPartyAssurers}
      notPublic={isNotPublic("thirdPartyAssurers")}
      {formSchema}
      {validationErrors}
    />
    <FormLinks
      bind:value={value.supportingInfoLinks}
      notPublic={isNotPublic("supportingInfoLinks")}
      {formSchema}
      {validationErrors}
    />
  {/if}
</Field.Set>
