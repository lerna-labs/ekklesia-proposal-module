<script>
  import "./form.css";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import FormTreasuryDonation from "./FormTreasuryDonation.svelte";
  import FormProjectDefinition from "./FormProjectDefinition.svelte";
  import FormStrategyFramework from "./FormStrategyFramework.svelte";
  import FormProposalDetails from "./FormProposalDetails.svelte";
  import FormBudgetSummary from "./FormBudgetSummary.svelte";
  import FormProposerDetails from "./FormProposerDetails.svelte";
  import FormBudgetAdministration from "./FormBudgetAdministration.svelte";
  import FormOtherInfo from "./FormOtherInfo.svelte";
  import FormControls from "$lib/components/form/FormControls.svelte";
  let { vote, categories, proposal, onSave, validationErrors } = $props();

  let formData = $state({
    status: "draft",
    title: "",
    metaData: {},
  });

  let autoSaveEnabled = $state(false);

  function handleSubmit(e) {
    e.preventDefault();
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col form">
  <Accordion.Root type="single" class="w-full" value="section-1">
    <Accordion.Item
      value="section-1"
      id="treasury-donation"
      class="bg-slate-100 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        Treasury donation
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormTreasuryDonation
          {formData}
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-2"
      id="project-definition"
      class="bg-slate-200 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        Project definition
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormProjectDefinition
          {formData}
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-3"
      id="strategy-framework"
      class="bg-slate-100 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        Strategy framework
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormStrategyFramework
          {formData}
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-4"
      id="proposal-details"
      class="bg-slate-200 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        Proposal details
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormProposalDetails
          {formData}
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-5"
      id="budget-summary"
      class="bg-slate-100 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        Budget summary
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormBudgetSummary
          {formData}
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-6"
      id="proposer-details"
      class="bg-slate-200 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        Proposer details
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormProposerDetails
          {formData}
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-7"
      id="budget-administration"
      class="bg-slate-100 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        Budget administration
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormBudgetAdministration
          {formData}
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-8"
      id="other-info"
      class="bg-slate-200 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        Other info
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormOtherInfo
          {formData}
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>

  <FormControls {formData} {onSave} {autoSaveEnabled} />
</form>
