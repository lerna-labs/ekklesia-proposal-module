import mongoose from "mongoose";
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    _id: {
      type: String, // bech32 stake address or cip129 drep id
      immutable: true,
    },
    name: {
      type: String, // drep name or handle
      required: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    sessionVersion: {
      type: Number,
      default: 0,
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
    notification: {
      email: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
      },
      pendingEmail: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
      },
      schedule: {
        type: String,
        enum: ["never", "6h", "daily"],
        default: "daily",
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
      verificationIssuedAt: {
        type: Date,
        default: null,
      },
      locale: {
        type: String,
        default: "en",
      },
      unsubscribeSecret: {
        type: String,
        default: null,
      },
      lastCommentDigestSentAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const User = mongoose.model("User", userSchema);
export { User };
