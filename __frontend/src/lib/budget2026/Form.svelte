<script>
  import { untrack } from "svelte";
  import Input from "$lib/form/Input.svelte";
  import Textarea from "$lib/form/Textarea.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import CategorySelector from "./FormFocusArea.svelte";
  import KPISelector from "./FormKPI.svelte";
  import FormTimeline from "./FormTimeline.svelte";
  import { formSchema } from "./Schema.js";
  import { z } from "zod";
  let { budget, categories } = $props();

  let formData = $state({
    title: "",
    summary: "",
    trackRecord: "",
    category: "",
    kpis: [],
    timeline: {
      startDate: undefined,
      endDate: undefined,
    },
  });

  let validationErrors = $state(null);

  function handleSubmit(e) {
    e.preventDefault();
    const result = formSchema.safeParse(formData);
    if (result.success) {
      validationErrors = null;
      // TODO: submit to API
    } else {
      validationErrors = result.error;
    }
  }

  // Snapshot so the effect re-runs when any part of formData changes
  const formDataSnapshot = $derived(JSON.stringify(formData));

  // When validation has failed and the user changes form data, revalidate
  $effect(() => {
    formDataSnapshot;
    if (untrack(() => !validationErrors?.issues?.length)) return;
    const result = formSchema.safeParse(formData);
    if (result.success) {
      validationErrors = null;
    } else {
      validationErrors = result.error;
    }
  });
</script>

<form onsubmit={handleSubmit} class="flex flex-col">
  <section class="w-full bg-muted-foreground/10" id="project-definition">
    <div class="max-w-4xl mx-auto mt-4 mb-4">
      <h2 class="text-2xl font-medium">1. Project Definition</h2>

      <Input
        id="title"
        bind:value={formData.title}
        {formSchema}
        {validationErrors}
      />

      <Textarea
        id="summary"
        bind:value={formData.summary}
        {formSchema}
        {validationErrors}
      />

      <Textarea
        id="trackRecord"
        bind:value={formData.trackRecord}
        {formSchema}
        {validationErrors}
      />
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/15"
    id="strategic-roadmap-alignment"
  >
    <div class="max-w-4xl mx-auto mt-4 mb-4">
      <h2 class="text-2xl font-medium">2. Strategic Roadmap Alignment</h2>

      <CategorySelector
        id="category"
        {categories}
        {formSchema}
        {validationErrors}
        bind:value={formData.category}
        onUpdate={(category) => {
          // reset kpis
          formData.kpis = [];
        }}
      />

      {#if formData.category}
        <KPISelector
          id="kpis"
          {categories}
          {formSchema}
          {validationErrors}
          category={formData.category}
          onUpdate={(kpis) => {
            formData.kpis = kpis;
          }}
        />
      {/if}
    </div>
  </section>

  <section class="w-full bg-muted-foreground/20" id="execution-roadmap">
    <div class="max-w-4xl mx-auto mt-4 mb-4">
      <h2 class="text-2xl font-medium">3. Execution Roadmap</h2>

      <FormTimeline
        {formSchema}
        {validationErrors}
        bind:value={formData.timeline}
      />
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/25"
    id="administrative-verification"
  >
    <div class="max-w-4xl mx-auto mt-4 mb-4">
      <h2 class="text-2xl font-medium">4. Administrative & Verification</h2>
    </div>
  </section>

  <section
    class="w-full bg-muted-foreground/30"
    id="proposal-submission-legal-declarations"
  >
    <div class="max-w-4xl mx-auto mt-4 mb-4">
      <h2 class="text-2xl font-medium">
        5. Proposal Submission Legal Declarations
      </h2>
    </div>
  </section>

  <section
    class="bg-(--mbo-orange) w-full sticky bottom-0 shadow-lg z-10 shadow-black/50"
    id="controls"
  >
    <div class="max-w-4xl mx-auto mt-4 mb-4">
      <Button type="submit" class="cursor-pointer">Save Draft</Button>
    </div>
  </section>
</form>
