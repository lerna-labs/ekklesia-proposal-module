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

	let categories = [];
	const catRes = await fetch(`${apiUrl}/votes/${voteData._id}/categories`);
	if (catRes.ok) {
		const catJson = await catRes.json();
		categories = catJson.data ?? [];
	}

	let commentCount;
	const isWithdrawn =
		proposalData?.status === 'withdrawnByAdmin' || proposalData?.status === 'withdrawnByProposer';
	if (isWithdrawn) {
		const commentsRes = await api.fetch(fetch, `/comments?proposal=${proposalId}&page=1&limit=1`);
		if (commentsRes.ok) {
			const commentsJson = await commentsRes.json();
			commentCount = commentsJson.meta?.total ?? 0;
		} else {
			commentCount = 0;
		}
	}

	return {
		vote: voteData,
		proposal: proposalData,
		categories,
		commentCount: commentCount,
	};
}
