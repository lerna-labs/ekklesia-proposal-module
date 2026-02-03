import mongoose from "mongoose";
const { Schema } = mongoose;

// WIP - working on the validations

const proposalSchema = new Schema(
    {
        userId: {
            type: String,
            required: true,
        },
        budgetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Budget",
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: { // executive summary here
            type: String,
            required: false,
        },
        categories: { // is only one value in the current Budget process
            type: [mongoose.Schema.Types.ObjectId],
            ref: "Category",
            required: true,
        },
        tags: { // not really used by Intersect, we could store "Technical (software/IT)" or "Non-technical" here, also if company or individual proposal
            type: [String],
            required: false,
        },
        metaData: { // still WIP
            trackRecord: {
                type: String,
                required: false,
            },
            contractingParty: {
                type: Object,
                required: true,
                properties: {
                    legalEntityName: String,
                    legalEntityType: {
                        type: String,
                        enum: ["company", "individual"],
                    },
                    legalEntityRegistrationNumber: String,
                    legalEntityCountry: String,
                    legalEntityAddress: String,
                },
            },
            primaryContact: {
                type: Object,
                required: true,
                properties: {
                    name: String,
                    title: String,
                    email: String,
                    socialMedia: String,
                },
            },
            signatoryContact: {
                type: Object,
                required: true,
                properties: {
                    name: String,
                    title: String,
                    email: String,
                    authorization: Boolean,
                },
            },
            proposalType: {
                type: String,
                enum: ["Technical (software/IT)", "Non-technical"],
                required: true,
            },
            kycInfo: {
                type: Object,
                required: true,
                properties: {
                    submitted: Boolean,
                    email: String,
                },
            },
            keyPerformanceIndicators: {
                type: [
                    {
                        kpi: String,
                        constributionStrategy: String,
                    }
                ],
                required: true,
            },
            executionRoadmap: {
                projectStartDate: Date,
                projectEndDate: Date,
                workPackages: [
                    {
                        title: String,
                        scope: String,
                        estimatedDuration: String,
                        coreObjectives: [String],
                        expectedValue: String,
                        metric: String,
                        budgetBreakdown: [{
                            costCategory: String,
                            description: String,
                            quantity: Number,
                            unitPrice: Number,
                            total: Number,
                        }],
                    }
                ],
            },
            financialAndAdministrative: {
                conversionRate: Number,
                initiativeType: {
                    type: String,
                    enum: ["New Initiative", "Maintenance"],
                    required: true,
                },
                priorFunding: String,
                treasuryRepayment: Boolean,
                treasuryRepaymentCondition: String,
                treasuryDonationHash: String,
                administrator: String,
                supportingDocuments: [String],
            },
            legalDeclarations: {
                type: Object,
                required: false,
                properties: {
                    dataProtection: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "dataProtection must be accepted (true)",
                        },
                    },
                    authorizationEntity: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "authorizationEntity must be accepted (true)",
                        },
                    },
                    authorizationAttestation: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "authorizationAttestation must be accepted (true)",
                        },
                    },
                    antiBribery: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "antiBribery must be accepted (true)",
                        },
                    },
                    authenticity: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "authenticity must be accepted (true)",
                        },
                    },
                    ipOwnership: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "ipOwnership must be accepted (true)",
                        },
                    },
                    conflicts: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "conflicts must be accepted (true)",
                        },
                    },
                    compliance: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "compliance must be accepted (true)",
                        },
                    },
                    sanctions: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "sanctions must be accepted (true)",
                        },
                    },
                    noContract: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "noContract must be accepted (true)",
                        },
                    },
                    noGuarantee: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "noGuarantee must be accepted (true)",
                        },
                    },
                },
            },

        },
        status: {
            type: String,
            required: true,
            enum: ["draft", "live", "withdrawnByProposer", "withdrawnByAdmin"],
        },
        withdrawalReason: {
            type: {
                category: ["Inappropriate content", "Spam", "Policy violation", "Duplicate submission", "Other"],
                userId: mongoose.Schema.Types.ObjectId,
                comment: String,
                date: Date,
            },
            required: false,
        },
        submittedAt: {
            type: Date,
            required: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            immutable: true,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

proposalSchema.index({ userId: 1, proposalId: 1 });
proposalSchema.index({ budgetId: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ title: 1 })

// Pre-save middleware to validate the proposal
proposalSchema.pre("validate", function (next) {
    if (this.status === "live") {
        if (!this.metaData?.legalDeclarations) {
            return next(new Error("legalDeclarations is required when status is live"));
        }
        // optional: validate that required sub-fields (e.g. dataProtection) are present and true
        if (!this.metaData?.legalDeclarations?.dataProtection) {
            return next(new Error("dataProtection is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.authorizationEntity) {
            return next(new Error("authorizationEntity is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.authorizationAttestation) {
            return next(new Error("authorizationAttestation is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.antiBribery) {
            return next(new Error("antiBribery is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.authenticity) {
            return next(new Error("authenticity is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.ipOwnership) {
            return next(new Error("ipOwnership is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.conflicts) {
            return next(new Error("conflicts is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.compliance) {
            return next(new Error("compliance is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.sanctions) {
            return next(new Error("sanctions is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.noContract) {
            return next(new Error("noContract is required when status is live"));
        }
        if (!this.metaData?.legalDeclarations?.noGuarantee) {
            return next(new Error("noGuarantee is required when status is live"));
        }
    }
    next();
});

// Pre-save middleware to update the updatedAt field
proposalSchema.pre("save", async function () {
    this.updatedAt = new Date();
});

const Proposal = mongoose.model("Proposal", proposalSchema);
export { Proposal };