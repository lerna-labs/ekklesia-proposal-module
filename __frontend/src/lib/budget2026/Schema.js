import { z } from "zod";

export const formSchema = z.object({
  title: z.string().min(2).max(255).meta({
    label: "Proposal Title",
    description: "The official name of your project as it will appear in governance voting.",
    placeholder: "Enter Title Here",
    required: true,
  }),
  summary: z.string().min(2).max(2000).meta({
    label: "Proposal Summary",
    description: "A high-level overview of the problem, solution, and impact. This is the first thing voters read.",
    placeholder: "Enter Summary Here",
    required: true,
  }),
  trackRecord: z.string().min(2).max(650).meta({
    label: "Track Record",
    description: "Proven history of delivery. Mention previous successful proposals, mainnet deployments, or relevant enterprise experience.",
    placeholder: "Enter Track Record Here",
    required: false,
  }),
  category: z
    .string()
    .length(24, "Please select a focus area")
    .regex(/^[a-fA-F0-9]{24}$/, "Must be a valid MongoDB ObjectId")
    .meta({
      label: "Focus Area",
      description: "The primary Cardano strategic pillar your project addresses (e.g., L1 Improvements, DeFi, RWA).",
      placeholder: "Select a focus area...",
      required: true,
    }),
  kpis: z.array(z.object({
    title: z.string().min(3).max(255),
    contributionStrategy: z.string().min(100).max(1000),
  })).min(1, "At least one KPI is required").meta({
    label: "Key Performance Indicators",
    description: "Select specific KPIs you intend to impact (e.g., TVL, Monthly Transactions, Active Users).",
    required: true,
  }),
});

export default formSchema;