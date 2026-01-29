/**
 * @fileoverview Helper functions for interacting with the Koios API.
 * Provides utilities for fetching DRep names and Cardano handles.
 * 
 * @module helper/koios
 */

/**
 * Fetches the DRep name for a given DRep ID from the Koios API.
 * 
 * @description
 * This function queries the Koios API to get DRep information, then fetches the metadata
 * URL to retrieve the DRep's name. It attempts to return the name from the dRepName field's
 * @value property, falling back to givenName if dRepName is not available.
 * 
 * @param {string} drepId - The DRep ID (e.g., "drep1y22hlaj8wuyygpnjy5cf96tg9tgvjrz39kxvqgv898uj9scfc55t7")
 * 
 * @returns {Promise<string|undefined|null>} Returns:
 *   - The DRep name string from dRepName["@value"] if available
 *   - The givenName string as fallback if dRepName is not available
 *   - undefined if neither name field is found in metadata
 *   - null if no DRep is found or if an error occurs during the initial API call
 * 
 * @throws {Error} Logs errors to console but does not throw - returns null or undefined on error
 * 
 * @example
 * const name = await fetchDrepName("drep1y22hlaj8wuyygpnjy5cf96tg9tgvjrz39kxvqgv898uj9scfc55t7");
 * console.log(name); // "Maureen"
 */
export async function fetchDrepName(drepId) {
    try {
        const response = await fetch(`${API_URL}/drep_info?registered=eq.true`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    "_drep_ids": [drepId],
                }),
            }
        );
        const data = await response.json();

        if (data.length === 0) {
            console.log("No DRep found");
            return null;
        }

        // fetch drep metadata
        try {
            console.log("Fetching DRep metadata:", data[0].meta_url);
            const drepMetadataResponse = await fetch(data[0].meta_url,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            const drepMetadata = await drepMetadataResponse.json();

            // Return the @value property from dRepName if it exists
            if (drepMetadata.body?.dRepName?.["@value"]) {
                return drepMetadata.body.dRepName["@value"];
            }
            // Fallback to givenName if dRepName doesn't have @value
            else if (drepMetadata.body?.givenName) {
                return drepMetadata.body.givenName;
            }
            // Return undefined if neither is available
            else {
                console.log("No DRep name found");
                return undefined;
            }
        } catch (error) {
            console.error("Error fetching DRep metadata:", error);
            return undefined;
        }

    } catch (error) {
        console.error("Error fetching DRep name:", error);
        return null;
    }
}

/**
 * Fetches the Cardano handle (asset name) for a given address from the Koios API.
 * 
 * @description
 * This function determines the appropriate Koios endpoint based on the address type:
 * - Stake addresses (starting with "stake") use the 'account_assets' endpoint
 * - Payment addresses (starting with "addr") use the 'address_assets' endpoint
 * It then queries for assets with the handle policy ID and retrieves the ASCII asset name.
 * 
 * @param {string} address - The Cardano address (stake address or payment address)
 *   - Stake address format: "stake1..."
 *   - Payment address format: "addr1..." or "addr_test1..."
 * 
 * @returns {Promise<string|null>} Returns:
 *   - The handle name as a string (asset_name_ascii) if found
 *   - null if no handle is found, invalid address format, or if an error occurs
 * 
 * @throws {Error} Logs errors to console but does not throw - returns null on error
 * 
 * @example
 * const handle = await fetchHandle("stake1ux3g2c9dx2nhhehybrzy0k0x4mdwvc7vt0l3v8qy3v3q4q5q6q7q8q");
 * console.log(handle); // "alice"
 * 
 * @example
 * const handle = await fetchHandle("addr1q8q25anxdp5hsmukxm99h7fh95rcuxed4ryk4jwzwhj7rpl8y7qqf0xuarfnjyljdqa2szayfdev9ytselvy47jh8aaq06gp78");
 * console.log(handle); // "bob"
 */
export async function fetchHandle(address) {
    const handlePolicyId = "f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a"
    let endpoint;
    let body;
    if (address.startsWith("stake")) {
        endpoint = 'account_assets';
        body = {
            "_stake_addresses": [address],
        };
    }
    if (address.startsWith("addr")) {
        endpoint = 'address_assets';
        body = {
            "_addresses": [address],
        };
    }
    if (!endpoint) {
        console.error("Invalid address");
        return null;
    }
    try {
        const response = await fetch(`${API_URL}/${endpoint}?policy_id=eq.${handlePolicyId}`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );
        const data = await response.json();
        if (data.length === 0) {
            console.log("No handle found");
            return null;
        }
        try {
            const getHandleMetadataResponse = await fetch(`${API_URL}/asset_info`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${API_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        "_asset_list": [[data[0].policy_id, data[0].asset_name]],
                    }),
                }
            );
            const getHandleMetadata = await getHandleMetadataResponse.json();
            return getHandleMetadata[0].asset_name_ascii;
        } catch (error) {
            console.error("Error fetching handle metadata:", error);
            return null;
        }

    } catch (error) {
        console.error("Error fetching endpoint:", error);
        return null;
    }
}


/**
 * Fetches script information from the Koios API for a given script hash.
 * 
 * This function validates the script hash format, makes an authenticated request
 * to the Koios API's script_info endpoint, and returns the script data if found.
 * 
 * @param {string} scriptHash - The hexadecimal script hash to look up
 * @returns {Promise<Object|false>} The script data object if found, false otherwise
 * @throws {Error} If API_URL or API_TOKEN are not set, or if scriptHash is invalid
 * 
 * @example
 * const scriptData = await getScript("abc123...");
 * if (scriptData) {
 *   console.log("Script found:", scriptData);
 * }
 */
export async function getScript(scriptHash) {
    const API_URL = process.env.API_URL;
    const API_TOKEN = process.env.API_TOKEN;

    // Validate that API configuration is set
    if (!API_URL) {
        console.error("API_URL is not set in the environment variables.");
        throw new Error("API URL is not set!");
    }

    if (!API_TOKEN) {
        console.error("API_TOKEN is not set in the environment variables.");
        throw new Error("API Token is not set!");
    }

    // Validate and parse the script hash format
    let script_hash;
    try {
        script_hash = ScriptHash.from_hex(scriptHash);
    } catch (error) {
        console.error(`Not a valid script hash: ${script_hash}`);
        throw new Error("Not a valid script hash");
    }

    try {
        // Make authenticated POST request to Koios script_info endpoint
        const scripts = await fetch(API_URL + "/script_info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Prefer: "count=exact", // Request exact count in response headers
                authorization: `Bearer ${API_TOKEN}`,
            },
            body: JSON.stringify({ _script_hashes: [scriptHash] }),
        });

        const script_data = await scripts.json();
        // TODO: Cache the fetched/returned script data so we can save on calls to Koios in the future

        // Return the first script if any results were found
        if (script_data.length > 0) {
            return script_data[0];
        }
        return false;
    } catch (error) {
        // Log error but don't throw - return false to indicate failure
        console.log("Error fetching script hash:", scriptHash);
        console.error(error);
    }

    return false;
}