import kurento, {MediaPipeline, WebRtcEndpoint} from 'kurento-client';
import ws from 'ws';
import { wsUri } from './config/constants';

interface Presenter {
    id: string;
    pipeline: MediaPipeline | null;
    webRtcEndpoint: WebRtcEndpoint | null;
}

interface Viewer {
    ws: ws;
	webRtcEndpoint: WebRtcEndpoint
}

let idCounter = 0;
const candidatesQueue: Map<string, RTCIceCandidate[]> = new Map<string, RTCIceCandidate[]>();
let kurentoClient: kurento.ClientInstance | null = null;
let presenter: Presenter | null = null;
const viewers: Map<string, Viewer> = new Map<string, any>();
const noPresenterMessage = 'No active presenter. Try again later...';
const presenterExistsMessage = 'Another user is currently acting as presenter. Try again later ...';


export function nextUniqueId(): string {
	idCounter++;
	return idCounter.toString();
}

export async function stop(sessionId: string): Promise<void> {
	if (presenter !== null && presenter.id === sessionId) {
		for (const viewer of viewers.values()) {
			if (viewer?.ws) {
				viewer.ws.send(JSON.stringify({
					id: 'stopCommunication'
				}));
			}
		}
		presenter.pipeline?.release();
		presenter = null;
		viewers.clear();

	} else {
		const viewer: Viewer | undefined = viewers.get(sessionId);
		if (viewer) {
			await viewer.webRtcEndpoint.release();
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

export async function startPresenter(sessionId: string, ws: ws, sdpOffer: string): Promise<string> {
	clearCandidatesQueue(sessionId);

	if (presenter !== null) {
		await stop(sessionId);
		throw presenterExistsMessage;
	}

	presenter = {
		id: sessionId,
		pipeline: null,
		webRtcEndpoint: null
	};

	if (!kurentoClient) {
		kurentoClient = await kurento(wsUri);
	}
	presenter.pipeline = await kurentoClient.create('MediaPipeline');
	presenter.webRtcEndpoint = await presenter.pipeline.create('WebRtcEndpoint');

	const candidatesQueueItem: RTCIceCandidate[] | undefined = candidatesQueue.get(sessionId);
	if (candidatesQueueItem) {
		while(candidatesQueueItem && candidatesQueueItem.length) {
			const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
			if (candidate) {
				await presenter.webRtcEndpoint.addIceCandidate(candidate);
			}
		}
	}

	presenter.webRtcEndpoint.on('IceCandidateFound', (
		event: kurento.Event<'IceCandidateFound', {candidate: kurento.IceCandidate}>
		) => {
			const candidate: RTCIceCandidate =
				kurento.getComplexType('IceCandidate')(event.candidate);
			ws.send(JSON.stringify({
				id: 'iceCandidate',
				candidate: candidate
			}));
		}
	);

	const sdpAnswer: string = await presenter.webRtcEndpoint.processOffer(sdpOffer);
	await presenter.webRtcEndpoint.gatherCandidates();
	return sdpAnswer;
}

export async function startViewer(sessionId: string, ws: any, sdpOffer: string): Promise<string> {
	clearCandidatesQueue(sessionId);

	if (presenter === null || !presenter.pipeline || !presenter.webRtcEndpoint) {
		await stop(sessionId);
		throw noPresenterMessage;
	}

	const viewerWebRtcEndpoint = await presenter.pipeline.create('WebRtcEndpoint');
	viewers.set(sessionId, { webRtcEndpoint: viewerWebRtcEndpoint, ws });

	const candidatesQueueItem: RTCIceCandidate[] | undefined = candidatesQueue.get(sessionId);
	if (candidatesQueueItem) {
		while(candidatesQueueItem.length) {
			const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
			if (candidate) {
				await viewerWebRtcEndpoint.addIceCandidate(candidate);
			}
		}
	}

	viewerWebRtcEndpoint.on('IceCandidateFound', (
		event: kurento.Event<'IceCandidateFound', {candidate: kurento.IceCandidate}>
		) => {
			const candidate: RTCIceCandidate =
				kurento.getComplexType('IceCandidate')(event.candidate);
			ws.send(JSON.stringify({
				id: 'iceCandidate',
				candidate: candidate
			}));
		}
	);

	const sdpAnswer: string = await viewerWebRtcEndpoint.processOffer(sdpOffer);
	await presenter.webRtcEndpoint.connect(viewerWebRtcEndpoint);
	await viewerWebRtcEndpoint.gatherCandidates();
	return sdpAnswer;
}

function clearCandidatesQueue(sessionId: string): void {
	if (candidatesQueue.has(sessionId)) {
		candidatesQueue.delete(sessionId);
	}
}

export async function onIceCandidate(sessionId: string, _candidate: RTCIceCandidate): Promise<void> {
    const candidate: RTCIceCandidate = kurento.getComplexType('IceCandidate')(_candidate);

    if (presenter && presenter.id === sessionId && presenter.webRtcEndpoint) {
        console.info('Sending presenter candidate');
        await presenter.webRtcEndpoint.addIceCandidate(candidate);
    }
    else {
		const viewer: Viewer | undefined = viewers.get(sessionId);
		if (viewer && viewer.webRtcEndpoint) {
			console.info('Sending viewer candidate');
			await viewer.webRtcEndpoint.addIceCandidate(candidate);
		}
		else {
			console.info('Queueing candidate');
			if (!candidatesQueue.has(sessionId)) {
				candidatesQueue.set(sessionId, [candidate]);
			} else {
				candidatesQueue.get(sessionId)?.push(candidate);
			}
		}
	}
}