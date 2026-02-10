<script>
  import Input from "$lib/form/Input.svelte";
  import Textarea from "$lib/form/Textarea.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import CategorySelector from "./CategorySelector.svelte";
  import { formSchema } from "./Schema.js";
  import { z } from "zod";
  let { budget } = $props();

  let formData = $state({
    title: "",
    summary: "",
    trackRecord: "",
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

<form onsubmit={handleSubmit} class="flex flex-col gap-2 max-w-4xl mx-auto">
  <section class="space-y-2 mb-8" id="project-definition">
    <h2 class="text-2xl font-medium mb-4">1. Project Definition</h2>

    <Input
      id="title"
      bind:value={formData.title}
      {formSchema}
      {validationErrors}
      class="mb-6"
    />

    <Textarea
      id="summary"
      bind:value={formData.summary}
      {formSchema}
      {validationErrors}
      class="mb-6"
    />

    <Textarea
      id="trackRecord"
      bind:value={formData.trackRecord}
      {formSchema}
      {validationErrors}
    />
  </section>

  <section class="space-y-2" id="project-details">
    <h2 class="text-2xl font-medium mb-4">2. Strategic Roadmap Alignment</h2>

    <CategorySelector
      id="category"
      {budget}
      {formSchema}
      {validationErrors}
      bind:value={formData.category}
    />
  </section>

  <section class="" id="controls">
    <Button type="submit">Save Draft</Button>
  </section>
</form>
