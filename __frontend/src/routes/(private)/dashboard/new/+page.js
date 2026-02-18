import { api } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url, parent }) {
	await parent();
	const budgetId = url.searchParams.get('budget');
	let budget = null;
	let categories = [];

	const budgetsRes = await api.fetch(fetch, '/budgets?limit=50');
	const budgetsJson = await budgetsRes.json();
	const budgets = budgetsJson.data ?? [];

	if (budgetId) {
		try {
			const budgetRes = await api.fetch(fetch, `/budgets/${budgetId}`);
			if (budgetRes.ok) {
				budget = await budgetRes.json();
				const catRes = await api.fetch(fetch, `/budgets/${budgetId}/categories`);
				if (catRes.ok) {
					const catJson = await catRes.json();
					categories = catJson.data ?? [];
				}
			}
		} catch {
			// leave budget/categories empty
		}
	}

	return { budgets, budget, categories };
}
