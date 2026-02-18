import { api } from '$stores/sessionManager.js';

const VALID_SORT = new Set(['title', 'status', 'date', 'amount']);
const VALID_DIRECTION = new Set(['asc', 'desc']);

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url, parent }) {
	const parentData = await parent();
	const user = parentData?.user;
	const userId = user?.userId;
	if (!userId) {
		return { user, proposals: { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } }, budgetTitles: {}, budgetSlugs: {} };
	}

	// URL params with defaults and validation
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10));
	const sort = VALID_SORT.has(url.searchParams.get('sort') || '') ? url.searchParams.get('sort') : 'date';
	const direction = VALID_DIRECTION.has(url.searchParams.get('direction') || '') ? url.searchParams.get('direction') : 'desc';

	const proposalsUrl = `/proposals?proposer=${encodeURIComponent(userId)}&page=${pageNum}&limit=${limit}&sort=${sort}&direction=${direction}`;
	const proposalsResponse = await api.fetch(fetch, proposalsUrl);
	const json = await proposalsResponse.json();
	const meta = json.meta ?? {};
	const proposals = {
		data: json.data ?? [],
		pagination: {
			currentPage: meta.page ?? 1,
			totalPages: meta.totalPages ?? 1,
			totalItems: meta.total ?? 0,
			itemsPerPage: meta.limit ?? 10,
		},
	};

	// Resolve budget titles and slugs for unique budgetIds (parallel fetches)
	const budgetIds = [...new Set((proposals.data || []).map((p) => p.budgetId).filter(Boolean))];
	const budgetPromises = budgetIds.map(async (budgetId) => {
		try {
			const budgetRes = await api.fetch(fetch, `/budgets/${budgetId}`);
			if (budgetRes.ok) {
				const budgetJson = await budgetRes.json();
				return { budgetId, title: budgetJson.title ?? budgetJson.name ?? budgetId, slug: budgetJson.slug };
			}
		} catch {
			// fallback to id as label
		}
		return { budgetId, title: budgetId, slug: undefined };
	});
	const budgetResults = await Promise.all(budgetPromises);
	const budgetTitles = {};
	const budgetSlugs = {};
	for (const r of budgetResults) {
		budgetTitles[r.budgetId] = r.title;
		if (r.slug) budgetSlugs[r.budgetId] = r.slug;
	}

	return {
		user,
		proposals,
		budgetTitles,
		budgetSlugs,
	};
}
