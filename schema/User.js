import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
    {
        _id: {
            type: String,  // bech32 stake address or cip129 drep id
            immutable: true,
        },
        name: {
            type: String,  // drep name or handle
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

const User = mongoose.model("User", userSchema);
export { User };