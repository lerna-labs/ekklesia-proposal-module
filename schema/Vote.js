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
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "votes",
  }
);

const Vote = mongoose.model("Vote", voteSchema);
export { Vote };
