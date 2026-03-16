import { z } from "zod";
import costCategoriesList from "./costCategories.json";

/** Single link schema (for add-link dialog validation and supportingInfoLinks array). Title mandatory, 100 chars. */
export const supportingInfoLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  url: z.string().url("Enter a valid URL"),
});

/** Ordered list of category names (for z.enum and ordering). */
export const COST_CATEGORIES = costCategoriesList.map((c) => c.name);

/** Full list with name + description for selects and UI. */
export const COST_CATEGORIES_LIST = costCategoriesList;

/** Single budget row input schema (object only). Matches workPackages[].budgetBreakdown[]. */
export const budgetRowInputSchema = z.object({
  costCategory: z.enum(COST_CATEGORIES, {
    error: "Cost category is required",
  }),
  name: z
    .string()
    .min(1, "Item name is required")
    .max(100),
  description: z
    .string()
    .min(1, "Item description is required")
    .max(1000, "Item description must be at most 1000 characters"),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .refine((v) => v > 0, { message: "Quantity must be greater than 0" })
    .refine(
      (v) => v === Math.round(v * 100) / 100,
      { message: "Quantity must have at most 2 decimal places" },
    ),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit cost must be a number" })
    .min(0.001, "Unit cost in ADA is required and must be greater than 0"),
});

/** Single budget row schema (repeatable per work package); adds total via transform. */
export const budgetRowSchema = budgetRowInputSchema.transform((row) => ({
  ...row,
  total: Math.round(row.quantity * row.unitPrice * 1000) / 1000,
}));

/** Single milestone schema (repeatable per work package). */
export const milestoneSchema = z.object({
  name: z.string().min(1, "Milestone name is required").max(100),
  deliverables: z.string().min(1, "Deliverables are required").max(4000),
  acceptanceCriteria: z
    .string()
    .min(1, "Acceptance criteria are required")
    .max(4000),
  duration: z
    .coerce.number({
      error: (iss) =>
        iss.code === "invalid_type" || iss.code === "invalid_literal" || String(iss.code).includes("number")
          ? "Duration must be a number"
          : undefined,
    })
    .int("Duration must be a whole number of weeks")
    .min(1, "Duration must be at least 1 week")
    .max(240, "Duration must be at most 240 weeks"),
});
