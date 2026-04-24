/**
 * Replace (or create) the cardano-budget-2026 vote with date windows chosen for UI testing,
 * plus one draft and one live proposal owned by a fixed test stake.
 *
 * Usage (repo root):
 *   node __scripts/createVoteWindowFixtures.js --window=both-open
 *   node __scripts/createVoteWindowFixtures.js --window=draft-closed-live-open
 *
 * Options:
 *   --window=<scenario>   Required. See SCENARIOS below.
 *   --slug=<slug>          Vote slug (default: cardano-budget-2026).
 *   --proposer=<stake>     Proposer stake id (default: wf4m test key).
 *
 * Scenarios (relative to "now" when the script runs; all dates UTC-friendly instants):
 *   both-open                submissionEnd & reviewEnd after now → draft + live CTAs open.
 *   draft-closed-live-open   submission ended, review still open → draft/new blocked, live edit/withdraw OK.
 *   all-closed               review ended → draft + live editing/withdraw gated.
 *   before-submission        submissionStart in the future (draft still open until submissionEnd; live usually open if reviewEnd future).
 *
 * Note: /dashboard lists proposals for the first vote returned by GET /votes. If you do not see these
 * rows, use a DB with only this vote or adjust ordering.
 */

import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.development") });

import { loadEnvironmentVariables } from "../helper/envLoader.js";
import { connectToDatabase, disconnectFromDatabase } from "../helper/dbManager.js";
import { Vote } from "../schema/Vote.js";
import { Proposal } from "../schema/Proposal.js";
import { User } from "../schema/User.js";
import {
	draftSubmissionOpen,
	liveResubmitOpen,
} from "../__frontend/src/lib/voteWindowPolicy.js";

const DAY = 24 * 60 * 60 * 1000;

const DEFAULT_SLUG = "cardano-budget-2026";
const DEFAULT_PROPOSER =
	"stake_test1uz22g9jd408t8zq8g3dw8p60qla49qjgvhh7z74kjpvuyrctlwf4m";

const ADMINS = [
	"stake_test1uqwcrkr4chst8xnk5se4442fz5ku5ekql644zew5l5uwswgf643wf",
];

/** @type {Record<string, string>} */
const SCENARIOS = {
	"both-open":
		"Submission and review deadlines are in the future (draft + live proposal actions enabled).",
	"draft-closed-live-open":
		"Submission ended; review still open (UI: new draft / draft edit off; live re-submit + withdraw on).",
	"all-closed":
		"Review ended (UI: draft + live editing and live withdraw off).",
	"before-submission":
		"Submission period not started yet (submissionStart in the future; draft/new still allowed until submissionEnd).",
};

const LEGAL_DECLARATIONS = {
	authorizationEntity: true,
	authorizationAttestation: true,
	submitterName: "Fixture Submitter",
	submitterRole: "Lead",
	submitterEmail: "fixture@example.com",
};

/**
 * @param {string} pillarId
 * @param {string} proposerLabel
 */
function buildLiveBudget2026MetaData(pillarId, proposerLabel) {
	const wpTotal = 50_000;
	const workPackages = [
		{
			name: "WP1 – UI fixture",
			summary: "Single work package for local dashboard / vote window testing.",
			initiativeType: "New Initiative",
			proposalType: "Technical (software/IT)",
			supportingDocuments: [
				{ title: "Technical outline", url: "https://example.com/outline.pdf" },
			],
			coreObjectives: [
				"Deliver a testable fixture proposal for UI workflows.",
				"Report progress in line with milestones.",
			],
			expectedValue: "Faster manual verification of proposal CTAs and forms.",
			metric: "Milestones completed on schedule.",
			milestones: [
				{
					name: "Milestone 1 – Kickoff",
					deliverables: "Plan and scope documented.",
					acceptanceCriteria: "Stakeholder sign-off.",
					duration: 2,
				},
			],
			budgetBreakdown: [
				{
					costCategory: "Development",
					name: "Implementation",
					description: "Implementation labor for the fixture scope.",
					quantity: 1,
					unitPrice: wpTotal,
					total: wpTotal,
				},
			],
			noMilestonesBreakdown: false,
			milestoneAlternative: "",
		},
	];

	const meta = {
		treasuryDonationTxHash: `${"a".repeat(64)}`,
		treasuryDonationConfirmed: true,
		trackRecord: "Fixture track record text for validation and display.",
		estimatedDuration: 6,
		strategyFramework: {
			pillars: [pillarId],
			pillarRationale:
				"**Alignment**\n\nThis fixture aligns with the pillar selected for testing.",
			kpiAlignment:
				"KPIs: delivery milestones, transparency, quarterly reporting.",
		},
		proposalDetails: {
			conversionRate: 0.5,
			workPackages,
		},
		proposerDetails: {
			name: proposerLabel,
			email: "fixture-proposer@example.com",
			links: [{ title: "Project", url: "https://example.com" }],
		},
		supportingInfoLinks: [
			{ title: "Budget notes", url: "https://example.com/notes.pdf" },
		],
		treasuryRepayment: "No",
		treasuryRepaymentCircumstances: "",
		priorFunding: "None for this fixture.",
		administrator: "Other",
		intersectAdministratorFeeConsent: false,
		otherAdministrator: "",
		contractingParty: {
			legalEntityType: "company",
			legalEntityName: "Fixture Labs Ltd",
			legalEntityRegistrationNumber: "REG-FIX-1",
			legalEntityCountry: "DE",
			legalEntityAddressLine1: "1 Test Street",
			legalEntityAddressLine2: "",
			legalEntityAddressLine3: "",
			govtIssuedIdNumber: "",
			countryOfResidence: "",
			residentialAddressLine1: "",
			residentialAddressLine2: "",
			residentialAddressLine3: "",
		},
		primaryContact: { name: proposerLabel, email: "fixture-proposer@example.com" },
		signatoryContact: {
			title: "Director",
			name: proposerLabel,
			email: "fixture-sign@example.com",
			authorization: true,
		},
		kycInfo: { submitted: "Yes", email: "" },
		independentAudits: "Fixture audit placeholder.",
		legalDeclarations: LEGAL_DECLARATIONS,
	};

	const sumAda = workPackages.reduce((sum, wp) => {
		const rows = wp.budgetBreakdown || [];
		return sum + rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
	}, 0);
	meta.totalBudget = Math.round(sumAda);
	return meta;
}

function emptyDraftMetaData() {
	return {
		trackRecord: "",
		estimatedDuration: 1,
		strategyFramework: { pillars: [], pillarRationale: "", kpiAlignment: "" },
		proposalDetails: { conversionRate: 0, workPackages: [] },
		proposerDetails: { name: "", email: "", links: [] },
		supportingInfoLinks: [],
		treasuryRepayment: "",
		treasuryRepaymentCircumstances: "",
		priorFunding: "",
		administrator: "",
		intersectAdministratorFeeConsent: false,
		otherAdministrator: "",
		contractingParty: {
			legalEntityType: "",
			legalEntityName: "",
			legalEntityRegistrationNumber: "",
			legalEntityCountry: "",
			legalEntityAddressLine1: "",
			legalEntityAddressLine2: "",
			legalEntityAddressLine3: "",
			govtIssuedIdNumber: "",
			countryOfResidence: "",
			residentialAddressLine1: "",
			residentialAddressLine2: "",
			residentialAddressLine3: "",
		},
		primaryContact: { name: "", email: "" },
		signatoryContact: { title: "", name: "", email: "", authorization: false },
		kycInfo: { submitted: "", email: "" },
		independentAudits: "",
	};
}

/**
 * Ordered timeline: submission → feedback → review → voting (non-overlapping, increasing).
 * @param {object} p
 * @param {Date} p.submissionStart
 * @param {Date} p.submissionEnd
 * @param {Date} p.reviewEnd
 */
function buildOrderedVoteDates({ submissionStart, submissionEnd, reviewEnd }) {
	const feedbackStart = new Date(submissionEnd.getTime() + DAY);
	const feedbackEnd = new Date(feedbackStart.getTime() + 3 * DAY);
	let reviewStart = new Date(feedbackEnd.getTime() + DAY);
	if (reviewStart.getTime() >= reviewEnd.getTime()) {
		reviewStart = new Date(reviewEnd.getTime() - 2 * DAY);
	}
	if (
		!(
			submissionEnd.getTime() < feedbackStart.getTime() &&
			feedbackEnd.getTime() < reviewStart.getTime() &&
			reviewStart.getTime() < reviewEnd.getTime()
		)
	) {
		throw new Error(
			"Vote window fixtures: submissionEnd/feedback/reviewEnd could not be ordered. Widen the gap between submissionEnd and reviewEnd.",
		);
	}
	const votingStart = new Date(reviewEnd.getTime() + DAY);
	const votingEnd = new Date(votingStart.getTime() + 14 * DAY);
	return {
		submissionStart,
		submissionEnd,
		feedbackStart,
		feedbackEnd,
		reviewStart,
		reviewEnd,
		votingStart,
		votingEnd,
	};
}

/**
 * @param {string} scenario
 * @param {Date} now
 */
function timelineForScenario(scenario, now) {
	switch (scenario) {
		case "both-open": {
			const submissionStart = new Date(now.getTime() - 40 * DAY);
			const submissionEnd = new Date(now.getTime() + 30 * DAY);
			const reviewEnd = new Date(now.getTime() + 60 * DAY);
			return buildOrderedVoteDates({ submissionStart, submissionEnd, reviewEnd });
		}
		case "draft-closed-live-open": {
			const submissionStart = new Date(now.getTime() - 120 * DAY);
			const submissionEnd = new Date(now.getTime() - 2 * DAY);
			const reviewEnd = new Date(now.getTime() + 45 * DAY);
			return buildOrderedVoteDates({ submissionStart, submissionEnd, reviewEnd });
		}
		case "all-closed": {
			const submissionStart = new Date(now.getTime() - 200 * DAY);
			const submissionEnd = new Date(now.getTime() - 60 * DAY);
			const reviewEnd = new Date(now.getTime() - 2 * DAY);
			return buildOrderedVoteDates({ submissionStart, submissionEnd, reviewEnd });
		}
		case "before-submission": {
			const submissionStart = new Date(now.getTime() + 7 * DAY);
			const submissionEnd = new Date(now.getTime() + 37 * DAY);
			const reviewEnd = new Date(now.getTime() + 90 * DAY);
			return buildOrderedVoteDates({ submissionStart, submissionEnd, reviewEnd });
		}
		default:
			throw new Error(`Unknown scenario: ${scenario}`);
	}
}

function parseArgs(argv) {
	/** @type {{ window?: string, slug?: string, proposer?: string, help?: boolean }} */
	const out = {};
	for (const a of argv) {
		if (a === "--help" || a === "-h") out.help = true;
		else if (a.startsWith("--window=")) out.window = a.slice("--window=".length);
		else if (a.startsWith("--slug=")) out.slug = a.slice("--slug=".length);
		else if (a.startsWith("--proposer=")) out.proposer = a.slice("--proposer=".length);
	}
	return out;
}

function printHelp() {
	console.log(`createVoteWindowFixtures.js — seed cardano-budget-2026 + 1 draft + 1 live (same proposer)

Usage:
  node __scripts/createVoteWindowFixtures.js --window=<scenario> [--slug=...] [--proposer=...]

Scenarios:
${Object.entries(SCENARIOS)
	.map(([k, v]) => `  ${k}\n    ${v}`)
	.join("\n\n")}
`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printHelp();
		process.exit(0);
	}
	loadEnvironmentVariables(path.join(__dirname, ".."));
	const scenario = args.window;
	if (!scenario || !SCENARIOS[scenario]) {
		console.error("Missing or invalid --window. Use --help for scenarios.");
		process.exit(1);
	}
	const slug = args.slug || DEFAULT_SLUG;
	const proposerId = args.proposer || DEFAULT_PROPOSER;
	const now = new Date();
	const dates = timelineForScenario(scenario, now);

	try {
		await connectToDatabase();

		const existing = await Vote.findOne({ slug }).lean();
		if (existing?._id) {
			const del = await Proposal.deleteMany({ voteId: existing._id });
			console.log(`Removed ${del.deletedCount} proposal(s) for vote slug "${slug}".`);
			await Vote.deleteOne({ _id: existing._id });
			console.log(`Removed existing vote "${slug}".`);
		}

		const pillarId = new mongoose.Types.ObjectId().toString();
		const pillar = {
			_id: pillarId,
			title: "Fixture pillar",
			description: "Used by createVoteWindowFixtures",
			sortOrder: 1,
		};

		const vote = await Vote.create({
			title: "Cardano Budget Process 2026 (fixtures)",
			description: "Vote window fixture seed for UI testing.",
			slug,
			admins: ADMINS,
			submissionStartDate: dates.submissionStart,
			submissionEndDate: dates.submissionEnd,
			feedbackStartDate: dates.feedbackStart,
			feedbackEndDate: dates.feedbackEnd,
			reviewStartDate: dates.reviewStart,
			reviewEndDate: dates.reviewEnd,
			votingStartDate: dates.votingStart,
			votingEndDate: dates.votingEnd,
			validationScript: "budget2026/validationScript.js",
			excludeScript: "budget2026/excludeScript.js",
			form: "budget2026",
			depositOptions: {
				treasuryDonation: 1_000_000_000,
				depositAddress: "",
				depositAmount: 0,
			},
			sortOptions: [
				{ value: "updatedAt", label: "Last Updated", field: "updatedAt" },
				{ value: "submittedAt", label: "Submission Date", field: "submittedAt" },
				{ value: "title", label: "Proposal Title", field: "title" },
			],
			filterOptions: [
				{
					param: "status",
					label: "Status",
					field: "status",
					allowedValues: ["live", "withdrawn", "draft"],
					multiple: true,
				},
				{
					param: "category",
					label: "Category",
					field: "metaData.strategyFramework.pillars",
					allowedValues: [],
					multiple: true,
					optionsPath: "metaData.strategyFramework.pillars",
				},
			],
			searchOptions: [
				{ field: "title", matchType: "like", caseSensitive: false },
				{ field: "summary", matchType: "like", caseSensitive: false },
				{ field: "proposerId", matchType: "like", caseSensitive: false },
				{ field: "_id", matchType: "objectId" },
			],
			metaData: { strategyFramework: { pillars: [pillar] } },
		});

		await User.findOneAndUpdate(
			{ _id: proposerId },
			{
				$set: {
					name: "Fixture proposer (wf4m)",
					lastLogin: now,
					updatedAt: now,
				},
			},
			{ upsert: true },
		);

		const liveMeta = buildLiveBudget2026MetaData(pillarId, "Fixture proposer (wf4m)");

		const draft = await Proposal.create({
			proposerId,
			voteId: vote._id,
			title: "[Fixture] Window test draft",
			summary: "",
			status: "draft",
			metaData: emptyDraftMetaData(),
		});

		const live = await Proposal.create({
			proposerId,
			voteId: vote._id,
			title: "[Fixture] Window test live",
			summary:
				"**Fixture live proposal** for vote window UI testing.\n\nSame proposer as the draft row.",
			status: "live",
			submittedAt: new Date(now.getTime() - 3 * DAY),
			metaData: liveMeta,
		});

		const votePlain = vote.toObject();
		console.log("\n✅ Vote window fixtures created.\n");
		console.log(`  Scenario (--window): ${scenario}`);
		console.log(`  Vote slug: ${slug}  _id: ${vote._id}`);
		console.log(`  Proposer: ${proposerId}`);
		console.log(`  Draft proposal: ${draft._id}`);
		console.log(`  Live proposal:  ${live._id}`);
		console.log("\n  Key instants (ISO):");
		console.log(`    submissionStartDate: ${dates.submissionStart.toISOString()}`);
		console.log(`    submissionEndDate:   ${dates.submissionEnd.toISOString()}`);
		console.log(`    reviewEndDate:       ${dates.reviewEnd.toISOString()}`);
		console.log("\n  Expected UI policy at script time (same semantics as dashboard):");
		console.log(
			`    draftSubmissionOpen (new draft / draft edit): ${draftSubmissionOpen(votePlain)}`,
		);
		console.log(
			`    liveResubmitOpen (live edit / withdraw):       ${liveResubmitOpen(votePlain)}`,
		);
		console.log(
			"\n  Log in with the wf4m stake in __testkit and open /dashboard (see file header if proposals are missing).\n",
		);
	} catch (e) {
		console.error(e);
		process.exitCode = 1;
	} finally {
		await disconnectFromDatabase();
	}
}

main();
