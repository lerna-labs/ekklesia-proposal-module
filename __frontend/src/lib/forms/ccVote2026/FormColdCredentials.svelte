<script>
  import Input from "$lib/components/form/Input.svelte";
  import * as Field from "$lib/components/ui/field/index.js";
  import { cn } from "$lib/utils.js";

  /** @typedef {'keyCredential' | 'scriptCredential'} ColdCredentialType */

  /** @typedef {'individual' | 'organisation' | 'consortium'} TrackType */

  /** @type {{ formData: any, validationErrors: any, track?: TrackType }} */
  let { formData = $bindable(), validationErrors, track = "individual" } = $props();

  let coldErrors = $derived(validationErrors?.properties?.metaData);
  let coldTypeError = $derived(coldErrors?.properties?.coldCredentialType?.errors?.[0]);

  const liveLocked = $derived(formData.status === "live");
  const coldHashPrompt = $derived.by(() => {
    if (track === "organisation") return "What is your organisation’s cold credential hash?";
    if (track === "consortium") return "What is your consortium’s combined cold credential hash?";
    return "What is your cold credential hash?";
  });

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
    <p
      class="text-foreground mb-6! rounded-lg bg-[#ECEBFA] px-4 py-3 text-sm dark:bg-violet-950/40 dark:text-violet-50"
    >
      CC members must generate cold keys before taking office. Review the
      <a
        class="link font-medium"
        href="https://developers.cardano.org/docs/learn/cardano-cli/governance/constitutional-committee/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Cold Credential Guide
      </a>
      before submitting.
    </p>

    <h3>{coldHashPrompt}</h3>
    <Input
      id="coldCredentialHash"
      bind:value={formData.metaData.coldCredentialHash}
      label="Cold Credential Hash"
      description="This is the on-chain identifier for your credential (key or script)"
      placeholder="cc_cold1..."
      required
      maxLength={61}
      disabled={liveLocked}
      validationErrors={coldErrors}
    />
  </div>

  <div class="space-y-3">
    <h3>Which credential type are you using?</h3>
    <div class="text-foreground text-sm font-medium">
      Credential Type
      <span class="text-(--mbo-electric-blue)">*</span>
    </div>
    <div
      class={cn(
        "flex flex-col gap-2 rounded-md",
        coldTypeError ? "ring-destructive/20 ring-[3px]" : "",
      )}
      role="radiogroup"
      aria-label="Credential type"
      aria-invalid={coldTypeError ? true : undefined}
    >
      {#each CREDENTIAL_TYPES as opt (opt.id)}
        <button
          type="button"
          role="radio"
          aria-checked={formData.metaData.coldCredentialType === opt.id}
          disabled={liveLocked}
          class={cn(
            "flex flex-col items-stretch gap-1 rounded-lg border p-4 text-left transition-colors",
            liveLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer",
            formData.metaData.coldCredentialType === opt.id
              ? "border-(--mbo-electric-blue) bg-(--mbo-light-blue) ring-2 ring-(--mbo-sky-blue)/70 dark:border-(--mbo-electric-blue) dark:bg-(--mbo-primary-surface) dark:ring-(--mbo-tangy-blue)/40"
              : "border-border hover:bg-muted/50",
          )}
          onclick={() => {
            if (liveLocked) return;
            formData.metaData.coldCredentialType = opt.id;
          }}
        >
          <span class="text-foreground font-semibold">{opt.title}</span>
          <span class="text-muted-foreground text-sm">{opt.description}</span>
        </button>
      {/each}
    </div>
    {#if coldTypeError}
      <Field.Error class="text-xs">{coldTypeError}</Field.Error>
    {/if}
  </div>
</div>
