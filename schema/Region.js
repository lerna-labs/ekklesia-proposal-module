import mongoose from "mongoose";
const { Schema } = mongoose;

const regionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

regionSchema.index({ name: 1 }, { unique: true });

const Region = mongoose.model("Region", regionSchema);
export { Region };
