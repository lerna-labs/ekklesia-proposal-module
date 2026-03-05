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
          enum: ["Inappropriate content", "Spam", "Policy violation", "Duplicate submission", "Other"],
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
    submittedAt: { type: Date, required: false },
    version: { type: Number, default: 1 },
  },
  { timestamps: true, versionKey: false }
);

proposalSchema.index({ proposerId: 1, voteId: 1 });
proposalSchema.index({ voteId: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ title: 1 });

proposalSchema.pre("save", function () {
  if (this.isNew) {
    this.version = 1;
  } else {
    this.version = (this.version ?? 0) + 1;
  }
});

const Proposal = mongoose.model("Proposal", proposalSchema);
export { Proposal };
