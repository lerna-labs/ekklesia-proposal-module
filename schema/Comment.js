import mongoose from "mongoose";
const { Schema } = mongoose;

const commentSchema = new Schema(
    {
        proposalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Proposal",
            required: true,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            required: false,
        },
        userId: {
            type: String,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["live", "withdrawnByAdmin"],
        },
        withdrawalDetails: {
            type: {
                category: ["Inappropriate content", "Spam", "Policy violation", "Duplicate", "Other"],
                userId: String,
                comment: String,
                date: Date,
            },
            required: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes for faster queries
commentSchema.index({ parentId: 1 });
commentSchema.index({ proposalId: 1 });

const Comment = mongoose.model("Comment", commentSchema);
export { Comment };