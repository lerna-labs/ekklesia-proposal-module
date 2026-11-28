// Per-instance sign-in and proposal settings, read from the deployment's env:
//   WALLETSIGNER_USER_TYPES    comma-separated sign-in types (drep, stake, pool); default stake,drep
//   WALLETSIGNER_USER_DEFAULT  the type the frontend preselects; default drep
//   WALLETSIGNER_MULTISIG      true | false, whether multisig sign-in is available; default false
//   PROPOSAL_SIGNER_TYPES      types that may create and manage their own proposals; default stake
//   MAINTENANCE_MESSAGE        banner text; unset or empty shows no banner

export const SIGNER_TYPES = ["drep", "stake", "pool"];

function parseTypeList(name, raw, fallback) {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return [...fallback];
  const types = [
    ...new Set(
      trimmed
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ];
  for (const type of types) {
    if (!SIGNER_TYPES.includes(type)) {
      throw new Error(
        `${name} contains unknown signer type "${type}" (allowed: ${SIGNER_TYPES.join(", ")})`,
      );
    }
  }
  if (types.length === 0) throw new Error(`${name} must list at least one signer type`);
  return types;
}

/**
 * Read and validate the sign-in and proposal settings.
 *
 * @returns {{ walletSigner: { userTypes: string[], userDefault: string, multisig: boolean }, proposalSignerTypes: string[], maintenanceMessage: string|null }}
 * @throws {Error} naming the offending value when a setting is invalid
 */
export function getSignInSettings(env = process.env) {
  const userTypes = parseTypeList("WALLETSIGNER_USER_TYPES", env.WALLETSIGNER_USER_TYPES, [
    "stake",
    "drep",
  ]);

  const userDefault = (env.WALLETSIGNER_USER_DEFAULT ?? "").trim() || "drep";
  if (!userTypes.includes(userDefault)) {
    throw new Error(
      `WALLETSIGNER_USER_DEFAULT "${userDefault}" is not in WALLETSIGNER_USER_TYPES (${userTypes.join(", ")})`,
    );
  }

  const rawMultisig = (env.WALLETSIGNER_MULTISIG ?? "").trim().toLowerCase();
  if (rawMultisig && rawMultisig !== "true" && rawMultisig !== "false") {
    throw new Error(`WALLETSIGNER_MULTISIG must be "true" or "false", got "${rawMultisig}"`);
  }
  const multisig = rawMultisig === "true";

  const proposalSignerTypes = parseTypeList("PROPOSAL_SIGNER_TYPES", env.PROPOSAL_SIGNER_TYPES, [
    "stake",
  ]);
  for (const type of proposalSignerTypes) {
    if (!userTypes.includes(type)) {
      throw new Error(
        `PROPOSAL_SIGNER_TYPES contains "${type}", which is not in WALLETSIGNER_USER_TYPES (${userTypes.join(", ")})`,
      );
    }
  }

  const maintenanceMessage = (env.MAINTENANCE_MESSAGE ?? "").trim() || null;

  return {
    walletSigner: { userTypes, userDefault, multisig },
    proposalSignerTypes,
    maintenanceMessage,
  };
}

/**
 * The sign-in type a verified userId belongs to, from its prefix. A multisig userId is a DRep
 * script ID and so resolves to "drep".
 *
 * @param {unknown} userId
 * @returns {"drep"|"stake"|"pool"|null}
 */
export function signerTypeOfUserId(userId) {
  const id = String(userId ?? "");
  return SIGNER_TYPES.find((type) => id.startsWith(type)) ?? null;
}

/**
 * @param {unknown} userId - the session's verified userId
 * @param {boolean} [multiSig] - whether the session is a multisig session, which is always refused:
 *   a multisig sign-in proves only that the signing key is named in the script, not that the
 *   script's threshold is met
 * @returns {boolean} whether that session may create and manage its own proposals
 */
export function isProposalSigner(userId, multiSig = false) {
  if (multiSig) return false;
  return getSignInSettings().proposalSignerTypes.includes(signerTypeOfUserId(userId));
}

/**
 * Refusal message for a sign-in request the deployment does not allow, or null when it is allowed.
 * For multisig the type checked is the script ID's (a DRep), not the client-supplied signType.
 *
 * @param {string} signType - client-supplied sign type
 * @param {boolean} isMultisig - whether the request carries a scriptAddress
 * @returns {string|null}
 */
export function signInRefusal(signType, isMultisig) {
  const { walletSigner } = getSignInSettings();
  if (isMultisig && !walletSigner.multisig) return "MultiSig sign-in is disabled";
  const type = isMultisig ? "drep" : signType;
  if (!walletSigner.userTypes.includes(type)) return `Sign-in type "${type}" is disabled`;
  return null;
}

/**
 * Answer 403 and return true when the session may not create or manage its own proposals. Call it
 * in a handler after isAuthenticated; it decides from the verified userId, never from the token's
 * signType. A multisig session is always refused.
 *
 * @param {{ userId?: string, multiSig?: boolean }} req
 * @param {{ status: Function }} res
 * @returns {boolean} true when the request was refused
 */
export function refuseNonProposalSigner(req, res) {
  if (isProposalSigner(req.userId, req.multiSig)) return false;
  res.status(403).json({
    status: "error",
    message: "This sign-in type cannot create or manage proposals on this instance",
  });
  return true;
}
