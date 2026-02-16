<script>
	import { loggedIn, voter } from '$stores/sessionManager.js';
	import { createEventDispatcher } from 'svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { toast } from 'svelte-sonner';
	import { getPayload, signData, submitSignature } from '$lib/WalletSigner/WalletSigner.js';
	import SignerCommand from './SignerCommand.svelte';

	const dispatch = createEventDispatcher();
	let { signType = '', ballot, mode, scriptAddress, multiSig, tx } = $props();
	let signerAddress = $state('');
	let receivedPayload = $state(undefined);
	let signatureJSON = $state('');
	let loading = $state(false);
	let placeholder = $derived.by(() => {
		switch (signType) {
			case 'addr':
				return 'Please enter your payment address';
			case 'drep':
				return 'Please enter your CIP-129 DRep-ID';
			case 'pool':
				return 'Please enter your Pool ID';
			case 'stake':
				return 'Please enter your stake address';
		}
	});

	$effect(() => {
		if ($loggedIn && !multiSig) {
			signerAddress = $voter?.voterId;
		}
	});

	// Request payload for signing
	async function requestPayload() {
		loading = true;
		let url = mode === 'login' ? '/session' : '/dashboard/' + ballot._id + '/checkout';
		if (multiSig) {
			url += '/multisig';
		}
		if (tx) {
			url += '/' + tx;
		}
		try {
			const payload = await getPayload(url, signerAddress, signType, scriptAddress);
			if (payload?.error) {
				toast.error(payload.error);
				loading = false;
				return;
			}
			receivedPayload = payload;
			loading = false;
		} catch (e) {
			toast.error(e.body.message || 'Error fetching payload');
			loading = false;
			return;
		}
	}

	async function submitPayload() {
		loading = true;
		let signature;
		try {
			signature = JSON.parse(signatureJSON);
		} catch (e) {
			toast.error('Invalid JSON format');
			loading = false;
			return;
		}
		let url = mode === 'login' ? '/session' : '/dashboard/' + ballot._id + '/checkout';
		if (multiSig) {
			url += '/multisig';
		}
		try {
			const submitResponse = await submitSignature(
				url,
				signerAddress,
				signType,
				signature,
				receivedPayload?.merkleRoot,
				scriptAddress
			);
			if (submitResponse?.error) {
				toast.error(submitResponse.error);
				loading = false;
				return;
			}
			if (mode === 'login') {
				dispatch('login', {
					address: signerAddress,
					token: submitResponse.token,
					expiresIn: submitResponse.expiresIn,
					maxAge: submitResponse.maxAge
				});
			} else {
				dispatch('success', submitResponse);
			}
		} catch (e) {
			console.log('this error');
			toast.error(e.body.message || 'Error submitting signature');
			loading = false;
			return;
		}
	}

	function cancel() {
		dispatch('cancel');
	}
</script>

{#if !receivedPayload}
	<Input type="text" {placeholder} class="mt-2 w-full" bind:value={signerAddress} />

	<Button
		class="mt-2 w-full"
		onclick={requestPayload}
		disabled={!signType || !signerAddress || loading}
	>
		{#if !signType}
			Select how to sign
		{:else if !signerAddress}
			Enter Address
		{:else if loading}
			Loading...
		{:else}
			Get Data
		{/if}
	</Button>
	<Button onclick={cancel} class="mt-1 w-full bg-red-500">Cancel</Button>
{/if}

{#if receivedPayload}
	<SignerCommand
		{signerAddress}
		{signType}
		dataHex={receivedPayload.dataHex}
		payload={receivedPayload}
	/>

	<Textarea
		placeholder="Paste the JSON payload here"
		class="mt-2 w-full text-xs"
		bind:value={signatureJSON}
		disabled={!signerAddress}
		rows={4}
	/>

	<Button class="mt-2 w-full" onclick={submitPayload} disabled={!signerAddress || !signatureJSON}>
		{#if !signerAddress}
			Select how to sign
		{:else if !signatureJSON}
			Paste JSON
		{:else if loading}
			Waiting...
		{:else}
			Submit signature
		{/if}
	</Button>
	<Button onclick={cancel} class="mt-1 w-full bg-red-500">Cancel</Button>
{/if}
