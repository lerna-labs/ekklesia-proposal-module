import mongoose from "mongoose";
const { Schema } = mongoose;

const budgetSchema = new Schema(
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
            type: [String],
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

// Pre-save middleware to update the updatedAt field
budgetSchema.pre("save", async function () {
    this.updatedAt = new Date();
});

const Budget = mongoose.model("Budget", budgetSchema);
export { Budget };