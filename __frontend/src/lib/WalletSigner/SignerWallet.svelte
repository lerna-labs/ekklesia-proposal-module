<script>
  import { createEventDispatcher } from "svelte";
  import WalletConnect from "./WalletConnect.svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { toast } from "svelte-sonner";
  import {
    getPayload,
    signData,
    submitSignature,
  } from "$lib/WalletSigner/WalletSigner.js";

  const dispatch = createEventDispatcher();
  let {
    signType = "",
    mode,
    ballot = false,
    scriptAddress,
    multiSig,
    tx,
    poolId,
  } = $props();
  let loading = $state(false);
  let connectedWallet = $state(undefined);
  let payload = $state(undefined);
  let multiSigCheck = $derived(multiSig);

  // Request ballot payload for signing
  async function checkout() {
    loading = true;
    let url = "/dashboard/" + ballot._id + "/checkout/";
    if (multiSigCheck) {
      url += "multisig";
    }
    if (tx) {
      url += "/" + tx;
    }

    // replace connected wallet address with pool id
    if (signType === "pool" && poolId) {
      connectedWallet.address = poolId;
    }

    const payload = await getPayload(
      url,
      connectedWallet.address,
      signType,
      scriptAddress,
    );
    if (payload?.error) {
      toast.error(payload.error);
      loading = false;
      return;
    }
    if (payload?.dataHex) {
      await signAndSubmit(payload);
      return;
    }
  }

  // Request login payload for signing
  async function login() {
    loading = true;
    const url = "/session";

    // replace connected wallet address with pool id
    if (signType === "pool" && poolId) {
      connectedWallet.address = poolId;
    }
    try {
      payload = await getPayload(
        url,
        connectedWallet.address,
        signType,
        scriptAddress,
      );
      if (payload?.error) {
        toast.error(payload.error);
        loading = false;
        return;
      }
      if (payload?.dataHex) {
        await signAndSubmit(payload);
        return;
      }
    } catch (error) {
      toast.error(error.body.message || "Error fetching payload");
      loading = false;
      return;
    }
  }

  // Sign and submit the payload
  async function signAndSubmit(payload) {
    loading = true;

    let signer = payload.userIdHex || payload.signerAddressHex;
    if (signType === "pool" && poolId) {
      signer = payload.calidusID;
    }
    const signature = await signData(connectedWallet, signer, payload.dataHex);
    if (signature?.error) {
      toast.error(signature.error);
      loading = false;
      return;
    }
    let url =
      mode === "login" ? "/session" : "/dashboard/" + ballot._id + "/checkout";
    if (mode !== "login" && multiSigCheck) {
      url += "/multisig";
    }
    const submitResponse = await submitSignature(
      url,
      payload.userId,
      signType,
      signature,
      payload.merkleRoot,
      scriptAddress,
    );
    if (submitResponse?.error) {
      toast.error(submitResponse.error);
      loading = false;
      return;
    }

    loading = false;
    if (mode === "login") {
      dispatch("login", {
        address: connectedWallet.address,
        token: submitResponse.token,
        expiresIn: submitResponse.expiresIn,
        maxAge: submitResponse.maxAge,
      });
    } else {
      dispatch("success", submitResponse);
    }
  }

  function cancel() {
    dispatch("cancel");
  }
</script>

<!-- SELECT WALLET -->
<WalletConnect
  {signType}
  on:connected={(e) => {
    connectedWallet = e.detail;
  }}
  on:nowallets={(e) => {
    dispatch("nowallets", e.detail);
  }}
/>
<Button
  class="w-full"
  disabled={!signType ||
    !connectedWallet ||
    loading ||
    (multiSigCheck === true && !scriptAddress) ||
    (signType === "pool" && !poolId)}
  onclick={mode == "login" ? login : checkout}
>
  {#if loading}
    Waiting...
  {:else if !connectedWallet}
    Select Wallet
  {:else if !signType}
    Select how to sign
  {:else if multiSigCheck && !scriptAddress}
    Enter Multisig DRep-ID
  {:else}
    Sign!
  {/if}
</Button>

<Button
  onclick={cancel}
  class="mt-1 w-full bg-red-500"
  variant={buttonVariants.outline}
>
  Cancel
</Button>
