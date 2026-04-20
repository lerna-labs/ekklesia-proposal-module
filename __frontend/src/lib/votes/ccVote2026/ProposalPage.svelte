<script>
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import { Badge } from "$lib/components/ui/badge";
  import Markdown from "$lib/base/Markdown.svelte";
  import Comments from "$lib/comments/Comments.svelte";

  let {
    proposal,
    vote,
    backToVoteUrl = "",
    voteUrl = "",
    currentVersionHref = null,
    showComments = false,
    isWithdrawn = false,
  } = $props();

  function goBackToList() {
    if (backToVoteUrl) {
      window.history.back();
    } else {
      goto(voteUrl);
    }
  }

  const TRACK_LABELS = {
    individual: "Individual",
    organisation: "Organisation",
    consortium: "Consortium",
  };

  const trackLabel = $derived.by(() => {
    const t = proposal?.metaData?.track;
    return t && TRACK_LABELS[/** @type {keyof typeof TRACK_LABELS} */ (t)]
      ? TRACK_LABELS[/** @type {keyof typeof TRACK_LABELS} */ (t)]
      : null;
  });
</script>

<div class="bg-white box-shadow-lg shadow-lg">
  <div class="space-y-6 container mx-auto max-w-4xl py-8 px-4">
    {#if !currentVersionHref}
      <div class="mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onclick={goBackToList}
          class="pl-0! gap-1.5 hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-foreground text-muted-foreground"
        >
          <ArrowLeftIcon class="size-4 shrink-0" aria-hidden="true" />
          Back to {vote?.title ?? vote?.name ?? "vote"}
        </Button>
      </div>
    {/if}

    <header class="space-y-2">
      {#if trackLabel}
        <Badge variant="secondary" class="font-normal">{trackLabel}</Badge>
      {/if}
      <h1 class="text-3xl font-semibold tracking-tight">
        {proposal?.title ?? "Proposal"}
      </h1>
    </header>

    {#if proposal?.summary}
      <section class="prose prose-neutral dark:prose-invert max-w-none">
        <h2 class="text-lg font-medium not-prose mb-2">Summary</h2>
        <Markdown content={proposal.summary} />
      </section>
    {/if}
  </div>
</div>

{#if showComments && proposal}
  <div id="comments" class="w-full bg-slate-100">
    <div class="container mx-auto max-w-4xl py-8 pb-5 px-4">
      <Comments proposalId={proposal._id} {proposal} {vote} readOnly={isWithdrawn} />
    </div>
  </div>
{/if}
