import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';
import { draftSubmissionOpen } from '$lib/voteWindowPolicy.js';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params, parent }) {
	await parent();
	const { voteSlug } = params;

	const votesRes = await api.fetch(fetch, `/votes?slug=${encodeURIComponent(voteSlug)}&limit=1`);
	const votesJson = await votesRes.json();
	const votes = votesJson.data ?? [];

	if (!votes.length) {
		error(404, 'Vote not found');
	}

	const vote = votes[0];
	const now = new Date();
	if (!draftSubmissionOpen(vote, now)) {
		error(
			403,
			'The submission period for this vote has ended. You cannot create a new proposal.',
		);
	}
	return { vote };
}
