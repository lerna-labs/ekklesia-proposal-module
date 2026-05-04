import { api } from '$stores/sessionManager.js';
import { draftSubmissionOpen } from '$lib/voteWindowPolicy.js';

const PROPOSAL_FETCH_LIMIT = 100;

/** @param {number} page @param {number} limit */
function emptyVotePagination(page, limit) {
	return {
		currentPage: page,
		totalPages: 1,
		totalItems: 0,
		itemsPerPage: limit,
	};
}

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, url, parent }) {
	const parentData = await parent();
	const user = parentData?.user;
	const userId = user?.userId;
	let notification = null;
	if (userId) {
		try {
			const notificationRes = await api.fetch(fetch, "/notifications");
			notification = await notificationRes.json();
		} catch (_err) {
			notification = null;
		}
	}
	const policyNowMs = Date.now();
	const now = new Date(policyNowMs);

	const votePage = Math.max(1, parseInt(url.searchParams.get('votePage') || '1', 10) || 1);
	const voteLimit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('voteLimit') || '50', 10) || 50));

	if (!userId) {
		return {
			user,
			notification,
			voteSections: [],
			votePagination: emptyVotePagination(1, voteLimit),
			votes: [],
			voteTitles: {},
			voteSlugs: {},
			policyNowMs,
		};
	}

	if (!String(userId).startsWith('stake')) {
		return {
			user,
			notification,
			voteSections: [],
			votePagination: emptyVotePagination(1, voteLimit),
			votes: [],
			voteTitles: {},
			voteSlugs: {},
			policyNowMs,
		};
	}

	const votesRes = await api.fetch(fetch, `/votes?page=${votePage}&limit=${voteLimit}`);
	const votesJson = await votesRes.json();
	const votes = votesJson.data ?? [];
	const meta = votesJson.meta ?? {};

	const votePagination = {
		currentPage: meta.page ?? votePage,
		totalPages: meta.totalPages ?? 1,
		totalItems: meta.total ?? 0,
		itemsPerPage: meta.limit ?? voteLimit,
	};

	const voteTitles = {};
	const voteSlugs = {};
	for (const v of votes) {
		if (v._id) {
			voteTitles[v._id] = v.title ?? v.name ?? v._id;
			if (v.slug) voteSlugs[v._id] = v.slug;
		}
	}

	if (votes.length === 0) {
		return {
			user,
			notification,
			voteSections: [],
			votePagination,
			votes: [],
			voteTitles,
			voteSlugs,
			policyNowMs,
		};
	}

	const sectionResults = await Promise.all(
		votes.map(async (vote, orderIndex) => {
			const proposalsUrl =
				`/proposals?vote=${encodeURIComponent(vote._id)}` +
				`&proposer=${encodeURIComponent(userId)}` +
				`&status=live,withdrawn,draft&page=1&limit=${PROPOSAL_FETCH_LIMIT}` +
				`&sort=updatedAt&direction=desc`;
			const proposalsResponse = await api.fetch(fetch, proposalsUrl);
			const json = await proposalsResponse.json();
			let proposals = json.data ?? [];
			proposals = proposals.filter((p) => String(p.proposerId ?? '') === String(userId));
			return { vote, proposals, orderIndex };
		}),
	);

	sectionResults.sort((a, b) => {
		const openA = draftSubmissionOpen(a.vote, now) ? 1 : 0;
		const openB = draftSubmissionOpen(b.vote, now) ? 1 : 0;
		if (openB !== openA) return openB - openA;
		return a.orderIndex - b.orderIndex;
	});

	const voteSections = sectionResults.map(({ vote, proposals }) => ({ vote, proposals }));

	return {
		user,
		notification,
		voteSections,
		votePagination,
		votes,
		voteTitles,
		voteSlugs,
		policyNowMs,
	};
}
