import { error } from '@sveltejs/kit';
export async function load({ params, fetch }) {
	const { slug, proposalId } = params;

	const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';

	const budgetResponse = await fetch(`${apiUrl}/budgets/${slug}`);
	if (!budgetResponse.ok) {
		error(budgetResponse.status, `Failed to load budget: ${budgetResponse.statusText}`);
	}
	const budget = await budgetResponse.json();

	const proposalResponse = await fetch(`${apiUrl}/proposals/${proposalId}`);
	if (!proposalResponse.ok) {
		error(proposalResponse.status, `Failed to load proposal: ${proposalResponse.statusText}`);
	}
	const proposal = await proposalResponse.json();

	// API spec §3.6: GET /comments?proposal={proposalId} — returns { data, meta }
	const commentsResponse = await fetch(`${apiUrl}/comments?proposal=${proposalId}`);
	if (!commentsResponse.ok) {
		error(commentsResponse.status, `Failed to load comments: ${commentsResponse.statusText}`);
	}
	const commentsJson = await commentsResponse.json();
	const comments = commentsJson.data ?? [];

	return {
		budget,
		proposal,
		slug,
		proposalId,
		comments,
	};
}
