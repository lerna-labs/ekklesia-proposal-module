<script>
  import Markdown from "$lib/base/Markdown.svelte";
  import * as Accordion from "$lib/components/ui/accordion/index.js";

  let { proposal } = $props();

  const summary = $derived(proposal?.summary ?? "");
  const trackRecord = $derived(proposal?.metaData?.trackRecord ?? "");
</script>

{#if summary.trim()}
  <section class="text-sm" id="summary">
    <div class="**:first:mt-0">
      <Markdown content={summary} />
    </div>
  </section>
{/if}

{#if trackRecord.trim()}
  <Accordion.Root
    type="single"
    collapsible
    class="text-sm border-t border-b"
    id="track-record"
  >
    <Accordion.Item value="track-record">
      <Accordion.Trigger class="text-sm font-medium">
        Track record
      </Accordion.Trigger>
      <Accordion.Content class="**:first:mt-0">
        <Markdown content={trackRecord} />
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>
{/if}
