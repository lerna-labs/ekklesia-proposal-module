import mongoose from "mongoose";
const { Schema } = mongoose;

const categorySchema = new Schema(
    {
        budgetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Budget",
            required: false,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        pillar: { type: String },
        pillarDescription: { type: String },
        highLevelThematicArea: { type: String },
        descriptionStrategy: { type: String },
        expectedEnhancement: { type: String },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes for faster queries
categorySchema.index({ budgetId: 1 });
categorySchema.index({ title: 1 });

const Category = mongoose.model("Category", categorySchema);
export { Category };