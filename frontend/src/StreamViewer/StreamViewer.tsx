import React from 'react';
import { io, Socket } from 'socket.io-client';
import { withRouter, match } from 'react-router';
import { History, Location } from 'history';
import './StreamViewer.css';
import Stream from '../lib/stream';
import viewersIcon from '../assets/viewers-icon.png';
import backButtonIcon from '../assets/back-button.png';
import Chat from '../Chat/Chat';
import { serverAddress } from '../constants';

interface IUrlParams {
    id: string;
}

interface IProps {
    history: History;
    location: Location;
    match: match<IUrlParams>;
    showNotification: (type: 'info' | 'error' | 'success', text: string, notificationTimeout?: number) => void;
    login: string;
    token: string;
}

interface IState {
    streamId: string;
    stream: Stream | null;
    streamName: string;
    streamViewersCount: number;
    socket: Socket | null;
    screenVideo: HTMLVideoElement | null;
    webcamVideo: HTMLVideoElement | null;
}

class StreamViewer extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);

        this.state = {
            streamId: this.props.match.params.id,
            stream: null,
            streamName: '',
            streamViewersCount: 0,
            socket: null,
            screenVideo: null,
            webcamVideo: null
        };

        this.stop = this.stop.bind(this);
        this.back = this.back.bind(this);
    }

    componentDidMount() {
        if (!this.state.streamId) {
            this.back();
            return;
        }
        const token: string | null = localStorage.getItem('token');
        if (!token) {
            this.props.history.push('/login');
            return;
        }
        const socket: Socket = this.state.socket || io(`wss://${serverAddress}`, { query: { token } });
        const screenVideo: HTMLVideoElement = document.querySelector('#StreamViewer-screen_video') as HTMLVideoElement;
        const webcamVideo: HTMLVideoElement = document.querySelector('#StreamViewer-webcam_video') as HTMLVideoElement;
        console.log(screenVideo, webcamVideo);

        socket.on('connect_error', (err: Error) => {
            console.log('Socket connect error', err);
        });

        socket.on('connect', () => {
            if (screenVideo && webcamVideo) {
                const stream: Stream = new Stream(this.state.streamId, socket, screenVideo, webcamVideo);
                this.setState(
                    { socket, stream, screenVideo, webcamVideo },
                    async () => {
                        await stream.startViewer();
                    }
                );
            } else {
                console.error('Cannot load stream');
            }
        });

        socket.on('streamName', (streamId: string, streamName: string) => {
            if (this.state.streamId == streamId) {
                this.setState({ streamName });
            }
        });

        socket.on('viewersCount', (viewersCount: number) => {
            this.setState({ streamViewersCount: viewersCount });
        });

        socket.on('streamStopped', () => {
            this.setState({ stream: null });
            this.props.showNotification(
                'info', 'Stream ended, you will be redirected to previous page', 4000
            );
            setTimeout(() => this.back(), 5000);
        });
    }

    componentWillUnmount() {
        this.stop();
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

    back(): void {
        this.props.history.push('/search');
    }

    render(): JSX.Element {
        return (
            <div className="StreamViewer-component">
                <div className='StreamViewer-main_area'>
                    <button className='StreamViewer-back_button round_button' onClick={this.back}>
                        <img src={backButtonIcon} alt='Back' title='Back'/>
                    </button>
                    <video id='StreamViewer-screen_video' autoPlay={true}></video>
                    <div className='StreamViewer-side_block'>
                        <video id='StreamViewer-webcam_video' autoPlay={true}></video>
                        <div className='StreamViewer-chat_block'>
                            { this.state.stream && this.state.socket ?
                                <Chat socket={this.state.socket} streamId={this.state.streamId}/> : '' }
                        </div>
                    </div>
                </div>

                { this.state.stream ?
                    <div className='StreamViewer-control_buttons_group'>
                        <div className='StreamViewer-stream_id_block'>
                            <span>Stream ID: </span>
                            <input type='text' value={this.state.streamId} readOnly={true} size={23}/>
                        </div>
                        <h2>{this.state.streamName}</h2>
                        <div className='StreamViewer-viewers_count_block'>
                            <img className='StreamViewer-viewers_icon' src={viewersIcon}/>
                            <span>{ this.state.streamViewersCount }</span>
                        </div>
                    </div> : ''
                }
            </div>
        );
    }
}

export default withRouter(StreamViewer);