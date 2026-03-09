<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as Input from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import SearchIcon from "@lucide/svelte/icons/search";
  import XIcon from "@lucide/svelte/icons/x";

  let { class: className = "", placeholder = "Search..." } = $props();
  let value = $state("");

  $effect(() => {
    const search = page.url.searchParams.get("search") ?? "";
    value = search;
  });

  /** Build query string with literal commas for status and category (no %2C). */
  function queryStringWithLiteralCommas(searchParams) {
    let qs = searchParams.toString();
    for (const key of ["status", "category"]) {
      const m = qs.match(new RegExp(`\\b${key}=([^&]*)`));
      if (m)
        qs = qs.replace(
          new RegExp(`\\b${key}=[^&]*`),
          key + "=" + decodeURIComponent(m[1]),
        );
    }
    return qs;
  }

  function submit() {
    const searchParams = new URLSearchParams(page.url.searchParams);
    const trimmed = value.trim();
    if (trimmed) {
      searchParams.set("search", trimmed);
    } else {
      searchParams.delete("search");
    }
    const url = `${page.url.pathname}?${queryStringWithLiteralCommas(searchParams)}`;
    goto(url);
  }

  function clear() {
    value = "";
    const searchParams = new URLSearchParams(page.url.searchParams);
    searchParams.delete("search");
    const url = `${page.url.pathname}?${queryStringWithLiteralCommas(searchParams)}`;
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
    class="min-w-0 flex-1 pl-2 pr-8"
    aria-label="Search"
  />
  <div class="absolute right-0 top-0 flex h-full items-center gap-0 pr-0.5">
    {#if value.trim()}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="size-8! min-w-0 shrink-0 rounded-none p-0! bg-white hover:bg-white cursor-pointer"
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
      class="size-8! min-w-0 shrink-0 rounded-none p-0! -ml-3 hover:bg-transparent cursor-pointer"
      onclick={submit}
      aria-label="Search"
      title="Search"
    >
      <SearchIcon class="size-4" />
    </Button>
  </div>
</div>
