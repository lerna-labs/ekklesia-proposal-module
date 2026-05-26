<script>
  import { loggedIn, logout } from "$stores/sessionManager.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import WalletSigner from "$lib/WalletSigner/WalletSigner.svelte";
  import { User, LogOut, Menu, X, ExternalLinkIcon } from "lucide-svelte";

  /** Matches [+page.svelte](routes/+page.svelte) “View Docs”. */
  const DOCS_HREF = "https://docs.hydra-voting.intersectmbo.org";

  /** Menu control / hamburger vs X */
  let menuOpen = $state(false);
  /** Keeps the panel mounted until exit animation finishes */
  let showAside = $state(false);
  let menuExiting = $state(false);

  const asideId = "site-navigation-aside";

  function openMenu() {
    menuOpen = true;
    showAside = true;
    menuExiting = false;
  }

  function startClose() {
    if (!showAside || menuExiting) return;
    menuOpen = false;
    menuExiting = true;
  }

  function toggleMenu() {
    if (menuOpen) {
      startClose();
      return;
    }
    openMenu();
  }

  function closeMenu() {
    startClose();
  }

  /** @param {AnimationEvent} e */
  function onAsideAnimationEnd(e) {
    if (!menuExiting) return;
    const name = e.animationName ?? "";
    if (!name.includes("nav-aside-fly-out")) return;
    showAside = false;
    menuExiting = false;
  }

  function onNavKeydown(/** @type {KeyboardEvent} */ e) {
    if (e.key !== "Escape") return;
    if (!showAside || menuExiting) return;
    startClose();
  }
</script>

<svelte:window onkeydown={onNavKeydown} />

<nav>
  <ul class="flex items-center gap-2">
    <li class="flex items-center gap-2">
      {#if !$loggedIn}
        <WalletSigner mode="login" dark={true} />
      {:else}
        <div class="flex items-center gap-2">
          <Button
            href="/dashboard"
            title="My Dashboard"
            aria-label="My Dashboard"
            size="sm"
            class="bg-white text-black hover:bg-gray-200 text-xs"
          >
            <User />
            <div class="hidden sm:block">My Dashboard</div>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            title="Log out"
            class="text-white text-xs cursor-point"
            onclick={() => logout()}
            aria-label="Log out"
          >
            <LogOut class="size-4" />
            <span class="hidden sm:inline">Log out</span>
          </Button>
        </div>
      {/if}
    </li>
    <li class="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="text-white hover:bg-transparent! hover:text-white!"
        onclick={toggleMenu}
        aria-expanded={menuOpen}
        aria-controls={asideId}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        {#if menuOpen}
          <X class="size-5" />
        {:else}
          <Menu class="size-5" />
        {/if}
      </Button>
    </li>
  </ul>
</nav>

{#if showAside}
  <!--
    Top matches Header: h-8 + logo row + pb-4 (smaller logo h-12 → 6rem; sm:h-18 → 7.5rem).
    max-md: clip wrapper is viewport minus header; aside fills it (full height minus header).
  -->
  <div class="pointer-events-none fixed inset-x-0 bottom-0 z-50 overflow-hidden top-[6rem] sm:top-[7.5rem]">
    <aside
      id={asideId}
      class="pointer-events-auto absolute top-0 left-0 flex w-full flex-col gap-5 bg-(--mbo-tangy-blue) py-5 text-white shadow-2xl border-b border-white/15 max-md:right-auto max-md:w-max max-md:max-w-[calc(100vw-1rem)] max-md:bottom-0 max-md:overflow-y-auto md:right-0 md:bottom-auto md:pt-6 md:pb-10"
      class:nav-aside-fly-enter={!menuExiting}
      class:nav-aside-fly-exit={menuExiting}
      aria-label="Site navigation"
      onanimationend={onAsideAnimationEnd}
    >
      <!-- Same wrapper as Header (container, max-w-4xl, px-4) for alignment with the logo -->
      <div class="px-4 w-full max-md:w-max md:container md:mx-auto md:max-w-4xl">
        <nav class="flex w-full flex-col gap-8 max-md:w-max md:w-full md:flex-row md:gap-0" aria-label="Site sections">
          <section class="min-w-0 w-full max-md:flex-none md:flex-1" aria-labelledby="nav-heading-budget">
            <h2 id="nav-heading-budget" class="mb-3 text-sm font-semibold text-white/90">
              <a
                href="/budget-process"
                class="text-inherit underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                onclick={closeMenu}
              >
                Budget Process
              </a>
            </h2>
            <ul class="flex flex-col gap-2">
              <li>
                <a
                  href="/votes/cardano-budget-2026"
                  class="ml-2 text-sm font-base text-white underline-offset-4 hover:underline"
                  onclick={closeMenu}
                >
                  Budget 2026 Proposals
                </a>
              </li>
              <li>
                <a
                  href="https://intersect.ekklesia.vote/ballots/6a1512d782978c99456fe6de/proposals"
                  class="ml-2 text-sm font-base text-white underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  onclick={closeMenu}
                >
                  Budget 2026 Voting
                </a>
              </li>
            </ul>
          </section>

          <section
            class="min-w-0 w-full max-md:flex-none border-t border-white/50 pt-8 md:flex-1 md:border-t-0 md:border-l md:border-white/50 md:pt-0 md:pl-10 lg:pl-12"
            aria-labelledby="nav-heading-cc"
          >
            <h2 id="nav-heading-cc" class="mb-3 text-sm font-semibold text-white/90">
              <a
                href="/cc-elections"
                class="text-inherit underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
                onclick={closeMenu}
              >
                CC Elections
              </a>
            </h2>
            <ul class="flex flex-col gap-2">
              <li>
                <a
                  href="/votes/cc-vote-2026"
                  class="ml-2 text-sm font-base text-white underline-offset-4 hover:underline"
                  onclick={closeMenu}
                >
                  CC Vote 2026
                </a>
              </li>
            </ul>
          </section>

          <section
            class="min-w-0 w-full max-md:flex-none border-t border-white/50 pt-8 md:flex-1 md:border-t-0 md:border-l md:border-white/50 md:pt-0 md:pl-10 lg:pl-12"
            aria-labelledby="nav-heading-voting"
          >
            <h2 id="nav-heading-voting" class="mb-3 text-sm font-semibold text-white/90">Voting Events</h2>
            <ul class="flex flex-col gap-2">
              <li>
                <a
                  href="https://intersect.ekklesia.vote/ballots"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ml-2 text-sm font-base text-white underline-offset-4 hover:underline"
                  onclick={closeMenu}
                >
                  All Voting Events
                </a>
              </li>
              <li>
                <a
                  href={DOCS_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ml-2 inline-flex items-center gap-1.5 text-sm font-base text-white underline-offset-4 hover:underline"
                  onclick={closeMenu}
                >
                  Docs
                  <ExternalLinkIcon class="size-3.5 shrink-0 opacity-90" aria-hidden="true" />
                  <span class="sr-only">(opens in new tab)</span>
                </a>
              </li>
            </ul>
          </section>
        </nav>
      </div>
    </aside>
  </div>
{/if}

<style>
  /* Transform only — no opacity change */
  @keyframes nav-aside-fly-in-y {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes nav-aside-fly-in-x {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes nav-aside-fly-out-y {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-100%);
    }
  }

  @keyframes nav-aside-fly-out-x {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
  }

  .nav-aside-fly-enter {
    animation: nav-aside-fly-in-x 0.28s ease-out forwards;
  }

  @media (min-width: 768px) {
    .nav-aside-fly-enter {
      animation: nav-aside-fly-in-y 0.28s ease-out forwards;
    }
  }

  .nav-aside-fly-exit {
    animation: nav-aside-fly-out-x 0.28s ease-in forwards;
  }

  @media (min-width: 768px) {
    .nav-aside-fly-exit {
      animation: nav-aside-fly-out-y 0.28s ease-in forwards;
    }
  }
</style>
