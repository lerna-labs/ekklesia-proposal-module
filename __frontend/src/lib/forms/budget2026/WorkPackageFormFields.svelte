<script>
  /**
   * Shared work package top-level form fields (name, summary, objectives, etc.).
   * Used on the card above the milestone section. No dialog, no footer.
   */
  import Input from "$lib/components/form/Input.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import RadioGroup from "$lib/components/form/RadioGroup.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";
  import FormWorkPackagesObjectives from "./FormWorkPackagesObjectives.svelte";

  let {
    draft = $bindable({}),
    draftErrors = null,
    idPrefix = "wp",
  } = $props();

  /** Form components look up errors by id: validationErrors.properties[id]. Backend returns keys like "name", "summary". Map to prefixed id. */
  function validationErrorsForField(fieldKey) {
    if (!draftErrors?.properties?.[fieldKey]) return undefined;
    const id = `${idPrefix}-${fieldKey}`;
    return { properties: { [id]: draftErrors.properties[fieldKey] } };
  }

  const supportingDocsValidationErrors = $derived(
    draftErrors?.properties?.supportingDocuments ?? null,
  );
</script>

<div class="grid gap-4">
  <Input
    id="{idPrefix}-name"
    label="Work Package Name"
    bind:value={draft.name}
    placeholder="e.g. WP1 Node Performance Improvements"
    description="A descriptive name for this specific work package."
    required
    maxLength={100}
    validationErrors={validationErrorsForField("name")}
    class="mb-4"
  />

  <div class="space-y-1">
    <h4>
      Please describe this Work Package at a high level
    </h4>
    <p class="text-sm text-muted-foreground">
      Describe the main activities and, where relevant, the key outputs or
      deliverables. The goal is to give reviewers enough context to understand
      what this work covers, without requiring a detailed delivery plan.
    </p>
  </div>

  <Textarea
    id="{idPrefix}-summary"
    label="Work Package Summary"
    bind:value={draft.summary}
    placeholder="Describe the main activities and, where applicable, the key outputs or deliverables associated with this work package"
    description="Provide a high-level description of the work involved. This may include activities, approaches, or key outputs, but does not need to be a detailed delivery plan. The goal is to give reviewers enough context to understand how the stated objectives will be achieved."
    required
    maxLength={2000}
    validationErrors={validationErrorsForField("summary")}
    class="mb-4"
  />

  <div class="space-y-1">
    <h4>
      What is this work package intended to achieve?
    </h4>
  </div>

  <FormWorkPackagesObjectives
    bind:value={draft.coreObjectives}
    validationErrors={draftErrors?.properties?.coreObjectives}
  />

  <div class="mt-4 space-y-1">
    <h4>
      Why does this work matter to Cardano, and how will success be measured?
    </h4>
    <p class="text-sm text-muted-foreground">
      Describe what will change or improve for Cardano as a result of this
      work package, and why that change justifies the investment. Then define
      one or more metrics that will be used to assess whether the expected
      value has been achieved.
    </p>
  </div>

  <Textarea
    id="{idPrefix}-expectedValue"
    label="Expected Value (ROI)"
    bind:value={draft.expectedValue}
    placeholder="e.g. Faster onboarding for developers integrating with Cardano"
    description="Describe what will change or improve as a result of this Work Package. This may be qualitative or quantitative and does not need to be financial."
    required
    maxLength={2000}
    validationErrors={validationErrorsForField("expectedValue")}
  />

  <Textarea
    id="{idPrefix}-metric"
    label="Metric"
    bind:value={draft.metric}
    placeholder="e.g. Average time to first successful deployment reduced by 30%"
    description="How will success be measured? Provide one or more metrics that demonstrate whether the expected value has been achieved."
    required
    maxLength={2000}
    validationErrors={validationErrorsForField("metric")}
  />

  <div class="mt-4 space-y-1">
    <h4>
      Is this a new initiative or a continuation of existing work?
    </h4>
    <p class="text-sm text-muted-foreground">
      Select the option that best describes the nature of this work package.
    </p>
  </div>
  <RadioGroup
    id="{idPrefix}-initiativeType"
    bind:value={draft.initiativeType}
    label="Initiative Type"
    description="Is this a brand new project or the continuation/maintenance of an existing one?"
    required
    options={[
      { value: "New Initiative", label: "New Initiative" },
      { value: "Maintenance", label: "Maintenance" },
    ]}
    validationErrors={validationErrorsForField("initiativeType")}
  />

  <div class="mt-4 space-y-1">
    <h4>
      How would you classify the primary nature of this work proposal?
    </h4>
    <p class="text-sm text-muted-foreground">
      This helps reviewers understand whether the work is primarily technical or non-technical.
    </p>
  </div>
  <RadioGroup
    id="{idPrefix}-proposalType"
    bind:value={draft.proposalType}
    label="Type of Proposal"
    description="Classification of the proposal type."
    required
    options={[
      { value: "Technical (software/IT)", label: "Technical (software/IT)" },
      { value: "Non-technical", label: "Non-technical" },
    ]}
    validationErrors={validationErrorsForField("proposalType")}
  />

  <div class="mt-4 space-y-1">
    <h4>
      Is there any extra material you would like to share about this work
      package?
    </h4>
  </div>

  <LinkListEditor
    bind:value={draft.supportingDocuments}
    label="Supporting Documentation"
    description="Link any relevant diagrams, technical specs, or planning documents (PDF, PNG, JPG)."
    addButtonLabel="Add link"
    validationErrors={supportingDocsValidationErrors}
  />
</div>
