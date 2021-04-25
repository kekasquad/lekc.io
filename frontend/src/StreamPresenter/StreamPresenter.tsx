import React from 'react';
import { io, Socket } from 'socket.io-client';
import { withRouter } from 'react-router';
import { History, Location } from 'history';
import './StreamPresenter.css';
import NavBar from '../NavBar/NavBar';
import Stream from '../lib/stream';
import webcamTurnButton from '../assets/webcam-turn-button.png';
import screenTurnButton from '../assets/screen-turn-button.png';
import microTurnButton from '../assets/micro-turn-button.png';
import viewersIcon from '../assets/viewers-icon.png';
import Chat from '../Chat/Chat';
import { serverAddress } from '../constants';

interface IProps {
    history: History;
    location: Location;
    match: any;
}

interface IState {
    streamId: string;
    stream: Stream | null;
    streamViewersCount: number;
    socket: Socket | null;
    screenVideo: HTMLVideoElement | null;
    webcamVideo: HTMLVideoElement | null;
    screenEnabled: boolean;
    webcamEnabled: boolean;
    audioEnabled: boolean;
}

class StreamPresenter extends React.Component<IProps, IState> {

    constructor(props: any) {
        super(props);

        this.state = {
            streamId: '',
            stream: null,
            streamViewersCount: 0,
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
            const token: string | null = localStorage.getItem('token');
            if (!token) {
                this.props.history.push('/login');
                return;
            }
            const socket: Socket = this.state.socket || io(`wss://${serverAddress}`, { query: { token } });
            const screenVideo: HTMLVideoElement =
                document.querySelector('#StreamPresenter-screen_video') as HTMLVideoElement;
            const webcamVideo: HTMLVideoElement =
                document.querySelector('#StreamPresenter-webcam_video') as HTMLVideoElement;

            socket.on('connect_error', (err: Error) => {
                console.log('Socket connect error', err);
            });

            socket.on('connect', () => {
                if (screenVideo && webcamVideo) {
                    this.setState(
                        {
                            streamId: socket.id,
                            socket,
                            stream: new Stream(socket.id, socket, screenVideo, webcamVideo),
                            screenVideo,
                            webcamVideo
                        },
                        async () => {
                            console.log(this.state);
                            await this.state.stream?.startPresenter()
                        }
                    );
                } else {
                    console.error('Cannot start stream');
                }
            });

            socket.on('viewersCount', (viewersCount: number) => {
                this.setState({ streamViewersCount: viewersCount });
            });
        }
    }

    stop(): void {
        if (this.state.stream) {
            this.state.stream.stop();
            this.state.socket?.disconnect();
            this.setState({ stream: null, socket: null, streamId: '', });
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
            <div className='StreamPresenter-window_container'>
                <NavBar currentItem={1}/>
                <div className="StreamPresenter-component">
                    <div className='StreamPresenter-main_area'>
                        <video id='StreamPresenter-screen_video' autoPlay={true}></video>
                        <div className='StreamPresenter-side_block'>
                            <video id='StreamPresenter-webcam_video' autoPlay={true}></video>
                            <div className='StreamPresenter-chat_block'>
                                { this.state.stream && this.state.socket ?
                                        <Chat socket={this.state.socket} streamId={this.state.streamId}/> : '' }
                            </div>
                        </div>
                    </div>

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
                        {
                            this.state.stream ?
                                <div className='StreamPresenter-stream_id_block'>
                                    <span>Stream ID: </span>
                                    <input type='text' value={this.state.streamId} readOnly={true} />
                                </div> : ''
                        }
                        {
                            this.state.stream ?
                                <div className='StreamPresenter-viewers_count_block'>
                                    <img className='StreamPresenter-viewers_icon' src={viewersIcon}/>
                                    <span>{ this.state.streamViewersCount }</span>
                                </div> : ''
                        }
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(StreamPresenter);