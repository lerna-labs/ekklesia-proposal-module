import mongoose from "mongoose";

const { Schema } = mongoose;

const commentNotificationEventSchema = new Schema(
  {
    recipientUserId: { type: String, required: true, index: true },
    proposalId: { type: Schema.Types.ObjectId, required: true, index: true },
    commentId: { type: Schema.Types.ObjectId, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "sent"],
      default: "pending",
      index: true,
    },
    sentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "commentNotificationEvents",
  },
);

commentNotificationEventSchema.index({ recipientUserId: 1, status: 1, createdAt: 1 });

const CommentNotificationEvent =
  mongoose.models.CommentNotificationEvent ||
  mongoose.model("CommentNotificationEvent", commentNotificationEventSchema);

export { CommentNotificationEvent };
