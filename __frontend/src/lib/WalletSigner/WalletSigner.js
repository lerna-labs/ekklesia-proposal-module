import { api } from '../../stores/sessionManager.js';
import { log, logError } from './logger.js';

// retrieve payload from backend
export const getPayload = async (
	requestUrl,
	signerAddress = false,
	signType = false,
	scriptAddress = false
) => {
	let body = {
		signerAddress,
		signType
	};
	if (scriptAddress) {
		body.scriptAddress = scriptAddress;
	}
	const payloadRequest = await api.fetch(fetch, requestUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});
	if (!payloadRequest.ok) {
		logError('WS: Error retrieving payload', payloadRequest);
		let errorMessage = await payloadRequest.json();
		return {
			error:
				'WS: ' + errorMessage.message || 'Error retrieving payload: ' + payloadRequest.statusText
		};
	}
	const payloadResponse = await payloadRequest.json();
	log('Payload received for address', payloadResponse);

	return payloadResponse;
};

// submit signed data to backend
export async function submitSignature(
	requestUrl,
	signerAddress,
	signType,
	signature,
	data,
	scriptAddress = false
) {
	if (typeof fetch === 'undefined') {
		console.error('Fetch is not defined. Please include a fetch polyfill.');
		return {
			error: 'Fetch is not defined. Please include a fetch polyfill.'
		};
	}
	log('Submitting signature to backend', signerAddress, signature);

	// log('Request URL:', requestUrl);
	// log('Signer Address:', signerAddress);
	// log('Sign Type:', signType);
	// log('Signature:', signature);
	// log('Data:', data);
	// log('Script Address:', scriptAddress);

	if (!signerAddress) {
		logError('No signer address provided');
		return {
			error: 'No signer address provided'
		};
	}

	if (!signType) {
		logError('No signType provided');
		return {
			error: 'No signType provided'
		};
	}

	if (!signature) {
		logError('No signature provided');
		return {
			error: 'No signature provided'
		};
	}

	// submit to backend and get response
	let response;
	try {
		response = await api.fetch(fetch, requestUrl, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				signerAddress,
				signature,
				signType,
				data,
				scriptAddress
			})
		});
	} catch (error) {
		logError('Error submitting signature:', error);
		return {
			error: 'Error submitting signature: ' + error.body.message
		};
	}

	if (!response.ok) {
		let errorMessage = await response.json();
		logError('Error verifying signature', 'Status: ' + response.status, errorMessage);
		return {
			error: 'Error verifying signature: ' + errorMessage.message || response.statusText
		};
	}

	const requestData = await response.json();
	log('Received data:', requestData);

	if (requestData.error) {
		logError('Error in token response:', requestData.error);
		return {
			error: requestData.error
		};
	}

	return requestData;
}

// sign data with wallet
export async function signData(connectedWallet, address, data) {
	log('Signing data with wallet', connectedWallet.walletName);
	log('Data to sign:', data);
	log('Address to sign with:', address);

	try {
		const signature = await connectedWallet.api.signData(address, data);
		return signature;
	} catch (error) {
		logError('Error signing data:', error.info || error.message);
		return {
			error: 'Error signing data: ' + error.info
		};
	}
}
