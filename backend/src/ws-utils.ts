import kurento, { MediaPipeline, WebRtcEndpoint } from 'kurento-client';
import ws from 'ws';
import { wsUri } from './config/constants';

interface Presenter {
    id: string;
    screenPipeline: MediaPipeline | null;
	webcamPipeline: MediaPipeline | null;
    screenWebRtcEndpoint: WebRtcEndpoint | null;
	webcamWebRtcEndpoint: WebRtcEndpoint | null;
}

interface Viewer {
    ws: ws;
	screenWebRtcEndpoint: WebRtcEndpoint | null;
	webcamWebRtcEndpoint: WebRtcEndpoint | null;
}

let idCounter = 0;

const screenCandidatesQueue: Map<string, RTCIceCandidate[]> = new Map<string, RTCIceCandidate[]>();
const webcamCandidatesQueue: Map<string, RTCIceCandidate[]> = new Map<string, RTCIceCandidate[]>();

let kurentoClient: kurento.ClientInstance | null = null;
let presenter: Presenter | null = null;
const viewers: Map<string, Viewer> = new Map<string, any>();
const noPresenterMessage = 'No active presenter. Try again later...';
const presenterExistsMessage = 'Another user is currently acting as presenter. Try again later ...';
const endpointExistsMessage = 'Another endpoint is connected to particular user';


export function nextUniqueId(): string {
	idCounter++;
	return idCounter.toString();
}

export async function stop(sessionId: string, type?: 'screen' | 'webcam'): Promise<void> {
	if (presenter !== null && presenter.id === sessionId) {
		for (const viewer of viewers.values()) {
			if (viewer?.ws) {
				viewer.ws.send(JSON.stringify({
					id: 'stopCommunication'
				}));
			}
		}
		await presenter.screenPipeline?.release();
		await presenter.webcamPipeline?.release();
		presenter = null;
		viewers.clear();

	} else {
		const viewer: Viewer | undefined = viewers.get(sessionId);
		if (viewer) {
			await viewer.screenWebRtcEndpoint?.release();
			await viewer.webcamWebRtcEndpoint?.release();
			viewers.delete(sessionId);
		}
	}

	clearCandidatesQueue(sessionId);

	if (viewers.size < 1 && !presenter) {
        console.log('Closing kurento client');
        kurentoClient?.close();
        kurentoClient = null;
    }
}

export async function startPresenter(sessionId: string, ws: ws, type: 'screen' | 'webcam', sdpOffer: string): Promise<string> {
	clearCandidatesQueue(sessionId);

	if (type === 'screen') {
		if (presenter?.screenWebRtcEndpoint) {
			throw presenterExistsMessage;
		}

		if (!presenter) {
			presenter = {
				id: sessionId,
				screenPipeline: null,
				webcamPipeline: null,
				screenWebRtcEndpoint: null,
				webcamWebRtcEndpoint: null
			};
		}

		if (!kurentoClient) {
			kurentoClient = await kurento(wsUri);
		}
		presenter.screenPipeline = await kurentoClient.create('MediaPipeline');
		presenter.screenWebRtcEndpoint = await presenter.screenPipeline.create('WebRtcEndpoint');

		const candidatesQueueItem: RTCIceCandidate[] | undefined = screenCandidatesQueue.get(sessionId);
		if (candidatesQueueItem) {
			while(candidatesQueueItem && candidatesQueueItem.length) {
				const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
				if (candidate) {
					await presenter.screenWebRtcEndpoint.addIceCandidate(candidate);
				}
			}
		}

		presenter.screenWebRtcEndpoint.on('IceCandidateFound', (
			event: kurento.Event<'IceCandidateFound', {candidate: kurento.IceCandidate}>
			) => {
				const candidate: RTCIceCandidate =
					kurento.getComplexType('IceCandidate')(event.candidate);
				ws.send(JSON.stringify({
					id: 'screenIceCandidate',
					candidate: candidate
				}));
			}
		);

		const sdpAnswer: string = await presenter.screenWebRtcEndpoint.processOffer(sdpOffer);
		await presenter.screenWebRtcEndpoint.gatherCandidates();
		return sdpAnswer;
	} else {
		if (presenter?.webcamWebRtcEndpoint) {
			throw presenterExistsMessage;
		}

		if (!presenter) {
			presenter = {
				id: sessionId,
				screenPipeline: null,
				webcamPipeline: null,
				screenWebRtcEndpoint: null,
				webcamWebRtcEndpoint: null
			};
		}

		if (!kurentoClient) {
			kurentoClient = await kurento(wsUri);
		}
		presenter.webcamPipeline = await kurentoClient.create('MediaPipeline');
		presenter.webcamWebRtcEndpoint = await presenter.webcamPipeline.create('WebRtcEndpoint');

		const candidatesQueueItem: RTCIceCandidate[] | undefined = webcamCandidatesQueue.get(sessionId);
		if (candidatesQueueItem) {
			while(candidatesQueueItem && candidatesQueueItem.length) {
				const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
				if (candidate) {
					await presenter.webcamWebRtcEndpoint.addIceCandidate(candidate);
				}
			}
		}

		presenter.webcamWebRtcEndpoint.on('IceCandidateFound', (
			event: kurento.Event<'IceCandidateFound', {candidate: kurento.IceCandidate}>
			) => {
				const candidate: RTCIceCandidate =
					kurento.getComplexType('IceCandidate')(event.candidate);
				ws.send(JSON.stringify({
					id: 'webcamIceCandidate',
					candidate: candidate
				}));
			}
		);

		const sdpAnswer: string = await presenter.webcamWebRtcEndpoint.processOffer(sdpOffer);
		await presenter.webcamWebRtcEndpoint.gatherCandidates();
		return sdpAnswer;
	}
}

export async function startViewer(sessionId: string, ws: any, type: 'screen' | 'webcam', sdpOffer: string): Promise<string> {
	clearCandidatesQueue(sessionId);

	if (presenter === null) {
		console.log('HERE', presenter);
		throw noPresenterMessage;
	}

	if (type === 'screen') {
		if (!presenter.screenPipeline || !presenter.screenWebRtcEndpoint) {
			console.log('OR HERE');
			await stop(sessionId, 'screen');
			throw noPresenterMessage;
		}

		const viewer: Viewer | undefined = viewers.get(sessionId);
		if (viewer?.screenWebRtcEndpoint) {
			throw endpointExistsMessage;
		}
		const screenWebRtcEndpoint = await presenter.screenPipeline.create('WebRtcEndpoint');

		if (viewer) {
			viewer.screenWebRtcEndpoint = screenWebRtcEndpoint;
		} else {
			viewers.set(sessionId, { screenWebRtcEndpoint, webcamWebRtcEndpoint: null, ws });
		}

		const candidatesQueueItem: RTCIceCandidate[] | undefined = screenCandidatesQueue.get(sessionId);
		if (candidatesQueueItem) {
			while(candidatesQueueItem.length) {
				const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
				if (candidate) {
					await screenWebRtcEndpoint.addIceCandidate(candidate);
				}
			}
		}

		screenWebRtcEndpoint.on('IceCandidateFound', (
			event: kurento.Event<'IceCandidateFound', { candidate: kurento.IceCandidate }>
			) => {
				const candidate: RTCIceCandidate =
					kurento.getComplexType('IceCandidate')(event.candidate);
				ws.send(JSON.stringify({
					id: 'screenIceCandidate',
					candidate: candidate
				}));
			}
		);

		const sdpAnswer: string = await screenWebRtcEndpoint.processOffer(sdpOffer);
		await presenter.screenWebRtcEndpoint.connect(screenWebRtcEndpoint);
		await screenWebRtcEndpoint.gatherCandidates();
		return sdpAnswer;
	} else {
		if (!presenter.webcamPipeline || !presenter.webcamWebRtcEndpoint) {
			await stop(sessionId, 'webcam');
			throw noPresenterMessage;
		}

		const viewer: Viewer | undefined = viewers.get(sessionId);
		if (viewer?.webcamWebRtcEndpoint) {
			throw endpointExistsMessage;
		}
		const webcamWebRtcEndpoint = await presenter.webcamPipeline.create('WebRtcEndpoint');

		if (viewer) {
			viewer.webcamWebRtcEndpoint = webcamWebRtcEndpoint;
		} else {
			viewers.set(sessionId, { webcamWebRtcEndpoint, screenWebRtcEndpoint: null, ws });
		}

		const candidatesQueueItem: RTCIceCandidate[] | undefined = webcamCandidatesQueue.get(sessionId);
		if (candidatesQueueItem) {
			while(candidatesQueueItem.length) {
				const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
				if (candidate) {
					await webcamWebRtcEndpoint.addIceCandidate(candidate);
				}
			}
		}

		webcamWebRtcEndpoint.on('IceCandidateFound', (
			event: kurento.Event<'IceCandidateFound', { candidate: kurento.IceCandidate }>
			) => {
				const candidate: RTCIceCandidate =
					kurento.getComplexType('IceCandidate')(event.candidate);
				ws.send(JSON.stringify({
					id: 'webcamIceCandidate',
					candidate: candidate
				}));
			}
		);

		const sdpAnswer: string = await webcamWebRtcEndpoint.processOffer(sdpOffer);
		await presenter.webcamWebRtcEndpoint.connect(webcamWebRtcEndpoint);
		await webcamWebRtcEndpoint.gatherCandidates();
		return sdpAnswer;
	}
}

function clearCandidatesQueue(sessionId: string): void {
	screenCandidatesQueue.delete(sessionId);
	webcamCandidatesQueue.delete(sessionId);
}

export async function onIceCandidate(
	sessionId: string,
	type: 'screen' | 'webcam',
	_candidate: RTCIceCandidate
): Promise<void> {
    const candidate: RTCIceCandidate = kurento.getComplexType('IceCandidate')(_candidate);

    if (type === 'screen') {
		if (presenter && presenter.id === sessionId && presenter.screenWebRtcEndpoint) {
			console.info('Sending presenter candidate');
			await presenter.screenWebRtcEndpoint?.addIceCandidate(candidate);
		}
		else {
			const viewer: Viewer | undefined = viewers.get(sessionId);
			if (viewer && viewer.screenWebRtcEndpoint) {
				console.info('Sending viewer candidate');
				await viewer.screenWebRtcEndpoint.addIceCandidate(candidate);
			}
			else {
				console.info('Queueing candidate');
				if (!screenCandidatesQueue.has(sessionId)) {
					screenCandidatesQueue.set(sessionId, [candidate]);
				} else {
					screenCandidatesQueue.get(sessionId)?.push(candidate);
				}
			}
		}
	} else {
		if (presenter && presenter.id === sessionId && presenter.webcamWebRtcEndpoint) {
			console.info('Sending presenter candidate');
			await presenter.webcamWebRtcEndpoint?.addIceCandidate(candidate);
		}
		else {
			const viewer: Viewer | undefined = viewers.get(sessionId);
			if (viewer && viewer.webcamWebRtcEndpoint) {
				console.info('Sending viewer candidate');
				await viewer.webcamWebRtcEndpoint.addIceCandidate(candidate);
			}
			else {
				console.info('Queueing candidate');
				if (!webcamCandidatesQueue.has(sessionId)) {
					webcamCandidatesQueue.set(sessionId, [candidate]);
				} else {
					webcamCandidatesQueue.get(sessionId)?.push(candidate);
				}
			}
		}
	}


}