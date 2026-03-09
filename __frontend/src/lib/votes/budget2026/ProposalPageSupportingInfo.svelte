<script>
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";

  let { proposal } = $props();
  let linkWarningDialog;

  const links = $derived(
    Array.isArray(proposal?.metaData?.supportingInfoLinks)
      ? proposal.metaData.supportingInfoLinks.filter(
          (link) => link?.url && typeof link.url === "string",
        )
      : [],
  );
</script>

{#if links.length > 0}
  <section class="text-sm mb-8 mt-10">
    <h2 class="text-2xl font-medium mb-4">Other supporting information</h2>
    <ul class="space-y-0.5 list-none p-0">
      {#each links as link (link.url)}
        <li>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline inline-flex items-center gap-1 text-sm cursor-pointer"
            onclick={(e) => {
              e.preventDefault();
              linkWarningDialog.show(link.url, link.title?.trim() || link.url);
            }}
          >
            <ChevronRightIcon class="size-4 shrink-0" aria-hidden="true" />
            {link.title?.trim() || link.url}
            <ExternalLinkIcon class="size-3.5 shrink-0" aria-hidden="true" />
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<LinkWarningDialog bind:this={linkWarningDialog} />
