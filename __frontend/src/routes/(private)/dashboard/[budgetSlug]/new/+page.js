import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params, parent }) {
	await parent();
	const { budgetSlug } = params;

	const votesRes = await api.fetch(fetch, `/votes?slug=${encodeURIComponent(budgetSlug)}&limit=1`);
	const votesJson = await votesRes.json();
	const votes = votesJson.data ?? [];

	if (!votes.length) {
		error(404, 'Vote not found');
	}

	const vote = votes[0];
	let categories = [];

	try {
		const catRes = await api.fetch(fetch, `/votes/${vote._id}/categories`);
		if (catRes.ok) {
			const catJson = await catRes.json();
			categories = catJson.data ?? [];
		}
	} catch {
		// leave categories empty
	}

	return { vote, categories };
}
