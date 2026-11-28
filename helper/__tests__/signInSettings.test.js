import test from "node:test";
import assert from "node:assert/strict";
import {
  getSignInSettings,
  signInRefusal,
  signerTypeOfUserId,
  isProposalSigner,
  refuseNonProposalSigner,
} from "../signInSettings.js";
import { validateSessionRequest } from "../middleWare.js";

const SETTING_KEYS = [
  "WALLETSIGNER_USER_TYPES",
  "WALLETSIGNER_USER_DEFAULT",
  "WALLETSIGNER_MULTISIG",
  "PROPOSAL_SIGNER_TYPES",
  "MAINTENANCE_MESSAGE",
];

function withEnv(values, run) {
  const saved = Object.fromEntries(SETTING_KEYS.map((k) => [k, process.env[k]]));
  for (const k of SETTING_KEYS) delete process.env[k];
  Object.assign(process.env, values);
  try {
    return run();
  } finally {
    for (const k of SETTING_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
}

function fakeRes() {
  return {
    code: null,
    body: null,
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("unset settings give the documented defaults", () => {
  assert.deepEqual(getSignInSettings({}), {
    walletSigner: { userTypes: ["stake", "drep"], userDefault: "drep", multisig: false },
    proposalSignerTypes: ["stake"],
    maintenanceMessage: null,
  });
});

test("settings are parsed, trimmed and de-duplicated", () => {
  const settings = getSignInSettings({
    WALLETSIGNER_USER_TYPES: " stake, drep ,pool,stake",
    WALLETSIGNER_USER_DEFAULT: "pool",
    WALLETSIGNER_MULTISIG: "TRUE",
    PROPOSAL_SIGNER_TYPES: "stake,drep",
    MAINTENANCE_MESSAGE: "  Back at 20:00 UTC  ",
  });
  assert.deepEqual(settings, {
    walletSigner: { userTypes: ["stake", "drep", "pool"], userDefault: "pool", multisig: true },
    proposalSignerTypes: ["stake", "drep"],
    maintenanceMessage: "Back at 20:00 UTC",
  });
});

test("an empty maintenance message means no banner", () => {
  assert.equal(getSignInSettings({ MAINTENANCE_MESSAGE: "   " }).maintenanceMessage, null);
});

test("an invalid setting fails with a message naming the bad value", () => {
  assert.throws(
    () => getSignInSettings({ WALLETSIGNER_USER_TYPES: "stake,addr" }),
    /WALLETSIGNER_USER_TYPES.*"addr"/,
  );
  assert.throws(
    () => getSignInSettings({ WALLETSIGNER_USER_TYPES: "," }),
    /WALLETSIGNER_USER_TYPES.*at least one/,
  );
  assert.throws(
    () => getSignInSettings({ WALLETSIGNER_USER_TYPES: "stake" }),
    /WALLETSIGNER_USER_DEFAULT "drep" is not in WALLETSIGNER_USER_TYPES/,
  );
  assert.throws(
    () => getSignInSettings({ WALLETSIGNER_USER_DEFAULT: "pool" }),
    /WALLETSIGNER_USER_DEFAULT "pool"/,
  );
  assert.throws(
    () => getSignInSettings({ WALLETSIGNER_MULTISIG: "yes" }),
    /WALLETSIGNER_MULTISIG.*"yes"/,
  );
  assert.throws(
    () => getSignInSettings({ PROPOSAL_SIGNER_TYPES: "stake,wallet" }),
    /PROPOSAL_SIGNER_TYPES.*"wallet"/,
  );
  assert.throws(
    () =>
      getSignInSettings({ WALLETSIGNER_USER_TYPES: "stake,drep", PROPOSAL_SIGNER_TYPES: "pool" }),
    /PROPOSAL_SIGNER_TYPES contains "pool", which is not in WALLETSIGNER_USER_TYPES/,
  );
});

test("sign-in refuses a type that is not offered, for a plain sign-in", () => {
  withEnv({ WALLETSIGNER_USER_TYPES: "stake", WALLETSIGNER_USER_DEFAULT: "stake" }, () => {
    assert.equal(signInRefusal("stake", false), null);
    assert.match(signInRefusal("drep", false), /"drep" is disabled/);
    assert.match(signInRefusal("pool", false), /"pool" is disabled/);
  });
});

test("sign-in refuses the multisig path unless it is turned on", () => {
  withEnv({}, () => {
    assert.match(signInRefusal("drep", true), /MultiSig sign-in is disabled/);
  });
  withEnv({ WALLETSIGNER_MULTISIG: "true" }, () => {
    assert.equal(signInRefusal("drep", true), null);
  });
});

test("for multisig the type checked is the script's DRep type, not the client's signType", () => {
  withEnv({ WALLETSIGNER_MULTISIG: "true" }, () => {
    // The client claims an allowed type; the script ID is still a DRep ID and DRep is offered.
    assert.equal(signInRefusal("stake", true), null);
  });
  withEnv(
    {
      WALLETSIGNER_MULTISIG: "true",
      WALLETSIGNER_USER_TYPES: "stake",
      WALLETSIGNER_USER_DEFAULT: "stake",
    },
    () => {
      // DRep is not offered, so a multisig is refused whatever signType the client sends.
      assert.match(signInRefusal("stake", true), /"drep" is disabled/);
      assert.match(signInRefusal("drep", true), /"drep" is disabled/);
    },
  );
});

test("validateSessionRequest answers 403 before any address check, at both steps", () => {
  withEnv({ WALLETSIGNER_USER_TYPES: "stake", WALLETSIGNER_USER_DEFAULT: "stake" }, () => {
    for (const body of [
      { signerAddress: "x", signType: "drep" },
      { signerAddress: "x", signType: "stake", scriptAddress: "y" },
    ]) {
      const res = fakeRes();
      let called = false;
      validateSessionRequest({ body }, res, () => (called = true));
      assert.equal(res.code, 403);
      assert.equal(called, false);
    }
  });
});

test("userId prefixes map to sign-in types, and a multisig DRep script ID is a DRep", () => {
  assert.equal(signerTypeOfUserId("stake1u9abc"), "stake");
  assert.equal(signerTypeOfUserId("stake_test1uabc"), "stake");
  assert.equal(signerTypeOfUserId("drep1y2abc"), "drep");
  assert.equal(signerTypeOfUserId("pool1abc"), "pool");
  assert.equal(signerTypeOfUserId("addr1abc"), null);
  assert.equal(signerTypeOfUserId(undefined), null);
});

test("proposal writes: stake is allowed, DRep and multisig DRep are refused by default", () => {
  withEnv({}, () => {
    assert.equal(isProposalSigner("stake_test1uabc"), true);
    for (const userId of ["drep1y2abc", "drep1yscriptid", "pool1abc", "addr1abc", undefined]) {
      const res = fakeRes();
      assert.equal(
        refuseNonProposalSigner({ userId, signType: "stake" }, res),
        true,
        String(userId),
      );
      assert.equal(res.code, 403);
    }
    const ok = fakeRes();
    assert.equal(refuseNonProposalSigner({ userId: "stake1u9abc", signType: "drep" }, ok), false);
    assert.equal(ok.code, null);
  });
});

test("proposal writes follow PROPOSAL_SIGNER_TYPES", () => {
  withEnv({ PROPOSAL_SIGNER_TYPES: "stake,drep" }, () => {
    assert.equal(isProposalSigner("drep1y2abc"), true);
    assert.equal(isProposalSigner("pool1abc"), false);
  });
});

test("a multisig session never manages proposals, whatever the settings say", () => {
  withEnv(
    {
      PROPOSAL_SIGNER_TYPES: "stake,drep",
      WALLETSIGNER_MULTISIG: "true",
    },
    () => {
      const single = fakeRes();
      assert.equal(
        refuseNonProposalSigner({ userId: "drep1y2abc", multiSig: false }, single),
        false,
      );
      assert.equal(single.code, null);
      const multi = fakeRes();
      assert.equal(
        refuseNonProposalSigner({ userId: "drep1yscriptid", multiSig: true }, multi),
        true,
      );
      assert.equal(multi.code, 403);
    },
  );
});
