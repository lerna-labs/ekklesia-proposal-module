import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

export async function load({ params, fetch, url }) {
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

	const pillars = voteData.metaData?.strategyFramework?.pillars ?? [];

	// Preview mode: proposal comes from localStorage on the client; do not fetch proposal
	if (url.searchParams.has('preview')) {
		return {
			vote: voteData,
			pillars,
			commentCount: 0,
			preview: true,
		};
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

	let commentCount = proposalData?.commentCount ?? null;
	const canShowComments =
		proposalData?.status !== 'draft' && proposalData?.status !== 'archived';
	if (canShowComments) {
		const commentsRes = await api.fetch(fetch, `/comments?proposal=${proposalId}&page=1&limit=1`);
		if (commentsRes.ok) {
			const commentsJson = await commentsRes.json();
			commentCount = commentsJson.meta?.total ?? 0;
		}
	}

	return {
		vote: voteData,
		proposal: proposalData,
		pillars,
		commentCount: commentCount,
	};
}
