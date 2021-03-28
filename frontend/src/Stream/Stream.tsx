import React from 'react';
import './Stream.css';
import { WebRtcPeer } from 'kurento-utils';

export default class Stream extends React.Component {

    ws: WebSocket | undefined;
    webRtcPeer: any;
    video: any;

    constructor(props: any) {
        super(props);

        this.onError = this.onError.bind(this);
        this.presenterResponse = this.presenterResponse.bind(this);
        this.viewerResponse = this.viewerResponse.bind(this);
        this.presenter = this.presenter.bind(this);
        this.onOfferPresenter = this.onOfferPresenter.bind(this);
        this.viewer = this.viewer.bind(this);
        this.onOfferViewer = this.onOfferViewer.bind(this);
        this.onIceCandidate = this.onIceCandidate.bind(this);
        this.stop = this.stop.bind(this);
        this.dispose = this.dispose.bind(this);
        this.sendMessage = this.sendMessage.bind(this);
    }

    componentDidMount() {
        this.video = document.querySelector('#Stream-video');

        this.ws = new WebSocket(`wss://localhost:4000/one2many`);
        this.ws.onmessage = (message) => {
            const parsedMessage = JSON.parse(message.data);
            console.log('Received message: ' + message.data);

            switch (parsedMessage.id) {
                case 'presenterResponse':
                    this.presenterResponse(parsedMessage);
                    break;
                case 'viewerResponse':
                    this.viewerResponse(parsedMessage);
                    break;
                case 'stopCommunication':
                    this.dispose();
                    break;
                case 'iceCandidate':
                    this.webRtcPeer.addIceCandidate(parsedMessage.candidate)
                    break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
        }
    }

    componentWillUnmount() {
        this.ws?.close();
    }

    onError(error: any) {
        console.error(error);
        return error;
    }

    presenterResponse(message: any): void {
        if (message.response != 'accepted') {
            const errorMsg = message.message ? message.message : 'Unknow error';
            console.warn('Call not accepted for the following reason: ' + errorMsg);
            this.dispose();
        } else {
            this.webRtcPeer.processAnswer(message.sdpAnswer);
        }
    }

    viewerResponse(message: any) {
        if (message.response != 'accepted') {
            const errorMsg = message.message ? message.message : 'Unknow error';
            console.warn('Call not accepted for the following reason: ' + errorMsg);
            this.dispose();
        } else {
            this.webRtcPeer.processAnswer(message.sdpAnswer);
        }
    }

    presenter() {
        if (!this.webRtcPeer) {

            const options = {
                localVideo: this.video,
                onicecandidate: this.onIceCandidate
            }

            this.webRtcPeer = WebRtcPeer.WebRtcPeerSendonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                this.webRtcPeer.generateOffer(this.onOfferPresenter);
            });
        }
    }

    onOfferPresenter(error: any, offerSdp: any) {
        if (error) return this.onError(error);
        const message = {
            id: 'presenter',
            sdpOffer: offerSdp
        };
        this.sendMessage(message);
    }

    viewer() {
        if (!this.webRtcPeer) {

            const options = {
                remoteVideo: this.video,
                onicecandidate: this.onIceCandidate
            }

            this.webRtcPeer = WebRtcPeer.WebRtcPeerRecvonly(options, (error) => {
                if (error) {
                    return this.onError(error);
                }
                this.webRtcPeer.generateOffer(this.onOfferViewer);
            });
        }
    }

    onOfferViewer(error: any, offerSdp: any) {
        if (error) return this.onError(error)

        const message = {
            id: 'viewer',
            sdpOffer: offerSdp
        }
        this.sendMessage(message);
    }

    onIceCandidate(candidate: any) {
        console.log('Local candidate' + JSON.stringify(candidate));

        const message = {
            id: 'onIceCandidate',
            candidate: candidate
        }
        this.sendMessage(message);
    }

    stop() {
        if (this.webRtcPeer) {
            var message = {
                    id: 'stop'
            }
            this.sendMessage(message);
            this.dispose();
        }
    }

    dispose() {
        if (this.webRtcPeer) {
            this.webRtcPeer.dispose();
            this.webRtcPeer = null;
        }
    }

    sendMessage(message: any) {
        const jsonMessage = JSON.stringify(message);
        console.log('Sending message: ' + jsonMessage);
        this.ws?.send(jsonMessage);
    }

    render(): JSX.Element {
        return (
            <div className="Stream-component">
                <div className='Stream-control_buttons_group'>
                    <button id='call' onClick={this.presenter}>Presenter</button>
                    <button id='viewer' onClick={this.viewer}>Viewer</button>
                    <button id='terminate' onClick={this.stop}>Stop</button>
                </div>

                <video id='Stream-video' autoPlay={true}></video>

            </div>
        );
    }
}