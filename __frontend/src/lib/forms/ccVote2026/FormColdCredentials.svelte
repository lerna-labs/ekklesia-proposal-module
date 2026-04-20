<script>
  import Input from "$lib/components/form/Input.svelte";
  import { cn } from "$lib/utils.js";

  /** @typedef {'keyCredential' | 'scriptCredential'} ColdCredentialType */

  let { formData = $bindable(), validationErrors } = $props();

  let coldErrors = $derived(validationErrors?.properties?.metaData);

  const liveLocked = $derived(formData.status === "live");

  /** @type {Array<{ id: ColdCredentialType; title: string; description: string }>} */
  const CREDENTIAL_TYPES = [
    {
      id: "keyCredential",
      title: "Key Credential",
      description: "A standard cold key generated for individual use.",
    },
    {
      id: "scriptCredential",
      title: "Script Credential",
      description: "A native or Plutus script acting as the authorisation credential.",
    },
  ];
</script>

<div class="flex flex-col gap-6">
  <div>
    <p class="text-sm text-muted-foreground mb-4">
      CC members must generate cold keys before taking office. Review the
      <a
        class="link font-medium"
        href="https://docs.hydra-voting.intersectmbo.org/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Intersect Cold Credential Guide
      </a>
      before submitting.
    </p>
    <h3>What is your cold credential hash?</h3>
    <Input
      id="coldCredentialHash"
      bind:value={formData.metaData.coldCredentialHash}
      label="Cold Credential Hash"
      description="This is the on-chain identifier for your credential (key or script)"
      placeholder="Enter your cold credential hash"
      required
      maxLength={256}
      disabled={liveLocked}
      validationErrors={coldErrors}
    />
  </div>

  <div class="space-y-3">
    <h3>Which credential type are you using?</h3>
    <div class="text-sm font-medium text-foreground">
      Credential Type
      <span class="text-(--mbo-electric-blue)">*</span>
    </div>
    <div class="flex flex-col gap-3" role="radiogroup" aria-label="Credential type">
      {#each CREDENTIAL_TYPES as opt (opt.id)}
        <button
          type="button"
          role="radio"
          aria-checked={formData.metaData.coldCredentialType === opt.id}
          disabled={liveLocked}
          class={cn(
            "flex flex-col items-stretch gap-1 rounded-lg border p-4 text-left transition-colors",
            liveLocked ? "opacity-80 cursor-not-allowed" : "cursor-pointer",
            formData.metaData.coldCredentialType === opt.id
              ? "border-(--mbo-electric-blue) bg-(--mbo-light-blue) ring-2 ring-(--mbo-sky-blue)/70 dark:border-(--mbo-electric-blue) dark:bg-(--mbo-primary-surface) dark:ring-(--mbo-tangy-blue)/40"
              : "border-border hover:bg-muted/50",
          )}
          onclick={() => {
            if (liveLocked) return;
            formData.metaData.coldCredentialType = opt.id;
          }}
        >
          <span class="font-semibold text-foreground">{opt.title}</span>
          <span class="text-sm text-muted-foreground">{opt.description}</span>
        </button>
      {/each}
    </div>
  </div>
</div>
