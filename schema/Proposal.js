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
        summary: { // executive summary here
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
                    // Individual (PDF: country of residence, govt ID, full residential address)
                    countryOfResidence: String,
                    govtIssuedIdNumber: String,
                    fullResidentialAddress: String,
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
                required: false, // optional for draft; required when status is live
            },
            kycInfo: {
                type: Object,
                required: true,
                properties: {
                    submitted: Boolean,
                    email: String,
                    totalProposalsSubmitted: { type: Number, required: false }, // count this funding round (proposal-schema-description §4)
                },
            },
            strategicFocusArea: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Category",
                required: false, // optional for draft; required when status is live (enforce in validation or pre-save)
            },
            keyPerformanceIndicators: {
                type: [
                    {
                        kpi: String,
                        contributionStrategy: String,
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
                        supportingDocuments: [{
                            title: String,
                            url: String,
                        }],
                        estimatedDuration: String,
                        coreObjectives: [String],
                        expectedValue: String,
                        metric: String,
                        milestones: [{
                            milestoneName: String,
                            deliverables: String,
                            acceptanceCriteria: String,
                            duration: String,
                        }],
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
                intersectAdministrator: Boolean,
                otherAdministrators: String,
                initiativeType: {
                    type: String,
                    enum: ["New Initiative", "Maintenance"],
                    required: false, // optional for draft; required when status is live
                },
                priorFunding: String,
                treasuryRepayment: Boolean,
                treasuryRepaymentCondition: String,
                treasuryDonationHash: String,
                thirdPartyAssurers: String,
                supportingDocuments: [{
                    title: String,
                    url: String,
                }],
            },
            // Legal declarations: PDF has 4 checkboxes only (§1: dataProtection, publicVisibilityConsent; §8: authorizationEntity, authorizationAttestation) + §8 submitter fields
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
                    publicVisibilityConsent: {
                        type: Boolean,
                        required: true,
                        validate: {
                            validator: (v) => v === true,
                            message: "publicVisibilityConsent must be accepted (true)",
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
                    submitterName: { type: String, required: false },
                    submitterRole: { type: String, required: false },
                    submitterEmail: { type: String, required: false },
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
                category: {
                    type: String,
                    enum: ["Inappropriate content", "Spam", "Policy violation", "Duplicate submission", "Other"],
                },
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
        version: {
            type: Number,
            default: 1,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

proposalSchema.index({ proposerId: 1, budgetId: 1 });
proposalSchema.index({ budgetId: 1 });
proposalSchema.index({ status: 1 });
proposalSchema.index({ title: 1 })

// Pre-validate middleware: require only the 4 PDF checkboxes when status is live (CBC Proposal Template FORM Final DRAFT)
proposalSchema.pre("validate", function () {
    if (this.status !== "live") return;
    if (!this.metaData?.legalDeclarations) {
        throw new Error("legalDeclarations is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.dataProtection) {
        throw new Error("dataProtection is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.publicVisibilityConsent) {
        throw new Error("publicVisibilityConsent is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.authorizationEntity) {
        throw new Error("authorizationEntity is required when status is live");
    }
    if (!this.metaData?.legalDeclarations?.authorizationAttestation) {
        throw new Error("authorizationAttestation is required when status is live");
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