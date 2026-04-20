/**
 * CC Vote 2026 proposal validation. Track required for live; title/summary optional until track forms define them.
 * Used when validationScript is "cc-vote2026/validationScript.js".
 */
import { z } from "zod";

const objectIdString = z
  .string()
  .length(24, "voteId must be a valid ObjectId")
  .regex(/^[a-fA-F0-9]{24}$/, "voteId must be a valid ObjectId");

const trackEnum = z.enum(["individual", "organisation", "consortium"]);

const liveProposalBodySchema = z
  .object({
    title: z.string().max(100).optional().default(""),
    summary: z.string().max(2000).optional().default(""),
    status: z.literal("live"),
    metaData: z.record(z.string(), z.unknown()).optional().default({}),
    voteId: objectIdString,
  })
  .superRefine((data, ctx) => {
    const md = data.metaData ?? {};
    const trackResult = trackEnum.safeParse(md.track);
    if (!trackResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metaData", "track"],
        message: "Select a proposal track (Individual, Organisation, or Consortium)",
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
