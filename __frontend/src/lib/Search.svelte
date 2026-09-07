<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { queryStringWithLiteralCommas } from "$lib/utils.js";
  import * as Input from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
  import XIcon from "@lucide/svelte/icons/x";

  let {
    class: className = "",
    placeholder = "Search...",
    /** Called before clearing; e.g. remove search from persisted list state in localStorage. */
    onBeforeClear,
  } = $props();
  let value = $state("");

  $effect(() => {
    const search = page.url.searchParams.get("search") ?? "";
    value = search;
  });

  function submit() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      searchParams.set("search", trimmed);
    } else {
      searchParams.delete("search");
    }
    searchParams.set("page", "1");
    const url = `${page.url.pathname}?${queryStringWithLiteralCommas(searchParams)}`;
    goto(url);
  }

  function clear() {
    onBeforeClear?.();
    value = "";
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.delete("search");
    searchParams.set("page", "1");
    const qs = queryStringWithLiteralCommas(searchParams);
    const url = qs ? `${page.url.pathname}?${qs}` : page.url.pathname;
    goto(url);
  }

  function handleKeydown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }
</script>

<div class="relative flex w-full items-center gap-1 {className}">
  <Input.Root
    bind:value
    {placeholder}
    onkeydown={handleKeydown}
    class="min-w-0 flex-1 pr-8 pl-2"
    aria-label="Search"
  />
  <div class="absolute top-0 right-0 flex h-full items-center gap-0 pr-0.5">
    {#if value.trim()}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-8! min-w-0 shrink-0 cursor-pointer rounded-none bg-white p-0! hover:bg-white"
        onclick={clear}
        aria-label="Clear search"
        title="Clear search"
      >
        <XIcon class="size-4" />
      </Button>
    {/if}
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="-ml-3 size-8! min-w-0 shrink-0 cursor-pointer rounded-none p-0! hover:bg-transparent"
      onclick={submit}
      aria-label="Search"
      title="Search"
    >
      <SearchIcon class="size-4" />
    </Button>
  </div>
</div>
