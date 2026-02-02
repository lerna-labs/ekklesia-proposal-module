import mongoose from "mongoose";
const { Schema } = mongoose;

const commentSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Proposer",
            required: true,
        },
        proposalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Proposal",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            required: false,
        },
        authorType: {
            type: String,
            required: true,
            enum: ["user", "proposer", "admin"],
        },
        status: {
            type: String,
            required: true,
            enum: ["draft", "live", "withdrawnByProposer", "withdrawnByAdmin"],
        },
        withdrawalReason: {
            type: {
                category: ["Inappropriate content", "Spam", "Policy violation", "Duplicate", "Other"],
                userId: mongoose.Schema.Types.ObjectId,
                comment: String,
                date: Date,
            },
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

// Indexes for faster queries
commentSchema.index({ userId: 1 });
commentSchema.index({ proposalId: 1 });

// Pre-save middleware to update the updatedAt field
commentSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

const Comment = mongoose.model("Comment", commentSchema);
export { Comment };