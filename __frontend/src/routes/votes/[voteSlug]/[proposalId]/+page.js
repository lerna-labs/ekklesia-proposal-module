import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

export async function load({ params, fetch, url }) {
	const { voteSlug, proposalId } = params;

	const voteResponse = await api.fetch(fetch, `/votes/?slug=${encodeURIComponent(voteSlug)}`);
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

	// Fetch proposal via api.fetch so auth cookie is sent (proposer can view draft/archived)
	const proposalResponse = await api.fetch(fetch, `/proposals/${proposalId}`);
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
		const commentsJson = await commentsRes.json();
		commentCount = commentsJson.meta?.threadTotal ?? commentsJson.meta?.total ?? 0;
	}

	return {
		vote: voteData,
		proposal: proposalData,
		pillars,
		commentCount: commentCount,
	};
}
