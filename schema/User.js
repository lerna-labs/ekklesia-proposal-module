import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
    {
        _id: {
            type: String,
            immutable: true,
        },
        name: {
            type: String,
            required: false,
        },
        lastLogin: {
            type: Date,
            default: Date.now,
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
userSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

const User = mongoose.model("User", userSchema);
export { User };