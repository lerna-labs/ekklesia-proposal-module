import mongoose from "mongoose";
const { Schema } = mongoose;

const countrySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 2,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

countrySchema.index({ code: 1 }, { unique: true });
countrySchema.index({ name: 1 });

const Country = mongoose.model("Country", countrySchema);
export { Country };
