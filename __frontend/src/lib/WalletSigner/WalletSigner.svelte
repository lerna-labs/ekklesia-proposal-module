<script>
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { api, loggedIn, voter, setJWT } from '$stores/sessionManager.js';
	import Wallet from '$lib/WalletSigner/SignerWallet.svelte';
	import CardanoSigner from '$lib/WalletSigner/SignerCS.svelte';
	import SelectSignType from '$lib/WalletSigner/SignerSignType.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { goto, invalidateAll } from '$app/navigation';
	let { ballot = false, mode, dark, tx, buttonText = 'Submit Votes' } = $props();
	let open = $state(false);
	let selected = $state('wallet');
	let noWallets = $state(false);
	let signType = $state('drep');
	let multiSig = $state($voter?.multiSig || '');
	let poolId = $state($voter?.voterId || '');
	let scriptAddress = $derived.by(() => {
		if (multiSig && $loggedIn) {
			return $voter.voterId;
		}
		return '';
	});

	const VOTER_TYPES = import.meta.env.VITE_VOTER_TYPES;

	$effect(() => {
		if ($voter?.voterId.startsWith('stake')) signType = 'stake';
		else if ($voter?.voterId.startsWith('pool')) signType = 'pool';
		else if ($voter?.voterId.startsWith('drep')) signType = 'drep';
		else if ($voter?.voterId.startsWith('addr')) signType = 'addr';
	});

	// success
	async function submitSuccess(event) {
		toast.success(event.detail.message);
		$voter.pendingVoteCount = -1;
		$voter.lastTransaction = event.detail.transaction;
		await invalidateAll();
		open = false;
	}

	// store token
	async function storeToken(event) {
		const { address, token, expiresIn } = event.detail;
		setJWT(token, expiresIn);
		loggedIn.set(true);
		toast.success('Login successful');
		// get voter data
		const getVoter = await api.fetch(fetch, '/dashboard/');
		const voterData = await getVoter.json();
		voter.set(voterData);
		goto('/');
		open = false;
	}

	function close() {
		noWallets = false;
		open = false;
	}
</script>

<AlertDialog.Root bind:open on:openChange={close}>
	<AlertDialog.Trigger>
		<Button size="sm" class={dark ? 'bg-white text-black hover:bg-gray-200' : ''}>
			{mode == 'login' ? 'Connect Wallet' : buttonText}
		</Button>
	</AlertDialog.Trigger>
	<AlertDialog.Content
		class="max-h-full max-w-[320px] overflow-y-auto overflow-x-hidden p-4"
		interactOutsideBehavior="close"
	>
		<AlertDialog.Header class="mb-1">
			<AlertDialog.Title class="flex justify-between">
				{mode == 'login' ? 'Login' : 'Submit Votes'}
				<div class="flex items-center gap-2">
					<Label
						for="multisigsupport"
						class="ml-2 text-sm {multiSig ? 'text-black' : 'text-slate-500'}">MultiSig</Label
					>
					<Switch id="multisigsupport" bind:checked={multiSig} />
				</div>
			</AlertDialog.Title>
			<AlertDialog.Description>
				Use your CIP-95 compatible wallet or the
				<a href="https://github.com/gitmachtl/cardano-signer" target="_blank" class="link"
					>CardanoSigner</a
				> to sign.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<Tabs.Root class="w-full" bind:value={selected}>
			<Tabs.List class="mb-2 flex w-full justify-evenly">
				<Tabs.Trigger value="wallet" disabled={noWallets}>Connect Wallet</Tabs.Trigger>
				<Tabs.Trigger value="signer">Use CardanoSigner</Tabs.Trigger>
			</Tabs.List>

			{#if multiSig}
				{#if !$loggedIn}
					<!-- MULTISIG ADDRESS -->
					<Input
						type="text"
						bind:value={scriptAddress}
						class="mb-2"
						placeholder="Enter MultiSig DRep-ID"
					/>
					<!-- SELECT SIGNTYPE -->
					<SelectSignType
						value={signType}
						mode={selected}
						on:change={(e) => (signType = e.detail)}
					/>
				{:else}
					<!-- display VoterId -->
					<Input type="text" value={$voter.voterId} disabled class="mb-2" />
					<!-- SELECT SIGNTYPE -->
					<SelectSignType
						value={signType}
						mode={selected}
						on:change={(e) => (signType = e.detail)}
					/>
				{/if}
			{/if}

			{#if !multiSig}
				{#if !$loggedIn}
					<!-- SELECT SIGNTYPE -->
					<SelectSignType
						value={signType}
						mode={selected}
						on:change={(e) => (signType = e.detail)}
					/>
					<!-- ENTER POOL ID -->
					{#if signType === 'pool' && selected === 'wallet'}
						<Input
							type="text"
							placeholder="Please enter your Pool ID"
							class="mb-2"
							bind:value={poolId}
						/>
					{/if}
				{:else}
					<!-- display VoterId -->
					{#if selected === 'wallet'}
						<Input type="text" value={$voter.voterId} disabled />
					{/if}
				{/if}
			{/if}

			<!-- CONNECT WALLET -->
			<Tabs.Content value="wallet">
				<Wallet
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
						selected = 'signer';
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
	</AlertDialog.Content>
</AlertDialog.Root>
