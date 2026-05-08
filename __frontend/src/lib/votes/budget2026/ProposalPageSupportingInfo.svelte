<script>
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";

  let { proposal } = $props();
  let linkWarningDialog;

  const links = $derived(
    Array.isArray(proposal?.metaData?.supportingInfoLinks)
      ? proposal.metaData.supportingInfoLinks.filter((link) => link?.url && typeof link.url === "string")
      : [],
  );
</script>

{#if links.length > 0}
  <section class="text-sm mb-8 mt-12" id="supporting-info">
    <h2 class="mb-4">Other Supporting Information</h2>
    <ul class="space-y-0.5 list-none p-0">
      {#each links as link, i (i)}
        <li>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline inline-flex items-start gap-1 text-sm cursor-pointer"
            onclick={(e) => {
              e.preventDefault();
              linkWarningDialog.show(link.url, link.title?.trim() || link.url);
            }}
          >
            <ExternalLinkIcon class="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span class="min-w-0 wrap-break-word">
              {link.title?.trim() || link.url}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<LinkWarningDialog bind:this={linkWarningDialog} />
