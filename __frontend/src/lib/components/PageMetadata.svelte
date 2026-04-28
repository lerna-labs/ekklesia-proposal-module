<script>
  let {
    title = "",
    description = "",
    url = "",
    image = "https://hydra-voting.intersectmbo.org/images/social.png",
    type = "website",
  } = $props();

  function plainText(input) {
    return String(input ?? "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#>*_~]+/g, " ")
      .replace(/^\s*-\s+/gm, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function truncateMeta(text, max = 160) {
    const normalized = plainText(text);
    if (normalized.length <= max) return normalized;
    return `${normalized.slice(0, max - 3).trim()}...`;
  }

  const metaTitle = $derived(plainText(title));
  const metaDescription = $derived(truncateMeta(description));
  const metaUrl = $derived(String(url ?? "").trim());
  const metaImage = $derived(String(image ?? "").trim());
  const twitterCard = $derived(metaImage ? "summary_large_image" : "summary");
</script>

<svelte:head>
  {#if metaTitle}
    <title>{metaTitle}</title>
    <meta property="og:title" content={metaTitle} />
    <meta name="twitter:title" content={metaTitle} />
  {/if}

  {#if metaDescription}
    <meta name="description" content={metaDescription} />
    <meta property="og:description" content={metaDescription} />
    <meta name="twitter:description" content={metaDescription} />
  {/if}

  <meta property="og:type" content={type} />
  <meta name="twitter:card" content={twitterCard} />

  {#if metaUrl}
    <meta property="og:url" content={metaUrl} />
  {/if}

  {#if metaImage}
    <meta property="og:image" content={metaImage} />
    <meta name="twitter:image" content={metaImage} />
  {/if}
</svelte:head>
