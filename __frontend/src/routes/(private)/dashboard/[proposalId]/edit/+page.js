import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params, parent }) {
	await parent();
	const { proposalId } = params;

	let proposalRes;
	try {
		proposalRes = await api.fetch(fetch, `/proposals/${proposalId}`);
	} catch (err) {
		// API returned 403 (not owner) or 404 (not found) – show a clear message
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

	const budgetId = proposal.budgetId;
	if (!budgetId) {
		error(404, 'Proposal has no budget');
	}

	const budgetRes = await api.fetch(fetch, `/budgets/${budgetId}`);
	if (!budgetRes.ok) {
		error(budgetRes.status, 'Budget not found');
	}
	const budget = await budgetRes.json();

	const catRes = await api.fetch(fetch, `/budgets/${budgetId}/categories`);
	if (!catRes.ok) {
		error(catRes.status, 'Failed to load categories');
	}
	const catJson = await catRes.json();
	const categories = catJson.data ?? [];

	return { proposal, budget, categories };
}
