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

    },
    {
        timestamps: true,
        versionKey: false,
    }
);


const Budget = mongoose.model("Budget", budgetSchema);
export { Budget };