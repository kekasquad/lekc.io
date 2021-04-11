import {WebRtcPeer} from "kurento-utils";

export default class Stream {
    private screenWebRtcPeer: WebRtcPeer | null = null;
    private webcamWebRtcPeer: WebRtcPeer | null = null;

    _screenEnabled: boolean = true;
    _webcamEnabled: boolean = true;
    _audioEnabled: boolean = true;

    get screenEnabled(): boolean {
        return this._screenEnabled;
    }
    get webcamEnabled(): boolean {
        return this._webcamEnabled;
    }
    get audioEnabled(): boolean {
        return this._audioEnabled;
    }

    constructor(
        private ws: WebSocket,
        private screenVideo: HTMLVideoElement,
        private webcamVideo: HTMLVideoElement
    ) {
        this.ws.onmessage = (message: MessageEvent) => {
            const parsedMessage = JSON.parse(message.data);
            console.log('Received message: ' + message.data);

            switch (parsedMessage.id) {
                case 'sdpResponse':
                    this.processSdpResponse(parsedMessage);
                    break;
                case 'stopCommunication':
                    this.dispose();
                    break;
                case 'screenIceCandidate':
                    this.screenWebRtcPeer?.addIceCandidate(parsedMessage.candidate)
                    break;
                case 'webcamIceCandidate':
                    this.webcamWebRtcPeer?.addIceCandidate(parsedMessage.candidate)
                    break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
        }
    }

    async startPresenter(): Promise<void> {
        console.log('HERE');
        if (!this.screenWebRtcPeer) {
            const mediaDevices = navigator.mediaDevices as any;
            const screenStream = await mediaDevices.getDisplayMedia({ video: true });
            const options = {
                localVideo: this.screenVideo,
                videoStream: screenStream,
                onicecandidate: this.onScreenIceCandidate.bind(this)
            };

            this.screenWebRtcPeer = WebRtcPeer.WebRtcPeerSendonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                console.log('Created presenter screen endpoint');
                this.screenWebRtcPeer?.generateOffer(this.onOfferScreenPresenter.bind(this));
            });
        }
        if (!this.webcamWebRtcPeer) {
            const webcamStream: MediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            const options = {
                localVideo: this.webcamVideo,
                videoStream: webcamStream,
                onicecandidate: this.onWebcamIceCandidate.bind(this)
            };

            this.webcamWebRtcPeer = WebRtcPeer.WebRtcPeerSendonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                console.log('Created presenter webcam endpoint');
                this.webcamWebRtcPeer?.generateOffer(this.onOfferWebcamPresenter.bind(this));
            });
        }
    }

    startViewer(): void {
        if (!this.screenWebRtcPeer) {
            const options = {
                remoteVideo: this.screenVideo,
                onicecandidate: this.onScreenIceCandidate.bind(this)
            };

            this.screenWebRtcPeer = WebRtcPeer.WebRtcPeerRecvonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                console.log('Created viewer screen endpoint');
                this.screenWebRtcPeer?.generateOffer(this.onOfferScreenViewer.bind(this));
            });
        }
        if (!this.webcamWebRtcPeer) {
            const options = {
                remoteVideo: this.webcamVideo,
                onicecandidate: this.onWebcamIceCandidate.bind(this)
            };

            this.webcamWebRtcPeer = WebRtcPeer.WebRtcPeerRecvonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                console.log('Created viewer webcam endpoint');
                this.webcamWebRtcPeer?.generateOffer(this.onOfferWebcamViewer.bind(this));
            });
        }
    }

    processSdpResponse(message: any): void {
        if (message.response != 'accepted') {
            const errorMsg = message.message ? message.message : 'Unknow error';
            console.warn('Call not accepted for the following reason: ' + errorMsg);
            this.dispose();
        } else {
            console.log('Process SDP response');
            (message.type === 'screen' ?
                this.screenWebRtcPeer : this.webcamWebRtcPeer)?.processAnswer(message.sdpAnswer);
        }
    }

    stop(): void {
        if (this.screenWebRtcPeer || this.webcamWebRtcPeer) {
            this.sendMessage({ id: 'stop' });
            this.dispose();
        }
    }

    changeScreenMode(): void {
        this.screenWebRtcPeer?.getLocalStream()?.getVideoTracks()
            .map((track: MediaStreamTrack) => track.enabled = !this.screenEnabled);
        this._screenEnabled = !this.screenEnabled;
    }

    changeWebcamMode(): void {
        this.webcamWebRtcPeer?.getLocalStream()?.getVideoTracks()
            .map((track: MediaStreamTrack) => track.enabled = !this.webcamEnabled);
        this._webcamEnabled = !this.webcamEnabled;
    }

    changeAudioMode(): void {
        this.webcamWebRtcPeer?.getLocalStream()?.getAudioTracks()
            .map((track: MediaStreamTrack) => track.enabled = !this.audioEnabled);
        this._audioEnabled = !this.audioEnabled;
    }

    private onError(error: any): void {
        console.error(error);
    }

    private _onOffer(error: any, id: 'presenter' | 'viewer', type: 'screen' | 'webcam', sdpOffer: string): void {
        if (error) return this.onError(error);
        console.log(`On offer: ${id}, ${type}`);
        this.sendMessage({ id, type, sdpOffer });
    }
    private onOfferScreenPresenter(error: any, sdpOffer: string): void {
        this._onOffer(error, 'presenter', 'screen', sdpOffer);
    }
    private onOfferWebcamPresenter(error: any, sdpOffer: string): void {
        this._onOffer(error, 'presenter', 'webcam', sdpOffer);
    }
    private onOfferScreenViewer(error: any, sdpOffer: string): void {
        this._onOffer(error, 'viewer', 'screen', sdpOffer);
    }
    private onOfferWebcamViewer(error: any, sdpOffer: string): void {
        this._onOffer(error, 'viewer', 'webcam', sdpOffer);
    }

    private _onIceCandidate(type: 'screen' | 'webcam', candidate: any): void {
        console.log('Local candidate: ' + type + ' ' + JSON.stringify(candidate));

        this.sendMessage({
            id: 'onIceCandidate',
            type, candidate
        });
    }
    private onScreenIceCandidate(candidate: any): void {
        this._onIceCandidate('screen', candidate);
    }
    private onWebcamIceCandidate(candidate: any): void {
        this._onIceCandidate('webcam', candidate);
    }

    private dispose(): void {
        if (this.screenWebRtcPeer) {
            this.screenWebRtcPeer.dispose();
            this.screenWebRtcPeer = null;
        }
        if (this.webcamWebRtcPeer) {
            this.webcamWebRtcPeer.dispose();
            this.webcamWebRtcPeer = null;
        }
    }

    private sendMessage(message: any): void {
        const jsonMessage = JSON.stringify(message);
        console.log('Sending message: ' + jsonMessage);
        this.ws?.send(jsonMessage);
    }
}