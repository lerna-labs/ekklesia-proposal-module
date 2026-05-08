import mongoose from "mongoose";

const { Schema } = mongoose;

const ledgerTtlSecondsRaw = Number.parseInt(
  process.env.NOTIFICATION_VERIFY_LEDGER_TTL_SECONDS ?? "",
  10,
);
const LEDGER_TTL_SECONDS =
  Number.isFinite(ledgerTtlSecondsRaw) && ledgerTtlSecondsRaw > 0
    ? ledgerTtlSecondsRaw
    : 7 * 24 * 60 * 60;

const emailSendLedgerSchema = new Schema(
  {
    recipientHash: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

emailSendLedgerSchema.index({ recipientHash: 1, category: 1, sentAt: -1 });
emailSendLedgerSchema.index({ sentAt: 1 }, { expireAfterSeconds: LEDGER_TTL_SECONDS });

const EmailSendLedger =
  mongoose.models.EmailSendLedger ||
  mongoose.model("EmailSendLedger", emailSendLedgerSchema);

export { EmailSendLedger };
