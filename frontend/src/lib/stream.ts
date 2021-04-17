import { WebRtcPeer } from "kurento-utils";
import { Socket } from 'socket.io-client';

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
        private streamId: string,
        private socket: Socket,
        private screenVideo: HTMLVideoElement,
        private webcamVideo: HTMLVideoElement
    ) {
        this.socket.on('sdpResponse', (result: string, type: 'screen' | 'webcam', response: string) => {
            console.log(`Received sdpResponse message: ${result} ${type} with response: ${response}`);
            this.processSdpResponse(result, type, response);
        });

        this.socket.on('streamStopped', () => {
            console.log('Received streamStopped message');
            this.dispose();
        });

        this.socket.on('screenIceCandidate', (candidate: RTCIceCandidate) => {
            console.log('Received screenIceCandidate message');
            this.screenWebRtcPeer?.addIceCandidate(candidate);
        });

        this.socket.on('webcamIceCandidate', (candidate: RTCIceCandidate) => {
            console.log('Received webcamIceCandidate message');
            this.webcamWebRtcPeer?.addIceCandidate(candidate);
        });
    }

    async startPresenter(): Promise<void> {
        if (!this.screenWebRtcPeer) {
            const mediaDevices = navigator.mediaDevices as any;
            const screenStream = await mediaDevices.getDisplayMedia({ video: true });
            const options = {
                localVideo: this.screenVideo,
                videoStream: screenStream,
                onicecandidate: this.onPresenterScreenIceCandidate.bind(this)
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
                onicecandidate: this.onPresenterWebcamIceCandidate.bind(this)
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
                onicecandidate: this.onViewerScreenIceCandidate.bind(this)
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
                onicecandidate: this.onViewerWebcamIceCandidate.bind(this)
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

    processSdpResponse(result: string, type: 'screen' | 'webcam', response: string): void {
        if (result != 'accepted') {
            const errorMsg = response || 'Unknown error';
            console.warn(`Call not accepted for the following reason: ${errorMsg}`);
            this.dispose();
        } else {
            console.log('Process SDP response');
            (type === 'screen' ?
                this.screenWebRtcPeer : this.webcamWebRtcPeer)?.processAnswer(response);
        }
    }

    stop(): void {
        if (this.screenWebRtcPeer || this.webcamWebRtcPeer) {
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

    private _onOffer(error: any, userType: 'presenter' | 'viewer', type: 'screen' | 'webcam', sdpOffer: string): void {
        if (error) {
            this.onError(error);
            return;
        }
        console.log(`On offer: ${userType}, ${type}`);
        if (userType === 'presenter') {
            this.socket.emit(userType, type, sdpOffer);
        } else {
            this.socket.emit(userType, this.streamId, type, sdpOffer);
        }
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

    private _onIceCandidate(
        userType: 'presenter' | 'viewer',
        type: 'screen' | 'webcam',
        candidate: RTCIceCandidate
    ): void {
        console.log(`Local ${userType} ${type} candidate for stream ${this.streamId}: `, JSON.stringify(candidate));
        this.socket.emit(`${userType}IceCandidate`, this.streamId, type, candidate);
    }
    private onViewerScreenIceCandidate(candidate: RTCIceCandidate): void {
        this._onIceCandidate('viewer','screen', candidate);
    }
    private onViewerWebcamIceCandidate(candidate: RTCIceCandidate): void {
        this._onIceCandidate('viewer','webcam', candidate);
    }
    private onPresenterScreenIceCandidate(candidate: RTCIceCandidate): void {
        this._onIceCandidate('presenter','screen', candidate);
    }
    private onPresenterWebcamIceCandidate(candidate: RTCIceCandidate): void {
        this._onIceCandidate('presenter','webcam', candidate);
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
        this.socket.disconnect();
    }
}