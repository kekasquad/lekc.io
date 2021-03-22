import kurento, { MediaPipeline, WebRtcEndpoint } from 'kurento-client';
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
const candidatesQueue: Map<string, RTCIceCandidate[]> = new Map<string, any>();
let kurentoClient: kurento.ClientInstance | null = null;
let presenter: Presenter | null = null;
const viewers: Map<string, Viewer> = new Map();
const noPresenterMessage = 'No active presenter. Try again later...';
const presenterExistsMessage = 'Another user is currently acting as presenter. Try again later ...';


export function nextUniqueId(): string {
	idCounter++;
	return idCounter.toString();
}

export function stop(sessionId: string): void {
	if (presenter !== null && presenter.id == sessionId) {
		for (const viewerSessionId in viewers.keys()) {
			const viewer: Viewer | undefined = viewers.get(viewerSessionId);
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
			viewer.webRtcEndpoint.release();
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

export function startPresenter(sessionId: string, ws: ws, sdpOffer: string): Promise<string | undefined> {
	clearCandidatesQueue(sessionId);

	if (presenter !== null) {
		stop(sessionId);
		return Promise.reject(presenterExistsMessage);
	}

	presenter = {
		id: sessionId,
		pipeline: null,
		webRtcEndpoint: null
	}
	console.log('here');
	console.log(kurentoClient);
	return (kurentoClient ? Promise.resolve(kurentoClient) : kurento(wsUri))
		.then((client: kurento.ClientInstance) => {
			console.log('HERE');
			if (presenter === null) {
				throw noPresenterMessage;
			}

			if (kurentoClient === null) {
				kurentoClient = client;
			}
			return kurentoClient.create('MediaPipeline');
		})
		.then((pipeline: MediaPipeline) => {
			if (presenter) {
				presenter.pipeline = pipeline;
				return presenter.pipeline.create('WebRtcEndpoint');
			} else {
				throw noPresenterMessage;
			}
		})
		.then((webRtcEndpoint: WebRtcEndpoint) => {
			if (presenter) {
				presenter.webRtcEndpoint = webRtcEndpoint;
			} else {
				throw noPresenterMessage;
			}

			const candidatesQueueItem: RTCIceCandidate[] | undefined = candidatesQueue.get(sessionId);
			if (candidatesQueueItem) {
				console.log('Item yest');
				while(candidatesQueueItem && candidatesQueueItem.length) {
					const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
					if (candidate) {
						presenter.webRtcEndpoint.addIceCandidate(candidate);
					}
				}
			}
			console.log('NOpe');

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

			return webRtcEndpoint.processOffer(sdpOffer);
		})
		.then((sdpAnswer: string) => {
			if (presenter) {
				return presenter.webRtcEndpoint?.gatherCandidates().then(() => sdpAnswer);
			} else {
				throw noPresenterMessage;
			}
		})
		.catch((error: any) => {
			console.log('ERR: startPresenter' + error);
			stop(sessionId);
			throw error;
		});
}

export function startViewer(sessionId: string, ws: any, sdpOffer: any) {
	clearCandidatesQueue(sessionId);

	if (presenter === null || !presenter.pipeline) {
		stop(sessionId);
		return Promise.reject(noPresenterMessage);
	}

	return presenter.pipeline.create('WebRtcEndpoint')
		.then((webRtcEndpoint: WebRtcEndpoint) => {
			viewers.set(sessionId, { webRtcEndpoint, ws });
	
			if (presenter === null) {
				throw noPresenterMessage;
			}

			const candidatesQueueItem: RTCIceCandidate[] | undefined = candidatesQueue.get(sessionId);
			if (candidatesQueueItem) {
				while(candidatesQueueItem.length) {
					const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
					if (candidate) {
						webRtcEndpoint.addIceCandidate(candidate);
					}
				}
			}

			webRtcEndpoint.on('IceCandidateFound', (
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

			return webRtcEndpoint.processOffer(sdpOffer);
		})
		.then((sdpAnswer: string) => {
			if (presenter) {
				return presenter?.webRtcEndpoint?.connect(presenter.webRtcEndpoint)
					.then(() => {
						if (presenter) {
							return presenter.webRtcEndpoint?.gatherCandidates();
						} else {
							throw noPresenterMessage;
						}
					})
					.then(() => sdpAnswer);
			} else {
				throw noPresenterMessage;
			}
		})
		.catch((error: any) => {
			console.log('ERR: startViewer' + error);
			stop(sessionId);
			throw error;
		});
}

export function clearCandidatesQueue(sessionId: string): void {
	if (candidatesQueue.has(sessionId)) {
		candidatesQueue.delete(sessionId);
	}
}

export function onIceCandidate(sessionId: string, _candidate: RTCIceCandidate): void {
    const candidate: RTCIceCandidate = kurento.getComplexType('IceCandidate')(_candidate);

    if (presenter && presenter.id === sessionId && presenter.webRtcEndpoint) {
        console.info('Sending presenter candidate');
        presenter.webRtcEndpoint.addIceCandidate(candidate);
    }
    else {
		const viewer: Viewer | undefined = viewers.get(sessionId);
		if (viewer && viewer.webRtcEndpoint) {
			console.info('Sending viewer candidate');
			viewer.webRtcEndpoint.addIceCandidate(candidate);
		}
		else {
			console.info('Queueing candidate');
			if (!candidatesQueue.has(sessionId)) {
				candidatesQueue.set(sessionId, []);
			}
			candidatesQueue.get(sessionId)?.push(candidate);
		}
	}
}