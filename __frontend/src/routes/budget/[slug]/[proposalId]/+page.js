import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
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

	return {
		budget,
		proposal,
		slug,
		proposalId,
	};
}
