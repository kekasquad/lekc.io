import kurento, { MediaPipeline, WebRtcEndpoint } from 'kurento-client';
import { Socket } from 'socket.io';
import { wsUri } from './config/constants';

interface Presenter {
    id: string;
    screenPipeline: MediaPipeline | null;
	webcamPipeline: MediaPipeline | null;
    screenWebRtcEndpoint: WebRtcEndpoint | null;
	webcamWebRtcEndpoint: WebRtcEndpoint | null;
}

interface Viewer {
	id: string;
    socket: Socket;
	screenWebRtcEndpoint: WebRtcEndpoint | null;
	webcamWebRtcEndpoint: WebRtcEndpoint | null;
}

interface Stream {
	id: string;
	presenter: Presenter;
	viewers: Map<string, Viewer>;
	screenCandidatesQueue: Map<string, RTCIceCandidate[]>;
	webcamCandidatesQueue: Map<string, RTCIceCandidate[]>;
}

let kurentoClient: kurento.ClientInstance | null = null;
export const streamRooms: Map<string, Stream> = new Map<string, Stream>();
export const viewers: Map<string, string> = new Map<string, string>();

export async function stopStream(socketId: string): Promise<void> {
	const stream: Stream | undefined = streamRooms.get(socketId);
	if (!stream) { return; }

	for (const viewer of stream.viewers.values()) {
		if (viewer?.socket) {
			viewer.socket.emit('streamStopped');
			viewer.webcamWebRtcEndpoint?.release();
			viewer.screenWebRtcEndpoint?.release();
		}
		viewers.delete(viewer.id);
	}
	await stream.presenter.screenPipeline?.release();
	await stream.presenter.webcamPipeline?.release();
	await stream.presenter.screenWebRtcEndpoint?.release();
	await stream.presenter.webcamWebRtcEndpoint?.release();
	streamRooms.delete(socketId);
}

export async function stopViewer(socketId: string) {
	const streamId: string | undefined = viewers.get(socketId);
	if (!streamId) { return; }
	viewers.delete(socketId);

	const stream: Stream | undefined = streamRooms.get(streamId);
	if (!stream) { return; }

	const viewer: Viewer | undefined = stream.viewers.get(socketId);
	if (viewer) {
		stream.viewers.delete(socketId);
		await viewer.screenWebRtcEndpoint?.release();
		await viewer.webcamWebRtcEndpoint?.release();
	}
	clearCandidatesQueue(streamId, socketId);
}

export async function startPresenter(socket: Socket, type: 'screen' | 'webcam', sdpOffer: string): Promise<string> {
	const socketId: string = socket.id;
	let stream: Stream | undefined = streamRooms.get(socketId);
	if (!stream) {
		stream = {
			id: socketId,
			presenter: {
				id: socketId,
				screenPipeline: null,
				webcamPipeline: null,
				screenWebRtcEndpoint: null,
				webcamWebRtcEndpoint: null
			},
			viewers: new Map<string, Viewer>(),
			screenCandidatesQueue: new Map<string, RTCIceCandidate[]>(),
			webcamCandidatesQueue: new Map<string, RTCIceCandidate[]>()
		}
		streamRooms.set(socketId, stream);
	}

	if (type === 'screen') {
		if (stream?.presenter?.screenWebRtcEndpoint) {
			throw `Presenter for stream ${socketId} already has ${type} webRtcEndpoint`;
		}

		if (!kurentoClient) {
			kurentoClient = await kurento(wsUri);
		}
		stream.presenter.screenPipeline = await kurentoClient.create('MediaPipeline');
		stream.presenter.screenWebRtcEndpoint = await stream.presenter.screenPipeline.create('WebRtcEndpoint');

		const candidatesQueueItem: RTCIceCandidate[] | undefined = stream.screenCandidatesQueue.get(socketId);
		if (candidatesQueueItem) {
			while(candidatesQueueItem && candidatesQueueItem.length) {
				const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
				if (candidate) {
					await stream.presenter.screenWebRtcEndpoint.addIceCandidate(candidate);
				}
			}
		}

		stream.presenter.screenWebRtcEndpoint.on('IceCandidateFound', (
			event: kurento.Event<'IceCandidateFound', {candidate: kurento.IceCandidate}>
			) => {
				const candidate: RTCIceCandidate =
					kurento.getComplexType('IceCandidate')(event.candidate);
				socket.emit('screenIceCandidate', candidate);
			}
		);

		const sdpAnswer: string = await stream.presenter.screenWebRtcEndpoint.processOffer(sdpOffer);
		await stream.presenter.screenWebRtcEndpoint.gatherCandidates();
		return sdpAnswer;
	} else {
		if (stream?.presenter?.webcamWebRtcEndpoint) {
			throw `Presenter for stream ${socketId} already has ${type} webRtcEndpoint`;
		}

		if (!kurentoClient) {
			kurentoClient = await kurento(wsUri);
		}
		stream.presenter.webcamPipeline = await kurentoClient.create('MediaPipeline');
		stream.presenter.webcamWebRtcEndpoint = await stream.presenter.webcamPipeline.create('WebRtcEndpoint');

		const candidatesQueueItem: RTCIceCandidate[] | undefined = stream.webcamCandidatesQueue.get(socketId);
		if (candidatesQueueItem) {
			while(candidatesQueueItem && candidatesQueueItem.length) {
				const candidate: RTCIceCandidate | undefined = candidatesQueueItem.shift();
				if (candidate) {
					await stream.presenter.webcamWebRtcEndpoint.addIceCandidate(candidate);
				}
			}
		}

		stream.presenter.webcamWebRtcEndpoint.on('IceCandidateFound', (
			event: kurento.Event<'IceCandidateFound', {candidate: kurento.IceCandidate}>
			) => {
				const candidate: RTCIceCandidate =
					kurento.getComplexType('IceCandidate')(event.candidate);
				socket.emit('webcamIceCandidate', candidate);
			}
		);

		const sdpAnswer: string = await stream.presenter.webcamWebRtcEndpoint.processOffer(sdpOffer);
		await stream.presenter.webcamWebRtcEndpoint.gatherCandidates();
		return sdpAnswer;
	}
}

export async function startViewer(streamId: string, socket: Socket, type: 'screen' | 'webcam', sdpOffer: string): Promise<string> {
	const socketId: string = socket.id;
	const stream: Stream | undefined = streamRooms.get(streamId);
	if (!stream) {
		throw `Stream with id ${streamId} not found`;
	}

	clearCandidatesQueue(streamId, socketId);

	if (type === 'screen') {
		if (!stream.presenter.screenPipeline || !stream.presenter.screenWebRtcEndpoint) {
			await stopViewer(socketId);
			throw `Stream ${streamId} presenter doesn't have ${type} webRtcEndpoint`;
		}

		const viewer: Viewer | undefined = stream.viewers.get(socketId);
		if (viewer?.screenWebRtcEndpoint) {
			throw `Stream ${streamId} viewer's ${type} webRtcEndpoint already exists`;
		}
		const screenWebRtcEndpoint: WebRtcEndpoint = await stream.presenter.screenPipeline.create('WebRtcEndpoint');

		if (viewer) {
			viewer.screenWebRtcEndpoint = screenWebRtcEndpoint;
		} else {
			stream.viewers.set(socketId, { id: socketId, screenWebRtcEndpoint, webcamWebRtcEndpoint: null, socket });
			viewers.set(socketId, streamId);
		}

		const candidatesQueueItem: RTCIceCandidate[] | undefined = stream.screenCandidatesQueue.get(socketId);
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
				socket.emit('screenIceCandidate', candidate);
			}
		);

		const sdpAnswer: string = await screenWebRtcEndpoint.processOffer(sdpOffer);
		await stream.presenter.screenWebRtcEndpoint.connect(screenWebRtcEndpoint);
		await screenWebRtcEndpoint.gatherCandidates();
		return sdpAnswer;
	} else {
		if (!stream.presenter.webcamPipeline || !stream.presenter.webcamWebRtcEndpoint) {
			await stopViewer(socketId);
			throw `Stream ${streamId} presenter doesn't have ${type} webRtcEndpoint`;
		}

		const viewer: Viewer | undefined = stream.viewers.get(socketId);
		if (viewer?.webcamWebRtcEndpoint) {
			throw `Stream ${streamId} viewer's ${type} webRtcEndpoint already exists`;
		}
		const webcamWebRtcEndpoint = await stream.presenter.webcamPipeline.create('WebRtcEndpoint');

		if (viewer) {
			viewer.webcamWebRtcEndpoint = webcamWebRtcEndpoint;
		} else {
			stream.viewers.set(socketId, { id: socketId, webcamWebRtcEndpoint, screenWebRtcEndpoint: null, socket });
			viewers.set(socketId, streamId);
		}

		const candidatesQueueItem: RTCIceCandidate[] | undefined = stream.webcamCandidatesQueue.get(socketId);
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
				socket.emit('webcamIceCandidate', candidate);
			}
		);

		const sdpAnswer: string = await webcamWebRtcEndpoint.processOffer(sdpOffer);
		await stream.presenter.webcamWebRtcEndpoint.connect(webcamWebRtcEndpoint);
		await webcamWebRtcEndpoint.gatherCandidates();
		return sdpAnswer;
	}
}

function clearCandidatesQueue(streamId: string, socketId: string): void {
	const stream: Stream | undefined = streamRooms.get(streamId);
	if (stream) {
		stream.screenCandidatesQueue.delete(socketId);
		stream.webcamCandidatesQueue.delete(socketId);
	}
}

export async function onPresenterIceCandidate(
	streamId: string,
	socketId: string,
	type: 'screen' | 'webcam',
	_candidate: RTCIceCandidate
): Promise<void> {
	const stream: Stream | undefined = streamRooms.get(streamId);
	if (!stream) { return; }

    const candidate: RTCIceCandidate = kurento.getComplexType('IceCandidate')(_candidate);

	console.log(`Sending presenter ${type} ICE candidate for stream ${streamId}, socketId ${socketId}`);

    if (type === 'screen' && stream.presenter.screenWebRtcEndpoint) {
		await stream.presenter.screenWebRtcEndpoint?.addIceCandidate(candidate);
	} else if (stream.presenter.webcamWebRtcEndpoint) {
		await stream.presenter.webcamWebRtcEndpoint.addIceCandidate(candidate);
	}
}

export async function onViewerIceCandidate(
	streamId: string,
	socketId: string,
	type: 'screen' | 'webcam',
	_candidate: RTCIceCandidate
): Promise<void> {
	const stream: Stream | undefined = streamRooms.get(streamId);
	if (!stream) { return; }
	const viewer: Viewer | undefined = stream.viewers.get(socketId);
	if (!viewer) { return; }

	const candidate: RTCIceCandidate = kurento.getComplexType('IceCandidate')(_candidate);
	let webRtcEndpoint: WebRtcEndpoint | null = null;
	let candidatesQueue: Map<string, RTCIceCandidate[]>;

	if (type === 'screen') {
		webRtcEndpoint = viewer.screenWebRtcEndpoint;
		candidatesQueue = stream.screenCandidatesQueue;
	} else {
		webRtcEndpoint = viewer.webcamWebRtcEndpoint;
		candidatesQueue = stream.webcamCandidatesQueue;
	}

	console.log(`Sending viewer ${type} ICE candidate for stream ${streamId}, socketId ${socketId}`);

	if (webRtcEndpoint) {
		await webRtcEndpoint.addIceCandidate(candidate);
	} else {
		console.log(`Queueing viewer ${type} ICE candidate for streamId ${streamId}, socketId ${socketId}`);
		if (!candidatesQueue.has(socketId)) {
			candidatesQueue.set(socketId, [candidate]);
		} else {
			candidatesQueue.get(socketId)?.push(candidate);
		}
	}
}