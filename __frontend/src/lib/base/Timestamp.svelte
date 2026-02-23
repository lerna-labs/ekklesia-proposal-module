<script>
  import * as Popover from "$lib/components/ui/popover";

  let { value = null, class: className = "" } = $props();

  let now = $state(new Date());

  $effect(() => {
    const d = value ? new Date(value) : null;
    if (!d || isNaN(d.getTime())) return;
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
    if (diffMin < 60) {
      const id = setInterval(() => (now = new Date()), 60_000);
      return () => clearInterval(id);
    }
  });

  function formatRelative(date) {
    if (!date || isNaN(date.getTime())) return "—";
    const d = date;
    const n = now;
    const diffMs = n.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return diffMin === 1 ? "1 minute ago" : `${diffMin} minutes ago`;
    const sameDay = d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    if (sameDay) return "Today";
    const yesterday = new Date(n);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()) {
      return "Yesterday";
    }
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function formatExact(date) {
    if (!date || isNaN(date.getTime())) return "—";
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const date = $derived(value ? new Date(value) : null);
  const relative = $derived(formatRelative(date));
  const exact = $derived(formatExact(date));
</script>

{#if date}
  <Popover.Root>
    <Popover.Trigger
      class="inline-block cursor-help border-b border-dotted border-muted-foreground/50 hover:border-muted-foreground bg-transparent p-0 text-left font-inherit text-inherit min-w-0 {className}"
    >
      {relative}
    </Popover.Trigger>
    <Popover.Content align="start" class="w-auto p-2 text-xs">
      {exact}
    </Popover.Content>
  </Popover.Root>
{:else}
  <span class={className}>—</span>
{/if}
