import { redirect, error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url, parent }) {
	await parent();
	let voteId = url.searchParams.get('vote');
	let vote = null;
	let categories = [];

	const votesRes = await api.fetch(fetch, '/votes?limit=50');
	const votesJson = await votesRes.json();
	const votes = votesJson.data ?? [];

	if (!voteId) {
		if (votes.length === 1) {
			throw redirect(302, `/dashboard/new?vote=${votes[0]._id}`);
		}
		throw error(400, 'Vote is required. Use the URL parameter ?vote=<voteId>.');
	}

	if (voteId) {
		try {
			const voteRes = await api.fetch(fetch, `/votes/${voteId}`);
			if (voteRes.ok) {
				vote = await voteRes.json();
				const catRes = await api.fetch(fetch, `/votes/${voteId}/categories`);
				if (catRes.ok) {
					const catJson = await catRes.json();
					categories = catJson.data ?? [];
				}
			}
		} catch {
			// leave vote/categories empty
		}
	}

	return { votes, vote, categories };
}
