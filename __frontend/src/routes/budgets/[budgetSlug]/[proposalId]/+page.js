import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

export async function load({ params, fetch }) {
	const { budgetSlug, proposalId } = params;

	const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';

	// Fetch budget by slug
	const budgetResponse = await fetch(`${apiUrl}/budgets/?slug=${budgetSlug}`);
	if (!budgetResponse.ok) {
		error(budgetResponse.status, `Failed to load budget: ${budgetResponse.statusText}`);
	}
	const budgetResponseJson = await budgetResponse.json();
	let budgetData = budgetResponseJson.data[0];
	if (!budgetData) {
		error(404, `Budget not found`);
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

	// API spec §3.6: GET /comments?proposal={proposalId} — returns { data, meta }
	// const commentsResponse = await fetch(`${apiUrl}/comments?proposal=${proposalId}`);
	// if (!commentsResponse.ok) {
	// 	error(commentsResponse.status, `Failed to load comments: ${commentsResponse.statusText}`);
	// }
	// const commentsJson = await commentsResponse.json();
	// const comments = commentsJson.data ?? [];

	return {
		budget: budgetData,
		proposal: proposalData,
		// comments,
	};
}
