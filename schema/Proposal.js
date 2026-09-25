import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * Proposal schema. Operational fields at root; variable payload in metaData (Mixed).
 * Structure inside metaData is defined and validated by the vote's validationScript, not by Mongoose.
 */
const proposalSchema = new Schema(
  {
    proposerId: {
      type: String,
      ref: "User",
      required: true,
    },
    voteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vote",
      required: true,
    },
    title: { type: String, required: false },
    summary: { type: String, required: false },
    /** Variable payload (trackRecord, proposalDetails, legalDeclarations, etc.). Shape validated by vote validationScript on submit. */
    metaData: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "live", "withdrawnByProposer", "withdrawnByAdmin", "archived"],
    },
    withdrawalDetails: {
      type: {
        category: {
          type: String,
          enum: [
            "Inappropriate content",
            "Spam",
            "Policy violation",
            "Duplicate submission",
            "Other",
          ],
        },
        userId: String,
        comment: String,
        date: Date,
      },
      required: false,
    },
    versions: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, required: true },
        createdAt: { type: Date, required: true },
      },
    ],
    /** When status is "archived", the id of the live proposal this version was superseded by. */
    currentProposalId: { type: mongoose.Schema.Types.ObjectId, required: false },
    submittedAt: { type: Date, required: false },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, versionKey: false },
);

// List by proposer (dashboard "my proposals")
proposalSchema.index({ proposerId: 1, voteId: 1 });
// List by vote (required param); compound indexes below cover voteId + status + sort to avoid in-memory sort
proposalSchema.index({ voteId: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ title: 1 });

// Compound indexes for GET /proposals list: voteId + status (usually "live") + sort field
// Default list: vote + live, sort submittedAt desc (newest first)
proposalSchema.index({ voteId: 1, status: 1, submittedAt: -1 });
// Sort by title (asc/desc)
proposalSchema.index({ voteId: 1, status: 1, title: 1 });
// Sort by updatedAt (timestamps)
proposalSchema.index({ voteId: 1, status: 1, updatedAt: -1 });

// #418: one non-empty treasury donation hash may back at most one non-draft,
// non-archived proposal globally (any vote). Drafts may share a hash (#415);
// archived version snapshots keep the same hash beside the live doc.
proposalSchema.index(
  { "metaData.treasuryDonationTxHash": 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $nin: ["draft", "archived"] },
      "metaData.treasuryDonationTxHash": { $type: "string", $ne: "" },
    },
  },
);

const Proposal = mongoose.model("Proposal", proposalSchema);
export { Proposal };
