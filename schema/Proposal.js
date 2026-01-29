import mongoose from "mongoose";
const { Schema } = mongoose;

const proposalSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
        },
        budgetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Budget",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        proposerName: {
            type: String,
            required: true,
        },
        affiliatedDReps: {
            type: [String],
            required: false,
        },
        mileStones: {
            type: [{
                title: String,
                description: String,
                dueDate: Date,
            }],
            required: false,
        },
        totalBudget: {
            type: Number,
            required: true,
        },
        conversionRate: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["draft", "live", "withdrawnByProposer", "withdrawnByAdmin"],
        },
        withdrawalReason: {
            type: {
                category: ["Inappropriate content", "Spam", "Policy violation", "Duplicate submission", "Other"],
                userId: mongoose.Schema.Types.ObjectId,
                comment: String,
                date: Date,
            },
            required: false,
        },
        submittedAt: {
            type: Date,
            required: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

proposalSchema.index({ userId: 1, proposalId: 1 });
proposalSchema.index({ budgetId: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ title: 1 })

// Pre-save middleware to update the updatedAt field
proposalSchema.pre("save", async function () {
    this.updatedAt = new Date();
});

const Proposal = mongoose.model("Proposal", proposalSchema);
export { Proposal };