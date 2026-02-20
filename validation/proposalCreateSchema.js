/**
 * Proposal create (POST) body validation.
 * Delegates to the vote-specific validation script. Default script is validationBudget2026.
 * Routes that have not yet been updated to use the vote's validationScript can keep
 * importing validateCreateProposalBody and the schemas from here.
 */
import {
  validate as validateBudget2026,
  createProposalBodySchema,
  createDraftProposalBodySchema,
} from "./budget2026/validationBudget2026.js";

export { createProposalBodySchema, createDraftProposalBodySchema };

/**
 * Validate POST body. For status "live" uses full schema; otherwise draft schema (title + voteId only).
 * @param {unknown} body - Raw request body
 * @returns {{ success: true, data } | { success: false, error: z.ZodError }}
 */
export function validateCreateProposalBody(body) {
  return validateBudget2026(body);
}
