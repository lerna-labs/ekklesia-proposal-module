import mongoose from "mongoose";
const { Schema } = mongoose;

const sortOptionSchema = new Schema(
  {
    value: { type: String, required: true },
    label: { type: String, required: true },
    field: { type: String, required: true },
  },
  { _id: false }
);

const filterOptionSchema = new Schema(
  {
    param: { type: String, required: true },
    label: { type: String, required: true },
    field: { type: String, required: true },
    /** Required for enum-style filters (e.g. status). When optionsPath is set, can be empty. */
    allowedValues: { type: [String], required: false, default: () => [] },
    multiple: { type: Boolean, required: true },
    /** Optional. Dot-path into the vote document for the option list (e.g. "metaData.strategyFramework.pillars"). When set, frontend and API use this instead of allowedValues for the option list. */
    optionsPath: { type: String, required: false },
    /** When optionsPath is set: property on each item used as the param value (default "_id"). */
    optionValueKey: { type: String, required: false, default: "_id" },
    /** When optionsPath is set: property on each item used as the display label (default "title"). */
    optionLabelKey: { type: String, required: false, default: "title" },
  },
  { _id: false }
);

const searchOptionSchema = new Schema(
  {
    field: { type: String, required: true },
    matchType: { type: String, required: true, enum: ["like", "exact", "objectId"] },
    caseSensitive: { type: Boolean, required: false, default: false },
  },
  { _id: false }
);

const voteSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    admins: {
      type: [String], // bech32 stake addresses
      required: true,
    },
    submissionStartDate: {
      type: Date,
      required: true,
    },
    submissionEndDate: {
      type: Date,
      required: true,
    },
    feedbackStartDate: {
      type: Date,
      required: true,
    },
    feedbackEndDate: {
      type: Date,
      required: true,
    },
    reviewStartDate: {
      type: Date,
      required: true,
    },
    reviewEndDate: {
      type: Date,
      required: true,
    },
    votingStartDate: {
      type: Date,
      required: true,
    },
    votingEndDate: {
      type: Date,
      required: true,
    },
    /** Path inside the validation folder to the script (e.g. "budget2026/validationScript.js"). POST/PUT proposals always use this script. */
    validationScript: {
      type: String,
      required: true,
    },
    /** Optional Script to exclude fields from the public API */
    excludeScript: {
      type: String,
      required: false,
    },
    /** Optional script to shape proposal list item payloads per vote form. */
    listProjectionScript: {
      type: String,
      required: false,
    },
    /** Optional. URL to the Ekklesia Voting Platform for this Vote **/
    votingUrl: {
      type: String,
      required: false,
    },
    /** Optional. External results page for the vote (used in results notifications). */
    resultsUrl: {
      type: String,
      required: false,
    },
    /** Optional. Set manually when results are officially published. */
    resultsPublishedAt: {
      type: Date,
      required: false,
      default: null,
    },
    notificationDispatch: {
      votingOpenedSentAt: {
        type: Date,
        default: null,
      },
      resultsPublishedSentAt: {
        type: Date,
        default: null,
      },
    },
    /* donationOptions to track treasury donation and mandatory wallet deposits */
    depositOptions: {
      treasuryDonation: {
        type: Number, // mint donation amount in lovelace
        required: true,
      },
      depositAddress: {
        type: String, // bech32 address or empty string for no deposit
        required: false,
      },
      depositAmount: {
        type: Number, // min deposit amount in lovelace or zero for no deposit needed
        required: true,
      },
    },
    /** Folder name of the proposal form components (e.g. "default", "budget2026"). Used by the frontend to load the correct form. */
    form: {
      type: String,
      required: true,
    },
    commentsEnabled: {
      type: Boolean,
      required: true,
      default: true,
    },
    /** Optional. When absent or empty, the default array below is used. */
    sortOptions: {
      type: [sortOptionSchema],
      required: false,
      default: () => [
        { value: "title", label: "Proposal Title", field: "title" },
        { value: "commentCount", label: "Comment Count", field: "commentCount" },
        { value: "submittedAt", label: "Submission Date", field: "submittedAt" },
        { value: "updatedAt", label: "Last Updated", field: "updatedAt" },
      ],
    },
    /** Optional. Vote-specific payload (e.g. strategyFramework.pillars for budget2026). Same path as on proposals. */
    metaData: {
      type: Schema.Types.Mixed,
      required: false,
    },
    /** Optional. Filters shown in SearchFilter on the proposals page. When absent or empty, the default below is used. */
    filterOptions: {
      type: [filterOptionSchema],
      required: false,
      default: () => [
        {
          param: "status",
          label: "Status",
          field: "status",
          allowedValues: ["live", "withdrawn", "draft"],
          multiple: true,
        },
      ],
    },
    /** Optional. Fields and match types for free-text search on proposals. When absent or empty, the default below is used. */
    searchOptions: {
      type: [searchOptionSchema],
      required: false,
      default: () => [
        { field: "title", matchType: "like", caseSensitive: false },
        { field: "summary", matchType: "like", caseSensitive: false },
        { field: "proposerId", matchType: "like", caseSensitive: false },
        { field: "_id", matchType: "objectId" },
      ],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "votes",
  }
);

/** Lookup key for GET /votes/:slug and frontend routes; must be unique. */
voteSchema.index({ slug: 1 }, { unique: true });

const Vote = mongoose.model("Vote", voteSchema);
export { Vote };
