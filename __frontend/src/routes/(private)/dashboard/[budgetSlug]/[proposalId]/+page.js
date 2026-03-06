import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params, parent }) {
	await parent();
	const { proposalId, budgetSlug } = params;

	let proposalRes;
	try {
		proposalRes = await api.fetch(fetch, `/proposals/${proposalId}`);
	} catch (err) {
		const status = err?.status ?? 500;
		const bodyMsg = typeof err?.body === 'string' ? err.body : err?.body?.message;
		const message =
			status === 403
				? bodyMsg || "You don't have permission to edit this proposal."
				: status === 404
					? bodyMsg || "Proposal not found or you don't have access to edit it."
					: bodyMsg || err?.message || 'Failed to load proposal.';
		error(status, message);
	}
	const proposal = await proposalRes.json();

	const voteId = proposal.voteId;
	if (!voteId) {
		error(404, 'Proposal has no vote');
	}

	const voteRes = await api.fetch(fetch, `/votes/${voteId}`);
	if (!voteRes.ok) {
		error(voteRes.status, 'Vote not found');
	}
	const vote = await voteRes.json();

	// Ensure URL slug matches this proposal's vote
	if (vote.slug && vote.slug !== budgetSlug) {
		error(404, 'Proposal does not belong to this vote');
	}

	const pillars = vote.metaData?.strategyFramework?.pillars ?? [];

	return { proposal, vote, pillars };
}
