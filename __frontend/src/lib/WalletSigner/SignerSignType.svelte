<script>
  import { Button } from "#lib/components/ui/button/index.js";
  import { createEventDispatcher } from "svelte";
  import { page } from "$app/state";

  const dispatch = createEventDispatcher();
  let { value = undefined, disabled = false, multisig = false } = $props();

  // A cosigner's key type is decided by the script, not by the voter types the instance lists.
  const userTypes = $derived(
    multisig ? ["addr", "stake", "drep"] : page.data.serverStatus.walletSigner.userTypes,
  );

  function handleValueChange(newValue) {
    dispatch("change", newValue);
  }
</script>

<div class="flex w-full gap-1">
  {#if userTypes.includes("drep")}
    <Button
      type="button"
      variant={value === "drep" ? "default" : "outline"}
      size="sm"
      class={value === "drep"
        ? "flex-1 border-black bg-black text-xs text-white hover:bg-black"
        : "flex-1 text-xs text-black"}
      {disabled}
      onclick={() => handleValueChange("drep")}
    >
      Use DRep Key
    </Button>
  {/if}

  {#if userTypes.includes("stake")}
    <Button
      type="button"
      variant={value === "stake" ? "default" : "outline"}
      size="sm"
      class={value === "stake"
        ? "flex-1 border-black bg-black text-xs text-white hover:bg-black"
        : "flex-1 text-xs text-black"}
      {disabled}
      onclick={() => handleValueChange("stake")}
    >
      Use Stake Key
    </Button>
  {/if}

  {#if userTypes.includes("pool")}
    <Button
      type="button"
      variant={value === "pool" ? "default" : "outline"}
      size="sm"
      class={value === "pool"
        ? "flex-1 border-black bg-black text-xs text-white hover:bg-black"
        : "flex-1 text-xs text-black"}
      {disabled}
      onclick={() => handleValueChange("pool")}
    >
      Use Calidus Key
    </Button>
  {/if}

  {#if userTypes.includes("addr")}
    <Button
      type="button"
      variant={value === "addr" ? "default" : "outline"}
      size="sm"
      class={value === "addr"
        ? "flex-1 border-black bg-black text-xs text-white hover:bg-black"
        : "flex-1 text-xs text-black"}
      {disabled}
      onclick={() => handleValueChange("addr")}
    >
      Use Payment Address
    </Button>
  {/if}
</div>
