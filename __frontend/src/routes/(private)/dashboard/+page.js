import { redirect } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

const VALID_DIRECTION = new Set(['asc', 'desc']);

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url, parent }) {
	const parentData = await parent();
	const user = parentData?.user;
	const userId = user?.userId;
	if (!userId) {
		return { user, proposals: { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } }, voteTitles: {}, voteSlugs: {}, votes: [] };
	}

	// Load votes first (required for vote-scoped proposals)
	const votesRes = await api.fetch(fetch, '/votes?limit=50');
	const votesJson = await votesRes.json();
	const votes = votesJson.data ?? [];

	if (votes.length === 0) {
		return {
			user,
			proposals: { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } },
			voteTitles: {},
			voteSlugs: {},
			votes: [],
		};
	}

	// Use first vote as scope for "my proposals"
	const selectedVote = votes[0];
	const sortOptions = selectedVote.sortOptions ?? [];
	const validSortValues = new Set(sortOptions.map((o) => o.value));
	const defaultSort = sortOptions[0]?.value ?? 'title';

	// URL params with defaults and validation
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10) || 10));
	const urlSort = url.searchParams.get('sort') || defaultSort;
	const sort = validSortValues.has(urlSort) ? urlSort : defaultSort;
	const direction = VALID_DIRECTION.has(url.searchParams.get('direction') || '') ? url.searchParams.get('direction') : 'desc';

	const proposalsUrl = `/proposals?vote=${encodeURIComponent(selectedVote._id)}&proposer=${encodeURIComponent(userId)}&status=live,withdrawn,draft&page=${pageNum}&limit=${limit}&sort=${sort}&direction=${direction}`;
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

	// Build vote titles and slugs from the votes we already have
	const voteTitles = {};
	const voteSlugs = {};
	for (const v of votes) {
		if (v._id) {
			voteTitles[v._id] = v.title ?? v.name ?? v._id;
			if (v.slug) voteSlugs[v._id] = v.slug;
		}
	}

	return {
		user,
		proposals,
		voteTitles,
		voteSlugs,
		votes,
	};
}
