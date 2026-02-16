import { log, logError } from './logger.js';

export function getWallets() {
	if (!window.cardano) {
		logError('No window.cardano found');
		return {
			error: 'No window.cardano found'
		};
	} else {
		// get wallets from window.cardano
		let wallets = Object.keys(window.cardano);
		if (wallets.length === 0) {
			logError('No wallets found');
			return {
				error: 'No wallets found'
			};
		}
		log('Wallets found:', wallets);
		return wallets;
	}
}

export async function enableWallet(wallet, expectedNetwork) {
	log('Enabling wallet:', wallet);
	if (!window.cardano) {
		logError('No window.cardano found');
		return {
			error: 'No window.cardano found'
		};
	} else if (!window.cardano[wallet]) {
		logError('Wallet not found');
		return {
			error: 'Wallet not found'
		};
	} else {
		let walletApi;
		try {
			walletApi = await window.cardano[wallet].enable({
				extensions: [{ cip: 95 }]
			});
		} catch (error) {
			console.error('Error enabling wallet:', error);
			return {
				error: 'Error enabling wallet: ' + error.info
			};
		}

		// check if wallet supports CIP-95
		if (!walletApi.cip95) {
			logError('Wallet does not support CIP-95');
			return {
				error: 'Wallet does not support CIP-95'
			};
		}
		// check if wallet is on the right network
		const network = await checkNetwork(walletApi, expectedNetwork);
		if (!network) {
			logError('Wallet is not on the right network', expectedNetwork);
			return {
				error: 'Wallet is not on the right network'
			};
		}

		log('Wallet enabled:', walletApi);
		return walletApi;
	}
}

export async function checkNetwork(walletApi, expectedNetwork) {
	let selectedNetwork = await walletApi.getNetworkId();
	if (selectedNetwork != expectedNetwork) return false;
	else return true;
}

export async function getSignerAddress(walletApi, signType) {

	if (signType === 'stake') {
		try {
			let rewardAddresses = await walletApi.getRewardAddresses();
			if (rewardAddresses.length === 0) {
				logError('No reward addresses found');
				return {
					error: 'No reward addresses found'
				};
			}
			return rewardAddresses[0];
		} catch (error) {
			logError('Error getting reward addresses:', error);
			return {
				error: 'Error getting reward addresses: ' + error.info
			};
		}
	}

	if (signType === 'drep') {
		try {
			let drepKey = await walletApi.cip95.getPubDRepKey();
			if (!drepKey) {
				logError('No drep key found');
				return {
					error: 'No drep key found'
				};
			}
			return drepKey;
		} catch (error) {
			logError('Error getting drep key:', error);
			return {
				error: 'Error getting drep key: ' + error.info
			};
		}
	}

	if (signType === 'addr') {
		try {
			let paymentAddresses = await walletApi.getUnusedAddresses();
			if (paymentAddresses.length === 0) {
				logError('No payment key found');
				return {
					error: 'No payment key found'
				};
			}
			return paymentAddresses[0];
		} catch (error) {
			logError('Error getting payment addresses:', error);
			return {
				error: 'Error getting payment addresses: ' + error.info
			};
		}
	}

	return {
		error: 'Invalid sign type'
	};
}
