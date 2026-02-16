<script>
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button/index.js';
	import { getWallets, enableWallet, checkNetwork, getSignerAddress } from './WalletConnect.js';
	import { onMount, createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	const dispatch = createEventDispatcher();
	const NETWORK_ID = $derived.by(() => $page.data.serverStatus.networkId);

	let { signType = 'stake' } = $props();
	let allWallets = $state([]);
	let wallets = $derived.by(() => {
		if (signType === 'pool') {
			return allWallets.filter((wallet) => wallet.includes('eternl'));
		}
		return allWallets;
	});
	let selectedWallet = $state(undefined);
	let connectedWallet = $state(undefined);
	let walletApi = $state(undefined);
	let loading = $state(false);

	onMount(async () => {
		const walletList = await getWallets();

		// if no wallets available, show error
		if (walletList.error) {
			toast.error('No wallets available');
			dispatch('nowallets', walletList.error);
			return;
		}

		allWallets = walletList;
	});

	async function connectWallet(walletName) {
		loading = true;
		selectedWallet = walletName;
		walletApi = await enableWallet(selectedWallet, NETWORK_ID);
		if (walletApi.error) {
			toast.error(walletApi.error);
			reset();
			return;
		}

		let signerAddress;
		if(signType !== 'pool') {
			signerAddress = await getSignerAddress(walletApi, signType);
			if (signerAddress.error) {
				toast.error(signerAddress.error);
				reset();
				return;
			}
		}

		loading = false;
		connectedWallet = walletName;
		toast.success('Wallet connected successfully');
		dispatch('connected', {
			api: walletApi,
			walletName: selectedWallet,
			address: signerAddress,
			signType
		});
	}

	function reset() {
		loading = false;
		selectedWallet = undefined;
		walletApi = undefined;
		connectedWallet = undefined;
	}
</script>

{#if wallets.length > 0}
	<div class="wallets">
		{#each wallets as walletName}
			<Button
				variant="outline"
				class="mb-2 w-full"
				disabled={!signType || (selectedWallet && selectedWallet != walletName)}
				onclick={() => {
					if (loading) return;
					if (connectedWallet == walletName) {
						reset();
						return;
					} else {
						connectWallet(walletName);
					}
				}}
			>
				{#if loading && selectedWallet === walletName}
					<span class="wallet">{walletName} (Connecting...)</span>
				{:else}
					<span class="wallet"
						>{walletName}
						{#if connectedWallet == walletName}(Connected){/if}</span
					>
				{/if}
			</Button>
		{/each}
	</div>
{:else}
	<p>No wallets available</p>
{/if}

<style>
	.wallet::first-letter {
		text-transform: uppercase;
	}
</style>
