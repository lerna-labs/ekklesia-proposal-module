<script>
  import { Button } from "$lib/components/ui/button";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  let { value = undefined, disabled = false, mode = "signer" } = $props();

  const USER_TYPES = import.meta.env.VITE_USER_TYPES;
  const userTypes = USER_TYPES.split(",");

  function handleValueChange(newValue) {
    dispatch("change", newValue);
  }
</script>

<div class="flex gap-1 w-full">
  {#if userTypes.includes("drep")}
    <Button
      type="button"
      variant={value === "drep" ? "default" : "outline"}
      size="sm"
      class={value === "drep"
        ? "flex-1 text-xs bg-black text-white border-black hover:bg-black"
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
        ? "flex-1 text-xs bg-black text-white border-black hover:bg-black"
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
        ? "flex-1 text-xs bg-black text-white border-black hover:bg-black"
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
        ? "flex-1 text-xs bg-black text-white border-black hover:bg-black"
        : "flex-1 text-xs text-black"}
      {disabled}
      onclick={() => handleValueChange("addr")}
    >
      Use Payment Address
    </Button>
  {/if}
</div>
