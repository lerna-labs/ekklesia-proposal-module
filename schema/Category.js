import mongoose from "mongoose";
const { Schema } = mongoose;

const categorySchema = new Schema(
    {
        voteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vote",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        metaData: {
            type: Schema.Types.Mixed,
            default: () => ({}),
            required: false,
        },
        sortOrder: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes for faster queries
categorySchema.index({ voteId: 1 });
categorySchema.index({ title: 1 });

const Category = mongoose.model("Category", categorySchema);
export { Category };