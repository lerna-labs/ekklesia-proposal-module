<script>
  import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
  import { versionInfo } from "$stores/versionStore.js";

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
</script>

<footer class="bg-(--mbo-tangy-blue) text-white">
  <div class="container mx-auto max-w-4xl px-4 py-8">
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-4">
        <svg width="135" height="47" fill="none">
          <path
            fill="#fff"
            d="M2.488 14.536v16.659H0v-16.66h2.488Zm17.617 16.659h-2.489L10.132 18.76V47H7.644V14.514h2.488l7.484 12.412V0h2.489v31.195Zm14.372-16.66v2.233h-4.041v14.427h-2.488V16.768h-4.061v-2.232h10.59Zm6.31 2.19v4.881h5.235v2.233h-5.235v5.1h5.892v2.234h-8.36V14.492h8.36v2.233h-5.892Zm18.333 14.47-3.484-6.655h-1.89v6.655h-2.489v-16.66h5.235c1.155 0 2.15.22 2.946.68a4.327 4.327 0 0 1 1.812 1.794c.398.745.597 1.598.597 2.518 0 .92-.279 2.08-.856 2.955-.577.898-1.453 1.489-2.648 1.817l3.743 6.896H59.12Zm-5.375-8.844h2.747c.936 0 1.632-.263 2.11-.767.478-.503.717-1.203.717-2.057 0-.854-.24-1.533-.697-2.036-.458-.482-1.174-.723-2.11-.723h-2.747v5.583h-.02Zm14.81 8.406c-.816-.394-1.453-.941-1.91-1.664-.459-.722-.698-1.554-.698-2.517h2.668c.06.722.318 1.313.776 1.773.458.46 1.095.7 1.93.7.837 0 1.534-.218 2.011-.678.478-.46.717-1.051.717-1.752 0-.7-.14-1.006-.438-1.357a3.113 3.113 0 0 0-1.115-.81c-.438-.197-1.055-.394-1.85-.613-.996-.284-1.792-.569-2.41-.875a4.06 4.06 0 0 1-1.572-1.38c-.438-.612-.657-1.444-.657-2.495 0-1.05.219-1.795.657-2.517.438-.723 1.055-1.27 1.831-1.664.777-.394 1.692-.57 2.727-.57 1.473 0 2.668.395 3.603 1.205.936.81 1.453 1.904 1.553 3.327H73.63c-.04-.613-.299-1.116-.776-1.554-.478-.438-1.115-.657-1.891-.657-.777 0-1.294.197-1.752.591-.458.394-.677.985-.677 1.73 0 .744.14.94.418 1.247.279.329.637.591 1.075.788.438.197 1.035.394 1.791.613.996.307 1.812.613 2.449.92a4.088 4.088 0 0 1 1.612 1.4c.438.636.657 1.468.657 2.54 0 1.073-.199 1.642-.617 2.386a4.767 4.767 0 0 1-1.811 1.817c-.797.46-1.732.679-2.807.679s-1.93-.197-2.747-.591v-.022Zm15.069-14.032v4.881h5.235v2.233h-5.235v5.1h5.892v2.234h-8.36V14.492h8.36v2.233h-5.892Zm10.33 1.707c.697-1.291 1.633-2.298 2.807-3.043a7.325 7.325 0 0 1 3.882-1.094c1.393 0 3.045.438 4.299 1.313 1.255.876 2.17 2.102 2.728 3.7h-2.986c-.398-.876-.936-1.532-1.633-1.97-.696-.438-1.512-.657-2.428-.657-.916 0-1.891.24-2.687.744-.777.504-1.394 1.204-1.852 2.124-.437.92-.656 2.014-.656 3.24 0 1.225.219 2.298.657 3.24.437.919 1.055 1.641 1.85 2.145.777.503 1.673.744 2.688.744 1.015 0 1.732-.219 2.428-.657.697-.438 1.235-1.094 1.633-1.97h2.986c-.558 1.598-1.473 2.824-2.728 3.7-1.254.853-2.687 1.291-4.299 1.291-1.612 0-2.727-.372-3.902-1.094-1.174-.723-2.11-1.73-2.806-3.043-.697-1.292-1.035-2.758-1.035-4.378s.338-3.087 1.035-4.378l.02.043Zm27.271-3.896v2.232h-4.041v14.427h-2.488V16.768h-4.06v-2.232h10.589ZM127.456 10.07v1.072h-1.613v5.605h-1.214v-5.604h-1.612V10.07h4.458-.019ZM134.98 10.07v6.677h-1.214V12.39l-1.633 4.357h-.915l-1.633-4.357v4.357h-1.214V10.07h1.393l1.931 4.97 1.931-4.97H135h-.02Z"
          ></path>
        </svg>
        <button
          type="button"
          onclick={scrollToTop}
          class="-mr-3 flex h-[47px] w-10 shrink-0 cursor-pointer items-center justify-center rounded text-white"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <ArrowUpIcon class="size-6" />
        </button>
      </div>
      <div class="text-xs">&copy; 2026. Intersect. All Rights Reserved.</div>
    </div>
    <div class="mt-4 flex items-center justify-between gap-4 text-xs">
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
        <span class="shrink-0 text-white/75">
          Version {$versionInfo.version}
        </span>
      {/if}
    </div>
  </div>
</footer>
