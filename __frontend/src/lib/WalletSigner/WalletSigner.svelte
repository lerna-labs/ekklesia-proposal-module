<script>
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import {
    api,
    loggedIn,
    user,
    setJWT,
    showLogin,
    pendingCommentAction,
  } from "$stores/sessionManager.js";
  import Wallet from "$lib/WalletSigner/SignerWallet.svelte";
  import CardanoSigner from "$lib/WalletSigner/SignerCS.svelte";
  import SelectSignType from "$lib/WalletSigner/SignerSignType.svelte";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import WalletMinimalIcon from "@lucide/svelte/icons/wallet-minimal";
  import { toast } from "svelte-sonner";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { invalidateAll } from "$app/navigation";
  import { log } from "$lib/WalletSigner/logger.js";
  let {
    ballot = false,
    mode,
    dark,
    tx,
    buttonText = "Submit Votes",
  } = $props();
  let open = $state(false);
  let selected = $state("wallet");
  let noWallets = $state(false);
  let walletLoading = $state(false);
  const SIGNTYPE_STORAGE_KEY = "walletSigner_signType";
  const allowedTypes = (
    import.meta.env.VITE_WALLETSIGNER_USER_TYPES || "stake"
  ).split(",");
  const defaultFromEnv =
    import.meta.env.VITE_WALLETSIGNER_USER_DEFAULT || "stake";
  const storedSignType =
    typeof window !== "undefined"
      ? localStorage.getItem(SIGNTYPE_STORAGE_KEY)
      : null;
  const initialSignType =
    storedSignType && allowedTypes.includes(storedSignType)
      ? storedSignType
      : allowedTypes.includes(defaultFromEnv)
        ? defaultFromEnv
        : (allowedTypes[0] || "stake");
  let signType = $state(initialSignType);
  let multiSig = $state($user?.multiSig || "");
  let poolId = $state($user?.userId || "");
  let scriptAddress = $derived.by(() => {
    if (multiSig && $loggedIn) {
      return $user.userId;
    }
    return "";
  });

  const USER_TYPES = import.meta.env.VITE_WALLETSIGNER_USER_TYPES;
  const userTypes = USER_TYPES.split(",");
  const multisigEnabledByEnv =
    import.meta.env.VITE_WALLETSIGNER_MULTISIG === "true";

  $effect(() => {
    if (!multisigEnabledByEnv) multiSig = false;
  });

  $effect(() => {
    if ($user?.userId.startsWith("stake")) signType = "stake";
    else if ($user?.userId.startsWith("pool")) signType = "pool";
    else if ($user?.userId.startsWith("drep")) signType = "drep";
    else if ($user?.userId.startsWith("addr")) signType = "addr";
  });

  // Sync with showLogin store so the dialog can be opened programmatically (e.g. from Comments)
  $effect(() => {
    if ($showLogin) open = true;
  });
  $effect(() => {
    if (open) showLogin.set(true);
  });

  // success
  async function submitSuccess(event) {
    toast.success(event.detail.message);
    // $user.pendingVoteCount = -1;
    // $user.lastTransaction = event.detail.transaction;
    await invalidateAll();
    open = false;
    showLogin.set(false);
  }

  // store token
  async function storeToken(event) {
    const { address, token, expiresIn } = event.detail;
    setJWT(token, expiresIn);
    loggedIn.set(true);
    toast.success("Login successful");
    // get user data
    const getUser = await api.fetch(fetch, "/session/");
    const userData = await getUser.json();
    user.set(userData);
    await invalidateAll();
    open = false;
    showLogin.set(false);
  }

  function close() {
    noWallets = false;
    open = false;
    showLogin.set(false);
    pendingCommentAction.set(null);
  }

  function onSignTypeChange(e) {
    signType = e.detail;
    if (typeof window !== "undefined") {
      localStorage.setItem(SIGNTYPE_STORAGE_KEY, e.detail);
    }
    log("Sign type selected", e.detail);
  }
</script>

<AlertDialog.Root bind:open on:openChange={close}>
  <AlertDialog.Trigger>
    <Button
      size="sm"
      class={dark ? "bg-white text-black hover:bg-gray-200 text-xs" : "text-xs"}
    >
      <WalletMinimalIcon class="size-4 shrink-0" aria-hidden="true" />
      {mode == "login" ? "Connect Wallet" : buttonText}
    </Button>
  </AlertDialog.Trigger>
  <AlertDialog.Content
    class="max-h-[85vh] max-w-[320px] flex flex-col overflow-hidden p-4"
    interactOutsideBehavior="close"
  >
    <AlertDialog.Header class="mb-1 shrink-0">
      <AlertDialog.Title class="flex justify-between">
        {mode == "login" ? "Login" : "Submit Votes"}
        {#if multisigEnabledByEnv}
          <div class="flex items-center gap-2">
            <Label
              for="multisigsupport"
              class="ml-2 text-sm {multiSig ? 'text-black' : 'text-slate-500'}"
            >
              MultiSig
            </Label>
            <Switch id="multisigsupport" bind:checked={multiSig} />
          </div>
        {/if}
      </AlertDialog.Title>
      <AlertDialog.Description>
        Use your CIP-95 compatible wallet or the
        <a
          href="https://github.com/gitmachtl/cardano-signer"
          target="_blank"
          class="link"
        >
          CardanoSigner
        </a>
        to sign.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <Tabs.Root class="w-full" bind:value={selected}>
        <Tabs.List class="flex w-full justify-evenly">
          <Tabs.Trigger value="wallet" disabled={noWallets}>
            Connect Wallet
          </Tabs.Trigger>
          <Tabs.Trigger value="signer">Use CardanoSigner</Tabs.Trigger>
        </Tabs.List>

        {#if multiSig}
          {#if !$loggedIn}
            <!-- MULTISIG ADDRESS -->
            <Input
              type="text"
              bind:value={scriptAddress}
              placeholder="Enter MultiSig DRep-ID"
            />
            <!-- SELECT SIGNTYPE -->
            <SelectSignType
              value={signType}
              mode={selected}
              disabled={walletLoading}
              on:change={onSignTypeChange}
            />
          {:else}
            <!-- display VoterId -->
            <Input type="text" value={$user.userId} disabled class="mb-2" />
            <!-- SELECT SIGNTYPE -->
            <SelectSignType
              value={signType}
              mode={selected}
              disabled={walletLoading}
              on:change={onSignTypeChange}
            />
          {/if}
        {/if}

        {#if !multiSig}
          {#if !$loggedIn}
            <!-- SELECT SIGNTYPE -->
            <SelectSignType
              value={signType}
              mode={selected}
              disabled={walletLoading}
              on:change={onSignTypeChange}
            />
            <!-- ENTER POOL ID -->
            {#if signType === "pool" && selected === "wallet"}
              <Input
                type="text"
                placeholder="Please enter your Pool ID"
                class="mb-2"
                bind:value={poolId}
              />
            {/if}
          {:else}
            <!-- display userId -->
            {#if selected === "wallet"}
              <Input type="text" value={$user.userId} disabled />
            {/if}
          {/if}
        {/if}

        <!-- CONNECT WALLET -->
        <Tabs.Content value="wallet">
          <Wallet
            bind:loading={walletLoading}
            {signType}
            {mode}
            {ballot}
            {multiSig}
            {scriptAddress}
            {tx}
            {poolId}
            on:success={submitSuccess}
            on:login={storeToken}
            on:nowallets={() => {
              noWallets = true;
              selected = "signer";
            }}
            on:cancel={close}
          />
        </Tabs.Content>

        <!-- CARDANO SIGNER -->
        <Tabs.Content value="signer">
          <CardanoSigner
            {signType}
            {mode}
            {ballot}
            {multiSig}
            {scriptAddress}
            {tx}
            on:login={storeToken}
            on:success={submitSuccess}
            on:cancel={close}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </AlertDialog.Content>
</AlertDialog.Root>
