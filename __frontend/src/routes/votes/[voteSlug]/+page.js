import { error } from '@sveltejs/kit';
import { getJWT } from '$stores/sessionManager.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params, url, fetch }) {
	const { voteSlug } = params;
	const pageNum = url.searchParams.get('page') || '1';
	const search = url.searchParams.get('search') || '';
	const direction = url.searchParams.get('direction') || 'asc';
	const category = url.searchParams.get('category') || '';
	const status = url.searchParams.get('status') || 'live';
	const proposer = url.searchParams.get('proposer') || '';

	const apiUrl = import.meta.env.VITE_API_URL || '/api/v0';

	const fetchVote = await fetch(`${apiUrl}/votes/?slug=${voteSlug}`);

	if (!fetchVote.ok) {
		error(fetchVote.status, `Failed to load vote: ${fetchVote.statusText}`);
	}

	const voteResponse = await fetchVote.json();
	let voteData = voteResponse.data[0];
	if (!voteData) {
		error(404, `Vote not found`);
	}

	const sortOptions = voteData.sortOptions ?? [];
	const validSortValues = new Set(sortOptions.map((o) => o.value));
	const defaultSort = sortOptions[0]?.value ?? 'title';
	const urlSort = url.searchParams.get('sort') || defaultSort;
	const sort = validSortValues.has(urlSort) ? urlSort : defaultSort;

	const proposalsSearchParams = new URLSearchParams({
		vote: voteData._id,
		page: pageNum,
		limit: '10',
		sort,
		direction,
	});
	if (search) proposalsSearchParams.set('search', search);
	if (category) proposalsSearchParams.set('category', category);
	if (status) proposalsSearchParams.set('status', status);
	if (proposer) proposalsSearchParams.set('proposer', proposer);
	const proposalsUrl = `${apiUrl}/proposals?${proposalsSearchParams.toString()}`;
	const token = getJWT();
	const proposalsOpts = { credentials: 'include' };
	if (token) proposalsOpts.headers = { Authorization: `Bearer ${token}` };
	const proposalsResponse = await fetch(proposalsUrl, proposalsOpts);

	let proposals = { data: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } };
	if (proposalsResponse.ok) {
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
	}

	const pillars = voteData.metaData?.strategyFramework?.pillars ?? [];

	return {
		vote: voteData,
		proposals,
		pillars,
	};
}
