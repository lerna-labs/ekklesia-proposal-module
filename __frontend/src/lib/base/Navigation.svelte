<script>
  import { loggedIn, logout } from "$stores/sessionManager.js";
  import Button from "$lib/components/ui/button/button.svelte";
  import WalletSigner from "$lib/WalletSigner/WalletSigner.svelte";
  import { User, LogOut, FileText } from "lucide-svelte";
</script>

<nav>
  <ul class="flex items-center gap-2">
    <li>
      <Button
        href="/votes/cardano-budget-2026"
        title="View Proposals"
        aria-label="View Proposals"
        variant="outline"
        size="sm"
        class="text-xs text-black"
      >
        <FileText class="size-4" />
        <span class="hidden sm:block">View Proposals</span>
      </Button>
    </li>
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
  </ul>
</nav>
