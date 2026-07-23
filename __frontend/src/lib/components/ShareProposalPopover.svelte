<script>
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import Share2Icon from "@lucide/svelte/icons/share-2";
  import MailIcon from "@lucide/svelte/icons/mail";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import { toast } from "svelte-sonner";
  import XBrandIcon from "$lib/components/form/icons/XBrandIcon.svelte";
  import LinkedInBrandIcon from "$lib/components/form/icons/LinkedInBrandIcon.svelte";
  import FacebookBrandIcon from "$lib/components/form/icons/FacebookBrandIcon.svelte";

  let {
    buttonLabel = "Share Proposal",
    defaultText = "",
    shareUrl = "",
  } = $props();

  const resolvedShareUrl = $derived.by(() => {
    const explicit = String(shareUrl ?? "").trim();
    if (explicit) return explicit;
    if (typeof window !== "undefined") return window.location.href;
    return "";
  });

  const socialShareUrl = $derived.by(() => {
    if (!resolvedShareUrl) return resolvedShareUrl;

    try {
      const url = new URL(resolvedShareUrl);
      const match = url.pathname.match(/^\/votes\/([^/]+)\/([^/?#]+)$/);
      if (!match) return resolvedShareUrl;

      const [, voteSlug, proposalId] = match;
      const apiUrlRaw = String(import.meta.env?.VITE_API_URL ?? "").trim();
      if (apiUrlRaw) {
        try {
          const apiUrl = new URL(apiUrlRaw, url.origin);
          url.protocol = apiUrl.protocol;
          url.host = apiUrl.host;
        } catch {
          // Ignore invalid API URL and keep current origin.
        }
      }
      url.pathname = `/share/votes/${voteSlug}/${proposalId}`;
      return url.toString();
    } catch {
      return resolvedShareUrl;
    }
  });

  const encodedUrl = $derived(encodeURIComponent(socialShareUrl));
  const encodedText = $derived(encodeURIComponent(defaultText));
  const encodedEmailSubject = $derived(
    encodeURIComponent(defaultText || "Check out this proposal"),
  );
  const encodedEmailBody = $derived(
    encodeURIComponent(
      defaultText
        ? `${defaultText}\n\n${socialShareUrl}`
        : socialShareUrl,
    ),
  );

  const shareLinks = $derived.by(() => {
    if (!resolvedShareUrl) return [];
    return [
      {
        id: "x",
        label: "Share on X / Twitter",
        href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      },
      {
        id: "facebook",
        label: "Share on Facebook",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        id: "linkedin",
        label: "Share on LinkedIn",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      },
      {
        id: "email",
        label: "Share via Email",
        href: `mailto:?subject=${encodedEmailSubject}&body=${encodedEmailBody}`,
      },
    ];
  });

  function copyLink() {
    if (!socialShareUrl) return;
    navigator.clipboard.writeText(socialShareUrl).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy"),
    );
  }
</script>

<Popover.Root>
  <Popover.Trigger asChild={true}>
    <Button type="button" variant="outline" size="sm" class="gap-2 text-xs">
      <Share2Icon class="size-4 shrink-0" aria-hidden="true" />
      {buttonLabel}
    </Button>
  </Popover.Trigger>
  <Popover.Content class="w-52 p-2" align="start">
    <div class="space-y-1">
      {#if shareLinks.length > 0}
        <div class="grid grid-cols-5 gap-1">
          {#each shareLinks as link (link.id)}
            <a
              href={link.href}
              target={link.id === "email" ? undefined : "_blank"}
              rel={link.id === "email" ? undefined : "noopener noreferrer"}
              class="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted"
              aria-label={link.label}
              title={link.label}
            >
              {#if link.id === "x"}
                <XBrandIcon class="size-4" />
              {:else if link.id === "facebook"}
                <FacebookBrandIcon class="size-4" />
              {:else if link.id === "linkedin"}
                <LinkedInBrandIcon class="size-4" />
              {:else}
                <MailIcon class="size-4" aria-hidden="true" />
              {/if}
            </a>
          {/each}
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted cursor-pointer"
            aria-label="Copy link"
            title="Copy link"
            onclick={copyLink}
          >
            <CopyIcon class="size-4" aria-hidden="true" />
          </button>
        </div>
      {:else}
        <p class="px-2 py-1.5 text-xs text-muted-foreground">
          Share URL unavailable.
        </p>
      {/if}
    </div>
  </Popover.Content>
</Popover.Root>
