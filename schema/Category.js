import mongoose from "mongoose";
const { Schema } = mongoose;

const categorySchema = new Schema(
    {
        budgetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Budget",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        metaData: {
            type: {
                pillar: String,
                pillarDescription: String,
                highLevelThematicArea: String,
                descriptionStrategy: String,
                expectedEnhancement: String,
                kpis: [String],
            },
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
categorySchema.index({ budgetId: 1 });
categorySchema.index({ title: 1 });

const Category = mongoose.model("Category", categorySchema);
export { Category };