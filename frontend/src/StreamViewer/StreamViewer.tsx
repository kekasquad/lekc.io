import React from 'react';
import './StreamViewer.css';
import { WebRtcPeer } from 'kurento-utils';
import NavBar from '../NavBar/NavBar';

export default class Stream extends React.Component {

    ws: WebSocket | undefined;
    screenWebRtcPeer: WebRtcPeer | null = null;
    webcamWebRtcPeer: WebRtcPeer | null = null;
    screenVideo: any;
    webcamVideo: any;

    constructor(props: any) {
        super(props);

        this.onError = this.onError.bind(this);
        this.presenter = this.presenter.bind(this);
        this.viewer = this.viewer.bind(this);
        this.processSdpResponse = this.processSdpResponse.bind(this);

        this._onOffer = this._onOffer.bind(this);
        this.onOfferScreenPresenter = this.onOfferScreenPresenter.bind(this);
        this.onOfferWebcamPresenter = this.onOfferWebcamPresenter.bind(this);
        this.onOfferScreenViewer = this.onOfferScreenViewer.bind(this);
        this.onOfferWebcamViewer = this.onOfferWebcamViewer.bind(this);

        this._onIceCandidate = this._onIceCandidate.bind(this);
        this.onScreenIceCandidate = this.onScreenIceCandidate.bind(this);
        this.onWebcamIceCandidate = this.onWebcamIceCandidate.bind(this);

        this.stop = this.stop.bind(this);
        this.dispose = this.dispose.bind(this);
        this.sendMessage = this.sendMessage.bind(this);

        this.disableWebcam = this.disableWebcam.bind(this);
        this.enableWebcam = this.enableWebcam.bind(this);
        this.disableScreen = this.disableScreen.bind(this);
        this.enableScreen = this.enableScreen.bind(this);
    }

    componentDidMount() {
        this.screenVideo = document.querySelector('#Stream-screen_video');
        this.webcamVideo = document.querySelector('#Stream-webcam_video');

        this.ws = new WebSocket(`wss://localhost:4000/one2many`);
        this.ws.onmessage = (message) => {
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

    componentWillUnmount() {
        this.ws?.close();
    }

    onError(error: any): any {
        console.error(error);
        return error;
    }

    async presenter(): Promise<void> {
        if (!this.screenWebRtcPeer) {
            const mediaDevices = navigator.mediaDevices as any;
            const screenStream = await mediaDevices.getDisplayMedia({ video: true, audio: false });
            const options = {
                localVideo: this.screenVideo,
                videoStream: screenStream,
                onicecandidate: this.onScreenIceCandidate
            };

            this.screenWebRtcPeer = WebRtcPeer.WebRtcPeerSendonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                console.log('Created presenter screen endpoint');
                this.screenWebRtcPeer?.generateOffer(this.onOfferScreenPresenter);
            });
        }
        if (!this.webcamWebRtcPeer) {
            const webcamStream: MediaStream = await navigator.mediaDevices.getUserMedia({ video: true });

            const options = {
                localVideo: this.webcamVideo,
                videoStream: webcamStream,
                onicecandidate: this.onWebcamIceCandidate
            };

            this.webcamWebRtcPeer = WebRtcPeer.WebRtcPeerSendonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                console.log('Created presenter webcam endpoint');
                this.webcamWebRtcPeer?.generateOffer(this.onOfferWebcamPresenter);
            });
        }
    }

    viewer(): void {
        if (!this.screenWebRtcPeer) {
            const options = {
                remoteVideo: this.screenVideo,
                onicecandidate: this.onScreenIceCandidate
            };

            this.screenWebRtcPeer = WebRtcPeer.WebRtcPeerRecvonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                console.log('Created viewer screen endpoint');
                this.screenWebRtcPeer?.generateOffer(this.onOfferScreenViewer);
            });
        }
        if (!this.webcamWebRtcPeer) {
            const options = {
                remoteVideo: this.webcamVideo,
                onicecandidate: this.onWebcamIceCandidate
            };

            this.webcamWebRtcPeer = WebRtcPeer.WebRtcPeerRecvonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                console.log('Created viewer webcam endpoint');
                this.webcamWebRtcPeer?.generateOffer(this.onOfferWebcamViewer);
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

    _onOffer(error: any, id: 'presenter' | 'viewer', type: 'screen' | 'webcam', sdpOffer: string): void {
        if (error) return this.onError(error);
        console.log(`On offer: ${id}, ${type}`);
        this.sendMessage({ id, type, sdpOffer });
    }
    onOfferScreenPresenter(error: any, sdpOffer: string): void {
        this._onOffer(error, 'presenter', 'screen', sdpOffer);
    }
    onOfferWebcamPresenter(error: any, sdpOffer: string): void {
        this._onOffer(error, 'presenter', 'webcam', sdpOffer);
    }
    onOfferScreenViewer(error: any, sdpOffer: string): void {
        this._onOffer(error, 'viewer', 'screen', sdpOffer);
    }
    onOfferWebcamViewer(error: any, sdpOffer: string): void {
        this._onOffer(error, 'viewer', 'webcam', sdpOffer);
    }

    _onIceCandidate(type: 'screen' | 'webcam', candidate: any): void {
        console.log('Local candidate: ' + type + ' ' + JSON.stringify(candidate));

        this.sendMessage({
            id: 'onIceCandidate',
            type, candidate
        });
    }
    onScreenIceCandidate(candidate: any): void {
        this._onIceCandidate('screen', candidate);
    }
    onWebcamIceCandidate(candidate: any): void {
        this._onIceCandidate('webcam', candidate);
    }

    stop(): void {
        if (this.screenWebRtcPeer || this.webcamWebRtcPeer) {
            this.sendMessage({ id: 'stop' });
            this.dispose();
        }
    }

    dispose(): void {
        if (this.screenWebRtcPeer) {
            this.screenWebRtcPeer.dispose();
            this.screenWebRtcPeer = null;
        }
        if (this.webcamWebRtcPeer) {
            this.webcamWebRtcPeer.dispose();
            this.webcamWebRtcPeer = null;
        }
    }

    sendMessage(message: any): void {
        const jsonMessage = JSON.stringify(message);
        console.log('Sending message: ' + jsonMessage);
        this.ws?.send(jsonMessage);
    }

    disableWebcam(): void {
        this.webcamWebRtcPeer?.getLocalStream()?.getVideoTracks()
            .map((track: MediaStreamTrack) => track.enabled = false);
    }
    enableWebcam(): void {
        this.webcamWebRtcPeer?.getLocalStream()?.getVideoTracks()
            .map((track: MediaStreamTrack) => track.enabled = true);
    }

    disableScreen(): void {
        this.screenWebRtcPeer?.getLocalStream()?.getVideoTracks()
            .map((track: MediaStreamTrack) => track.enabled = false);
    }
    enableScreen(): void {
        this.screenWebRtcPeer?.getLocalStream()?.getVideoTracks()
            .map((track: MediaStreamTrack) => track.enabled = true);
    }

    render(): JSX.Element {
        return (
            <div className="kek">
                <NavBar currentItem={1}/>
                <div className="Stream-component">
                    <div className='Stream-control_buttons_group'>
                        <button id='call' onClick={this.presenter}>Presenter</button>
                        <button id='viewer' onClick={this.viewer}>Viewer</button>
                        <button id='terminate' onClick={this.stop}>Stop</button>
                        <button onClick={this.disableWebcam}>Disable Webcam</button>
                        <button onClick={this.enableWebcam}>Enable Webcam</button>
                        <button onClick={this.disableScreen}>Disable Screen</button>
                        <button onClick={this.enableScreen}>Enable Screen</button>
                    </div>

                    <video id='Stream-screen_video' autoPlay={true}></video>
                    <video id='Stream-webcam_video' autoPlay={true}></video>

                </div>
            </div>
        );
    }
}