// Custom logger with blue prefix
export const log = (message, data) => {
	if (data) {
		console.log('%cWalletSigner: %s', 'color: #3b82f6; font-weight: bold;', message, data);
	} else {
		console.log('%cWalletSigner: %s', 'color: #3b82f6; font-weight: bold;', message);
	}
};
export const logError = (message, error) => {
	if (error) {
		console.error('%cWalletSigner: %s', 'color: #3b82f6; font-weight: bold;', message, error);
	} else {
		console.error('%cWalletSigner: %s', 'color: #3b82f6; font-weight: bold;', message);
	}
};
