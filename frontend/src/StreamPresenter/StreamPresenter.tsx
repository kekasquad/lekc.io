import React from 'react';
import { io, Socket } from 'socket.io-client';
import './StreamPresenter.css';
import NavBar from '../NavBar/NavBar';
import Stream from '../lib/stream';
import streamScreenPlaceholder from '../assets/stream-screen-placeholder.png';
import streamWebcamPlaceholder from '../assets/stream-webcam-placeholder.png';
import webcamTurnButton from '../assets/webcam-turn-button.png';
import screenTurnButton from '../assets/screen-turn-button.png';
import microTurnButton from '../assets/micro-turn-button.png';

interface IProps {
    [key: string]: any
}

interface IState {
    stream: Stream | null;
    socket: Socket | null;
    screenVideo: HTMLVideoElement | null;
    webcamVideo: HTMLVideoElement | null;
    screenEnabled: boolean;
    webcamEnabled: boolean;
    audioEnabled: boolean;
}

export default class StreamPresenter extends React.Component<IProps, IState> {

    constructor(props: any) {
        super(props);

        this.state = {
            stream: null,
            socket: null,
            screenVideo: null,
            webcamVideo: null,
            screenEnabled: true,
            webcamEnabled: true,
            audioEnabled: true
        };

        this.startPresenter = this.startPresenter.bind(this);
        this.stop = this.stop.bind(this);
        this.changeWebcamMode = this.changeWebcamMode.bind(this);
        this.changeScreenMode = this.changeScreenMode.bind(this);
        this.changeAudioMode = this.changeAudioMode.bind(this);
    }

    componentWillUnmount() {
        this.state.socket?.disconnect();
        this.state.stream?.stop();
    }

    async startPresenter(): Promise<void> {
        if (this.state.stream) {
            await this.state.stream.startPresenter();
        } else {
            const socket: Socket = this.state.socket || io(`wss://localhost:4000`);
            const screenVideo: HTMLVideoElement =
                document.querySelector('#StreamPresenter-screen_video') as HTMLVideoElement;
            const webcamVideo: HTMLVideoElement =
                document.querySelector('#StreamPresenter-webcam_video') as HTMLVideoElement;

            if (screenVideo && webcamVideo) {
                this.setState(
                    { socket, stream: new Stream(socket.id, socket, screenVideo, webcamVideo), screenVideo, webcamVideo },
                    async () => {
                        await this.state.stream?.startPresenter()
                    }
                );
            } else {
                console.error('Cannot start stream');
            }
        }
    }

    stop(): void {
        if (this.state.stream) {
            this.state.stream.stop();
            this.state.socket?.disconnect();
            this.setState({ stream: null, socket: null });
        } else {
            console.error('No active stream');
        }
    }

    changeWebcamMode(): void {
        if (this.state.stream) {
            this.state.stream.changeWebcamMode();
            this.setState({ webcamEnabled: !this.state.webcamEnabled });
        } else {
            console.error('No active stream');
        }
    }

    changeScreenMode(): void {
        if (this.state.stream) {
            this.state.stream.changeScreenMode();
            this.setState({ screenEnabled: !this.state.screenEnabled });
        } else {
            console.error('No active stream');
        }
    }

    changeAudioMode(): void {
        if (this.state.stream) {
            this.state.stream.changeAudioMode();
            this.setState({ audioEnabled: !this.state.audioEnabled });
        } else {
            console.error('No active stream');
        }
    }

    render(): JSX.Element {
        return (
            <div className="kek">
                <NavBar currentItem={1}/>
                <div className="StreamPresenter-component">
                    <video id='StreamPresenter-screen_video' autoPlay={true} poster={streamScreenPlaceholder}></video>
                    <video id='StreamPresenter-webcam_video' autoPlay={true} poster={streamWebcamPlaceholder}></video>

                    <div className='StreamPresenter-control_buttons_group'>
                        {
                            this.state.stream ?
                                <button className='common_button red_button' onClick={ this.stop }>Stop presenting</button> :
                                <button className='common_button' onClick={ this.startPresenter }>Start presenting</button>
                        }
                        {
                            this.state.stream ?
                                <button className={ `round_button ${this.state.webcamEnabled ? 'green_button' : 'red_button'}` }
                                        onClick={ this.changeWebcamMode }>
                                    <img src={webcamTurnButton} alt='Turn on/off webcam'/>
                                </button> : ''
                        }
                        {
                            this.state.stream ?
                                <button className={ `round_button ${this.state.screenEnabled ? 'green_button' : 'red_button'}` }
                                        onClick={ this.changeScreenMode }>
                                    <img src={screenTurnButton} alt='Turn on/off screen sharing'/>
                                </button> : ''
                        }
                        {
                            this.state.stream ?
                                <button className={ `round_button ${this.state.audioEnabled ? 'green_button' : 'red_button'}` }
                                        onClick={ this.changeAudioMode }>
                                    <img src={microTurnButton} alt='Turn on/off micro'/>
                                </button> : ''
                        }
                    </div>
                    {
                        this.state.socket ?
                            <input type='text' value={this.state.socket?.id} readOnly={true} /> : ''
                    }
                </div>
            </div>
        );
    }
}