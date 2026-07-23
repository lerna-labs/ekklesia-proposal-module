import { error } from '@sveltejs/kit';
import { api } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params, url, fetch }) {
	const policyNowMs = Date.now();
	const { voteSlug } = params;
	const pageNum = url.searchParams.get('page') || '1';
	const limitParam = url.searchParams.get('limit') || '10';
	const validLimits = [10, 25, 50, 100];
	const limit = validLimits.includes(Number(limitParam)) ? limitParam : '10';
	const search = url.searchParams.get('search') || '';
	const direction = url.searchParams.get('direction') || 'desc';
	const status = url.searchParams.get('status') || 'live';
	const proposer = url.searchParams.get('proposer') || '';

	const fetchVote = await api.fetch(fetch, `/votes/?slug=${encodeURIComponent(voteSlug)}`);
	const voteResponse = await fetchVote.json();
	let voteData = voteResponse.data[0];
	if (!voteData) {
		error(404, `Vote not found`);
	}

	const DEFAULT_SORT = 'submittedAt';
	const sortOptions = voteData.sortOptions ?? [];
	const validSortValues = new Set(sortOptions.map((o) => o.value));
	const urlSort = url.searchParams.get('sort');
	const sort = urlSort && validSortValues.has(urlSort) ? urlSort : DEFAULT_SORT;

	const proposalsSearchParams = new URLSearchParams({
		vote: voteData._id,
		page: pageNum,
		limit,
		sort,
		direction,
	});
	const filterOptions = voteData.filterOptions ?? [];
	for (const option of filterOptions) {
		if (option?.param === 'status') continue;
		const value = url.searchParams.get(option?.param ?? '');
		if (option?.param && value) {
			proposalsSearchParams.set(option.param, value);
		}
	}
	if (search) proposalsSearchParams.set('search', search);
	if (status) proposalsSearchParams.set('status', status);
	if (proposer) proposalsSearchParams.set('proposer', proposer);

	let proposals = { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } };
	try {
		const proposalsResponse = await api.fetch(fetch, `/proposals?${proposalsSearchParams.toString()}`);
		const json = await proposalsResponse.json();
		const meta = json.meta ?? {};
		proposals = {
			data: json.data ?? [],
			pagination: {
				currentPage: meta.page ?? 1,
				totalPages: meta.totalPages ?? 1,
				totalItems: meta.total ?? 0,
				itemsPerPage: meta.limit ?? 10,
			},
		};
	} catch (err) {
		// Keep page usable if proposal list fails (except session expiry which api.fetch already handled)
		if (err?.status === 401) throw err;
	}

	const pillars = voteData.metaData?.strategyFramework?.pillars ?? [];

	return {
		vote: voteData,
		proposals,
		pillars,
		/** Resolved list state from URL for initial UI (sort, direction). */
		listState: { sort, direction },
		policyNowMs,
	};
}
