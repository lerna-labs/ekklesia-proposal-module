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
    /** Optional. URL to the Ekklesia Voting Platform for this Vote **/
    votingUrl: {
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
