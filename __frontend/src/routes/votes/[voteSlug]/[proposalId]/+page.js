import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

export async function load({ params, fetch }) {
	const { voteSlug, proposalId } = params;

	const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';

	// Fetch vote by slug
	const voteResponse = await fetch(`${apiUrl}/votes/?slug=${voteSlug}`);
	if (!voteResponse.ok) {
		error(voteResponse.status, `Failed to load vote: ${voteResponse.statusText}`);
	}
	const voteResponseJson = await voteResponse.json();
	let voteData = voteResponseJson.data[0];
	if (!voteData) {
		error(404, `Vote not found`);
	}

	// Fetch proposal (use api.fetch so auth cookie/header is sent; proposer can then view draft/archived)
	const proposalResponse = await api.fetch(fetch, `/proposals/${proposalId}`);
	if (!proposalResponse.ok) {
		error(proposalResponse.status, `Failed to load proposal: ${proposalResponse.statusText}`);
	}
	const proposalResponseJson = await proposalResponse.json();
	let proposalData = proposalResponseJson;
	if (!proposalData) {
		error(404, `Proposal not found`);
	}

	return {
		vote: voteData,
		proposal: proposalData,
	};
}
