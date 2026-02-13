import mongoose from "mongoose";
const { Schema } = mongoose;

// WIP - working on the validations

const proposalSchema = new Schema(
    {
        proposerId: {
            type: String,
            ref: "User",
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
            strategicFocusArea: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Category",
                required: true,
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
            enum: ["draft", "live", "withdrawnByProposer", "withdrawnByAdmin", "archived"], // new status archived for updated proposals to track changes
        },
        withdrawalDetails: {
            type: {
                category: ["Inappropriate content", "Spam", "Policy violation", "Duplicate submission", "Other"],
                userId: String,
                comment: String,
                date: Date,
            },
            required: false,
        },
        versions: [ // track former versions of the proposal
            {
                _id: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                },
                createdAt: {
                    type: Date,
                    required: true,
                },
            }
        ],
        submittedAt: {
            type: Date,
            required: false,
        },
        signature: {
            type: String,
            required: false,
        },
        totalBudget: {
            type: Number,
            required: false,
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

// Pre-validate middleware: throw so Mongoose handles the error (works with Mongoose 9 async hooks)
proposalSchema.pre("validate", function () {
    if (this.status !== "live") return;
    if (!this.metaData?.legalDeclarations) {
        throw new Error("legalDeclarations is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.dataProtection) {
        throw new Error("dataProtection is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.authorizationEntity) {
        throw new Error("authorizationEntity is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.authorizationAttestation) {
        throw new Error("authorizationAttestation is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.antiBribery) {
        throw new Error("antiBribery is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.authenticity) {
        throw new Error("authenticity is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.ipOwnership) {
        throw new Error("ipOwnership is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.conflicts) {
        throw new Error("conflicts is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.compliance) {
        throw new Error("compliance is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.sanctions) {
        throw new Error("sanctions is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.noContract) {
        throw new Error("noContract is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.noGuarantee) {
        throw new Error("noGuarantee is required when status is live");
    }
});

// Pre-save middleware to set version (no callback — Mongoose 9 compatible)
proposalSchema.pre("save", function () {
    if (this.isNew) {
        this.version = 1;
    } else {
        this.version = (this.version ?? 0) + 1;
    }
});

const Proposal = mongoose.model("Proposal", proposalSchema);
export { Proposal };