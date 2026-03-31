import {
    PublicKey, Ed25519KeyHash, ScriptHash, Address, Credential,
} from "@emurgo/cardano-serialization-lib-nodejs";
import {bech32} from "bech32";

/**
 * Validate an authenticating address matches an accepted format
 *
 * @param {string} signerAddress
 * @param {string} signType
 */
export function validateAddress(signerAddress, signType) {
    if (!signerAddress) {
        // Can't validate something that doesn't exist
        return {
            error: "Signer address missing",
        };
    }

    let prefix, words, words_hex;

    try {
        const decoded = bech32.decode(signerAddress, 256);
        prefix = decoded.prefix;
        words = decoded.words;
        words_hex = Buffer.from(bech32.fromWords(words))
                          .toString("hex");
    } catch (error) {
        // Invalid bech32 format, try hex-pubkey to bech32 encoding...
        // console.error(signType, error);
        switch (signType) {
            case "drep":
            case "stake":
            case "addr":
                try {
                    return pubKeyToBech32(signerAddress, signType);
                } catch (e) {
                    return {
                        error: "Invalid address format",
                    };
                }
            default:
                return {
                    error: "Invalid address format",
                };
        }
    }

    if (!prefix.startsWith(signType)) {
        return {
            error: "Invalid signer type",
        };
    }

    switch (signType) {
        case "addr":
            try {
                const payment_address = Address.from_hex(words_hex);
                const payment_key_type = payment_address.payment_cred()
                                                        .kind();
                const [key_prefix, body] = extractParts(payment_address.to_hex());
                const payment_hash = body.substring(0,56);
                let credential;
                switch (payment_key_type) {
                    case 0:
                        const key_hash = Ed25519KeyHash.from_hex(payment_hash);
                        credential = Credential.from_keyhash(key_hash);
                        break;
                    case 1:
                        const script_hash = ScriptHash.from_hex(payment_hash);
                        credential = Credential.from_scripthash(script_hash);
                        break;
                }
            } catch (error) {
                console.error(error);
                return {
                    error: "Invalid address format",
                };
            }
            break;
        case "stake":
            try {
                // validate a staking address
                const stake_address = Address.from_hex(words_hex);
                stake_address.network_id();
                const key_type = stake_address.kind();
                const [body] = extractParts(stake_address.to_hex());
                let credential;
                switch (key_type) {
                    case 0:
                        const key_hash = Ed25519KeyHash.from_hex(body);
                        credential = Credential.from_keyhash(key_hash);
                        break;
                    case 1:
                        const script_hash = ScriptHash.from_hex(body);
                        credential = Credential.from_scripthash(script_hash);
                        break;
                }
            } catch (error) {
                return {
                    error: "Invalid stake address",
                };
            }
            break;
        case "drep":
            const parts = getAddressType(signerAddress);
            let cip129_prefix, cip105_prefix, isScript;
            switch (parts.hashType) {
                case "script":
                    cip129_prefix = "23";
                    cip105_prefix = "drep_script";
                    isScript = true;
                    break;
                case "key":
                    cip129_prefix = "22";
                    cip105_prefix = "drep";
                    isScript = false;
                    break;
            }

            return {
                cip105: bech32.encode(cip105_prefix, bech32.toWords(Buffer.from(parts.keyHash, "hex")), 256),
                cip129: bech32.encode("drep", bech32.toWords(Buffer.from(cip129_prefix + parts.keyHash, "hex")), 256),
                isScript: isScript,
            };
        case "pool":
            // TODO: Add some basic sanity checking like string length, etc here
            const key_hash = Ed25519KeyHash.from_hex(words_hex);
            Credential.from_keyhash(key_hash);
            break;

        case "calidus":
            try {
                let credential, isScript;
                const [header, body] = extractParts(words_hex);
                switch (header) {
                    case "a1":
                        const key_hash = Ed25519KeyHash.from_hex(body);
                        isScript = false;
                        credential = Credential.from_keyhash(key_hash);
                        break;
                    case "a2":
                        const script_hash = ScriptHash.from_hex(body);
                        isScript = true;
                        credential = Credential.from_scripthash(script_hash);
                        break;
                    default:
                        return {
                            error: "Unknown Calidus prefix!",
                        };
                }

                return {
                    signerAddress,
                    credential: credential.to_hex(),
                    isScript,
                    type: 'calidus'
                }
            } catch (error) {
                return {
                    error: "Invalid Calidus ID",
                };
            }
        default:
            return {
                error: "Invalid signer type",
            };
    }

    return signerAddress;
}

export function getAddressType(bech32Address) {
    try {
        const {
            prefix,
            words
        } = bech32.decode(bech32Address, 256);
        const body_hex = Buffer.from(bech32.fromWords(words))
                               .toString("hex");
        let type, keyHash, hashType, keyPrefix, keyBody;
        if (body_hex.length > 56) {
            [
                keyPrefix,
                keyBody
            ] = extractParts(body_hex);
            keyHash = keyBody;
        } else {
            keyPrefix = "22";
            keyHash = body_hex;
        }

        switch (prefix) {
            case "pool":
                hashType = "key";
                type = "pool";
                break;
            case "calidus":
                switch (keyPrefix) {
                    case "a1":
                        hashType = "key";
                        break;
                    case "a2":
                        hashType = "script";
                        break;
                }
                type = "calidus";
                break;
            case "drep_script":
                hashType = "script";
                keyPrefix = "23";
                type = "drep";
                break;
            case "drep":
                switch (keyPrefix) {
                    case "22":
                        hashType = "key";
                        break;
                    case "23":
                        hashType = "script";
                        break;
                }
                type = "drep";
                break;
            case "stake":
            case "stake_test":
                switch (keyPrefix) {
                    case "e0":
                    case "e1":
                        hashType = "key";
                        break;
                    case "f0":
                    case "f1":
                        hashType = "script";
                        break;
                }
                type = "stake";
                break;
        }
        // Ensure no dangling whitespace that could cause downstream issues...
        return {
            type: type.trim(),
            keyHash: keyHash.trim(),
            hashType: hashType.trim(),
        };
    } catch (error) {
        return {
            error: "Not a valid bech32 address",
        };
    }
}

export function pubKeyToBech32(key, prefix = "drep", script = false) {
    let bech32id = false;

    try {
        let pubkey, keyhash, prefix_byte, key_hex, credential, paymentKeyHash,
            stakeKeyHash, isScript;
        switch (prefix) {
            case "addr":
                const [addr_header, addr_body] = extractParts(key);
                const payment_key_hash = addr_body.substring(0, 56);
                const stake_key_hash = addr_body.substring(56);

                // Determine network prefix from header
                const testnet_headers = [
                    "00", "10", "20", "30", "40", "50", "60", "70",
                ];
                const mainnet_headers = [
                    "01", "11", "21", "31", "41", "51", "61", "71",
                ];

                if (testnet_headers.includes(addr_header)) {
                    prefix = "addr_test";
                } else if (mainnet_headers.includes(addr_header)) {
                    prefix = "addr";
                } else {
                    throw new Error("Invalid address header");
                }

                // Enterprise addresses (6x, 7x) have no stake portion
                const is_enterprise = ["60", "61", "70", "71"].includes(addr_header);
                // Pointer addresses (4x, 5x) have variable-length stake pointer
                const is_pointer = ["40", "41", "50", "51"].includes(addr_header);

                // Payment credential uses ScriptHash for types 1, 3, 5, 7
                const payment_is_script = [
                    "10", "11", "30", "31", "50", "51", "70", "71",
                ].includes(addr_header);

                // Stake credential uses ScriptHash for types 2, 3
                const stake_is_script = [
                    "20", "21", "30", "31",
                ].includes(addr_header);

                // Length validation
                if (is_enterprise) {
                    if (addr_body.length !== 56) {
                        throw new Error("Invalid enterprise address length");
                    }
                } else if (!is_pointer) {
                    // Base addresses must have payment (56) + stake (56) = 112
                    if (addr_body.length !== 112) {
                        throw new Error("Invalid base address length");
                    }
                }
                // Pointer addresses have variable length, skip strict check

                // Validate payment credential
                if (payment_is_script) {
                    paymentKeyHash = ScriptHash.from_hex(payment_key_hash);
                } else {
                    paymentKeyHash = Ed25519KeyHash.from_hex(payment_key_hash);
                }

                // Validate stake credential (if present)
                if (!is_enterprise && !is_pointer) {
                    if (stake_is_script) {
                        stakeKeyHash = ScriptHash.from_hex(stake_key_hash);
                    } else {
                        stakeKeyHash = Ed25519KeyHash.from_hex(stake_key_hash);
                    }
                }

                key_hex = key;
                break;
            case "drep":
                let cip105, cip129;
                if (key.length === 64) {
                    isScript = false;
                    prefix_byte = 22;
                    pubkey = PublicKey.from_hex(key);
                    keyhash = pubkey.hash();
                    cip105 = bech32.encode("drep", bech32.toWords(keyhash.to_bytes()), 256);
                } else {
                    isScript = true;
                    prefix_byte = 23;
                    pubkey = ScriptHash.from_hex(key);
                    keyhash = pubkey;
                    cip105 = bech32.encode("drep_script", bech32.toWords(keyhash.to_bytes()), 256);
                }
                key_hex = prefix_byte + keyhash.to_hex();
                cip129 = bech32.encode("drep", bech32.toWords(Buffer.from(key_hex, "hex")), 256);
                return {
                    cip105,
                    cip129,
                    isScript
                };
            case "calidus":
                let calidus_prefix;
                switch (script) {
                    case true:
                        calidus_prefix = "a2";
                        keyhash = ScriptHash.from_hex(key);
                        break;
                    case false:
                        calidus_prefix = "a1";
                        pubkey = PublicKey.from_hex(key);
                        keyhash = pubkey.hash();
                        break;
                }
                credential = Credential.from_keyhash(keyhash);
                key_hex = calidus_prefix + keyhash.to_hex();
                break;
            case "stake":
                const [header, body] = extractParts(key);

                switch (header) {
                    case "e0":
                        // testnet address...
                        prefix = "stake_test";
                        keyhash = Ed25519KeyHash.from_hex(body);
                        break;
                    case "e1":
                        keyhash = Ed25519KeyHash.from_hex(body);
                        break;
                    case "f0":
                        prefix = "stake_test";
                        keyhash = ScriptHash.from_hex(body);
                        break;
                    case "f1":
                        keyhash = ScriptHash.from_hex(body);

                        break;
                    default:
                        throw new Error("Invalid stake address");
                }

                credential = Credential.from_keyhash(keyhash);
                key_hex = key;
                break;
        }
        bech32id = bech32.encode(prefix, bech32.toWords(Buffer.from(key_hex, "hex")), 256);
    } catch (error) {
        throw error;
    }

    return bech32id;
}

export function extractParts(hexString) {
    if (hexString.length < 2) {
        return [
            hexString,
            ""
        ];
    }
    return [
        hexString.slice(0, 2),
        hexString.slice(2)
    ];
}
