import { redirect } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

const VALID_SORT = new Set(['title', 'status', 'date', 'amount', 'updatedAt']);
const VALID_DIRECTION = new Set(['asc', 'desc']);

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url, parent }) {
	const parentData = await parent();
	const user = parentData?.user;
	const userId = user?.userId;
	if (!userId) {
		return { user, proposals: { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } }, voteTitles: {}, voteSlugs: {}, votes: [] };
	}

	// URL params with defaults and validation
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10));
	const sort = VALID_SORT.has(url.searchParams.get('sort') || '') ? url.searchParams.get('sort') : 'updatedAt';
	const direction = VALID_DIRECTION.has(url.searchParams.get('direction') || '') ? url.searchParams.get('direction') : 'desc';

	const proposalsUrl = `/proposals?proposer=${encodeURIComponent(userId)}&status=live,withdrawn,draft&page=${pageNum}&limit=${limit}&sort=${sort}&direction=${direction}`;
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

	// If current page is empty but there are still proposals (e.g. after deletions), redirect to page 1
	const totalItems = proposals.pagination.totalItems ?? 0;
	const currentPage = proposals.pagination.currentPage ?? 1;
	if (proposals.data.length === 0 && totalItems > 0 && currentPage > 1) {
		const params = new URLSearchParams(url.searchParams);
		params.set('page', '1');
		throw redirect(302, `${url.pathname}?${params.toString()}`);
	}

	// Resolve vote titles and slugs for unique voteIds (parallel fetches)
	const voteIds = [...new Set((proposals.data || []).map((p) => p.voteId).filter(Boolean))];
	const votePromises = voteIds.map(async (voteId) => {
		try {
			const voteRes = await api.fetch(fetch, `/votes/${voteId}`);
			if (voteRes.ok) {
				const voteJson = await voteRes.json();
				return { voteId, title: voteJson.title ?? voteJson.name ?? voteId, slug: voteJson.slug };
			}
		} catch {
			// fallback to id as label
		}
		return { voteId, title: voteId, slug: undefined };
	});
	const voteResults = await Promise.all(votePromises);
	const voteTitles = {};
	const voteSlugs = {};
	for (const r of voteResults) {
		voteTitles[r.voteId] = r.title;
		if (r.slug) voteSlugs[r.voteId] = r.slug;
	}

	// Load all votes for "New proposal" links (each vote → /dashboard/[slug]/new)
	const votesRes = await api.fetch(fetch, '/votes?limit=50');
	const votesJson = await votesRes.json();
	const votes = votesJson.data ?? [];

	return {
		user,
		proposals,
		voteTitles,
		voteSlugs,
		votes,
	};
}
