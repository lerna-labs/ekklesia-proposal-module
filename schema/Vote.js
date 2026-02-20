import mongoose from "mongoose";
const { Schema } = mongoose;

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
    /** Optional. Name of the validation script for this vote (e.g. "validationBudget2026"). When set, POST/PUT proposals use that script; when missing, use default validateCreateProposalBody. */
    validationScript: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "votes",
  }
);

const Vote = mongoose.model("Vote", voteSchema);
export { Vote };
