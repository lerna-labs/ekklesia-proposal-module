/**
 * @fileoverview Helper for verifying transaction deposits and treasury donations.
 * Confirms that a transaction meets deposit/donation requirements and that a
 * specified stake key contributed to the transaction inputs.
 *
 * @module helper/verifyDeposit
 */

/** @typedef {import("./koios.js").TxInfo} TxInfo */

import {fetchTxInfo} from "./koios.js";

const regExpHex = /^[0-9a-fA-F]+$/;

/**
 * @typedef {Object} DepositOptions
 * @property {string|number} [treasuryDonation] - Minimum treasury donation in lovelace
 * @property {string} [depositAddress] - Address that should receive deposit (bech32)
 * @property {string|number} [depositAmount] - Required deposit amount in lovelace
 */

/**
 * Verify that a transaction meets deposit/donation requirements
 * and that a specific stake key contributed to it.
 *
 * @param {string} txHash - Transaction hash (hex)
 * @param {string} stakeAddr - Stake address to verify as contributor (bech32)
 * @param {DepositOptions} options
 * @returns {Promise<true|{error: string}>}
 */
export async function verifyDeposit(txHash, stakeAddr, options = {}) {
    if (!txHash || !regExpHex.test(txHash)) {
        return {
            error: "Transaction hash is missing or invalid",
        };
    }

    if (!stakeAddr) {
        return {
            error: "Stake address is missing",
        };
    }

    const {treasuryDonation, depositAddress, depositAmount} = options;
    const hasTreasuryCheck = treasuryDonation != null;
    const hasDepositCheck = depositAddress != null || depositAmount != null;

    if (!hasTreasuryCheck && !hasDepositCheck) {
        return {
            error: "At least one of treasuryDonation or depositAddress/depositAmount must be provided",
        };
    }

    if (hasDepositCheck && (!depositAddress || depositAmount == null)) {
        return {
            error: "Both depositAddress and depositAmount are required for deposit verification",
        };
    }

    const tx = await fetchTxInfo(txHash);
    if (!tx) {
        return {
            error: "Transaction not found",
        };
    }

    // Verify the stake key contributed to the transaction inputs
    const stakeKeyInInputs = tx.inputs?.some(
        (input) => input.stake_addr === stakeAddr
    );

    if (!stakeKeyInInputs) {
        return {
            error: "The specified stake key did not contribute to this transaction",
        };
    }

    // Treasury donation check
    if (hasTreasuryCheck) {
        const actualDonation = tx.treasury_donation
            ? BigInt(tx.treasury_donation)
            : 0n;
        const requiredDonation = BigInt(treasuryDonation);

        if (actualDonation < requiredDonation) {
            return {
                error: `Treasury donation of ${actualDonation} lovelace is less than the required ${requiredDonation}`,
            };
        }
    }

    // Deposit to address check
    if (hasDepositCheck) {
        const totalToAddress = (tx.outputs || [])
            .filter((output) => output.payment_addr?.bech32 === depositAddress)
            .reduce((sum, output) => sum + BigInt(output.value), 0n);

        const requiredAmount = BigInt(depositAmount);

        if (totalToAddress < requiredAmount) {
            return {
                error: `Deposit of ${totalToAddress} lovelace to ${depositAddress} is less than the required ${requiredAmount}`,
            };
        }
    }

    return true;
}
