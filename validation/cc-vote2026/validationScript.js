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

/**
 * @param {{ existingProposal?: { status?: string, metaData?: Record<string, unknown> } }} [context]
 */
function liveProposalBodySchemaForContext(context = {}) {
  return z
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
        return;
      }
      const existing = context?.existingProposal;
      if (existing?.status === "live") {
        const storedTrack = existing.metaData?.track;
        const storedParsed = trackEnum.safeParse(storedTrack);
        if (storedParsed.success) {
          if (trackResult.data !== storedParsed.data) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["metaData", "track"],
              message: "Proposal track cannot be changed after submission.",
            });
          }
        } else if (String(storedTrack ?? "") !== String(trackResult.data)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["metaData", "track"],
            message: "Proposal track cannot be changed after submission.",
          });
        }
      }
    });
}

const draftProposalBodySchema = z.object({
  title: z.string().max(100).optional().default(""),
  voteId: objectIdString,
  status: z.enum(["draft"]).optional().default("draft"),
  summary: z.string().max(2000).optional().default(""),
  metaData: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * @param {unknown} body - Raw request body
 * @param {{ existingProposal?: { status?: string, metaData?: Record<string, unknown> } }} [context] - On PUT, include stored proposal snapshot so live→live updates can lock metaData.track
 * @returns {{ success: true, data } | { success: false, error: z.ZodError }}
 */
export function validate(body, context = {}) {
  if (body?.status === "live") {
    const result = liveProposalBodySchemaForContext(context).safeParse(body);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error };
  }
  const result = draftProposalBodySchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error };
}
