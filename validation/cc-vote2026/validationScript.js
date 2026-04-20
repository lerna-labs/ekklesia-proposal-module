/**
 * CC Vote 2026 proposal validation. Minimal body shape: title, summary, metaData (treasury fields on live).
 * Used when validationScript is "cc-vote2026/validationScript.js".
 */
import { z } from "zod";

const objectIdString = z
  .string()
  .length(24, "voteId must be a valid ObjectId")
  .regex(/^[a-fA-F0-9]{24}$/, "voteId must be a valid ObjectId");

const liveProposalBodySchema = z
  .object({
    title: z.string().min(1, "Proposal Title is required").max(100),
    summary: z.string().min(1, "Summary is required").max(2000),
    status: z.literal("live"),
    metaData: z.record(z.string(), z.unknown()).optional().default({}),
    voteId: objectIdString,
  })
  .superRefine((data, ctx) => {
    const md = data.metaData ?? {};
    const txHash = (md.treasuryDonationTxHash ?? "").toString().trim();
    if (!txHash) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metaData", "treasuryDonationTxHash"],
        message: "Treasury donation verification hash is required to submit",
      });
    }
    if (md.treasuryDonationConfirmed !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metaData", "treasuryDonationConfirmed"],
        message: "You must confirm the treasury donation to submit",
      });
    }
  });

const draftProposalBodySchema = z.object({
  title: z.string().max(100).optional().default(""),
  voteId: objectIdString,
  status: z.enum(["draft"]).optional().default("draft"),
  summary: z.string().max(2000).optional().default(""),
  metaData: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * @param {unknown} body - Raw request body
 * @returns {{ success: true, data } | { success: false, error: z.ZodError }}
 */
export function validate(body) {
  if (body?.status === "live") {
    const result = liveProposalBodySchema.safeParse(body);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error };
  }
  const result = draftProposalBodySchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}
