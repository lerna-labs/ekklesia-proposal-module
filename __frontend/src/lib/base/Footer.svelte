<script>
  import Logo from "$lib/base/Logo.svelte";
  import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
  import { versionInfo } from "$stores/versionStore.js";

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
</script>

<footer class="bg-(--mbo-tangy-blue) text-white">
  <div class="container mx-auto max-w-4xl py-8 px-4">
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-4">
        <Logo />
        <button
          type="button"
          onclick={scrollToTop}
          class="flex h-[47px] w-10 shrink-0 -mr-3 cursor-pointer items-center justify-center rounded text-white"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUpIcon class="size-6" />
        </button>
      </div>
      <div class="text-xs">&copy; 2026. Intersect. All Rights Reserved.</div>
    </div>
    <div class="text-xs mt-4 flex items-center justify-between gap-4">
      <ul class="flex items-center gap-2">
        <li>
          <a
            href="https://docs.intersectmbo.org/legal/policies-and-conditions/cookie-policy"
            class="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cookie Policy
          </a>
        </li>
        <li>
          <a
            href="https://docs.intersectmbo.org/legal/policies-and-conditions/privacy-policy"
            class="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy Policy
          </a>
        </li>
        <li>
          <a
            href="https://docs.intersectmbo.org/legal/policies-and-conditions/terms-of-use"
            class="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms of Use
          </a>
        </li>
      </ul>
      {#if $versionInfo.version}
        <span class="text-white/50 shrink-0">
          Version {$versionInfo.version}
        </span>
      {/if}
    </div>
  </div>
</footer>
