<script>
  /** @see __frontend/docs/budget2026/form-project-definition.md Version: 1.0.0 */
  import Input from "$lib/components/form/Input.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  let {
    formData = $bindable(),
    vote,
    categories,
    proposal,
    validationErrors,
  } = $props();
</script>

<Input
  id="title"
  bind:value={formData.title}
  label="Proposal Title"
  description="The official name of your project as it will appear in governance voting."
  placeholder="Enter Title Here"
  required
  maxLength={100}
  {validationErrors}
  class="mb-8"
/>

<h2 class="text-lg!">Please describe your whole proposal at high level</h2>

<p>
  Provide an high-level overview of the problem, proposed solution and value
  your overall proposal is providing with reference to Cardano's vision.
  Remember this is the first thing DReps will see.
</p>

<p>
  Current Drep supported Cardano's Vision: "Cardano is the most secure, reliable
  and censorship-resistant blockchain for mission critical applications to power
  economies and societies of the future." <a
    href="https://ipfs.io/ipfs/bafkreicu4r3rowukvtrxaok3xd7bxkoig6uxmxgldjpyt6shjli5vjwhxe"
    target="_blank"
    class="link"
  >
    Read more
  </a>
</p>

<Textarea
  id="summary"
  bind:value={formData.summary}
  label="Executive Summary"
  description="A high-level overview of the problem, solution, and impact. This is the first thing voters read."
  placeholder="Enter Summary Here"
  required
  maxLength={2000}
  {validationErrors}
  class="mb-8"
/>

<h3>Why are you the best suited to deliver this work?</h3>
<p>
  Describe what previous experience and expertise you or your team have which is
  relevant for your proposal. Focus on proven history of delivery, mention
  previous successful proposals, mainnet deployments, or relevant enterprise
  experience.
</p>

<Textarea
  id="trackRecord"
  bind:value={formData.metaData.trackRecord}
  label="Track Record"
  description="Proven history of delivery. Mention previous successful proposals, mainnet deployments, or relevant enterprise experience."
  placeholder="Enter Track Record Here"
  maxLength={650}
  validationErrors={validationErrors?.properties?.metaData}
  class="mb-8"
/>

<h3>
  How long will your proposal need to be fully delivered? Or if you are
  requesting funding for operations, how many months will this budget cover?
</h3>
<p>
  Provide an estimated duration from the start of the work to completion. Or if
  your proposal covers ongoing operations or services, specify the number of
  months this budget is intended to support.
</p>

<Input
  id="estimatedDuration"
  bind:value={formData.metaData.estimatedDuration}
  label="Estimated Duration"
  type="number"
  min={1}
  description="Estimated duration of the project proposal"
  placeholder="Enter Duration in Months"
  required
  class="sm: w-1/4 mb-8"
  validationErrors={validationErrors?.properties?.metaData}
/>
