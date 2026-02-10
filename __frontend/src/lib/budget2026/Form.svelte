<script>
  import Input from "$lib/form/Input.svelte";
  import Textarea from "$lib/form/Textarea.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import CategorySelector from "./FormFocusArea.svelte";
  import KPISelector from "./FormKPI.svelte";
  import { formSchema } from "./Schema.js";
  import { z } from "zod";
  let { budget, categories } = $props();

  let formData = $state({
    title: "",
    summary: "",
    trackRecord: "",
    category: "",
    kpis: [],
  });

  let validationErrors = $state(null);

  async function handleSubmit(e) {
    e.preventDefault();

    // validation
    try {
      formSchema.parse(formData);
      validationErrors = null;

      // submit to server
    } catch (error) {
      if (error instanceof z.ZodError) {
        validationErrors = error;
      }
    }
  }
</script>

<!-- {JSON.stringify(formData)} -->

<form onsubmit={handleSubmit} class="flex flex-col">
  <section class="w-full bg-muted-foreground" id="project-definition">
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

  <section class="bg-muted w-full" id="strategic-roadmap-alignment">
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

  <section class="bg-(--mbo-orange) w-full" id="controls">
    <div class="max-w-4xl mx-auto mt-4 mb-4">
      <Button type="submit">Save Draft</Button>
    </div>
  </section>
</form>
