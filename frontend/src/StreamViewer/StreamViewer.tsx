import React from 'react';
import { io, Socket } from 'socket.io-client';
import { withRouter } from 'react-router';
import { History, Location } from 'history';
import './StreamViewer.css';
import NavBar from '../NavBar/NavBar';
import Stream from '../lib/stream';
import viewersIcon from '../assets/viewers-icon.png';
import Chat from '../Chat/Chat';
import { serverAddress } from '../constants';

interface IProps {
    history: History;
    location: Location;
    match: any;
}

interface IState {
    streamIdInputValue: string;
    stream: Stream | null;
    streamViewersCount: number;
    socket: Socket | null;
    screenVideo: HTMLVideoElement | null;
    webcamVideo: HTMLVideoElement | null;
}

class StreamViewer extends React.Component<IProps, IState> {

    constructor(props: any) {
        super(props);

        this.state = {
            streamIdInputValue: '',
            stream: null,
            streamViewersCount: 0,
            socket: null,
            screenVideo: null,
            webcamVideo: null
        };

        this.startViewer = this.startViewer.bind(this);
        this.stop = this.stop.bind(this);
        this.handleStreamInputChange = this.handleStreamInputChange.bind(this);
    }

    componentWillUnmount() {
        this.state.socket?.disconnect();
        this.state.stream?.stop();
    }

    handleStreamInputChange(event: any): void {
        this.setState({streamIdInputValue: event.target.value});
    }

    async startViewer(): Promise<void> {
        if (!this.state.streamIdInputValue) { return; }
        if (this.state.stream) {
            await this.state.stream.startViewer();
        } else {
            const token: string | null = localStorage.getItem('token');
            if (!token) {
                this.props.history.push('/login');
                return;
            }
            const socket: Socket = this.state.socket || io(`wss://${serverAddress}`, { query: { token } });
            const screenVideo: HTMLVideoElement = document.querySelector('#StreamViewer-screen_video') as HTMLVideoElement;
            const webcamVideo: HTMLVideoElement = document.querySelector('#StreamViewer-webcam_video') as HTMLVideoElement;

            socket.on('connect_error', (err: Error) => {
                console.log('Socket connect error', err);
            });

            socket.on('connect', () => {
                if (screenVideo && webcamVideo) {
                    this.setState(
                        {
                            socket,
                            stream: new Stream(this.state.streamIdInputValue, socket, screenVideo, webcamVideo),
                            screenVideo,
                            webcamVideo
                        },
                        async () => {
                            await this.state.stream?.startViewer();
                        }
                    );
                } else {
                    console.error('Cannot load stream');
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
            this.setState({ stream: null, socket: null, streamIdInputValue: '' });
        } else {
            console.error('No active stream');
        }
    }

    render(): JSX.Element {
        return (
            <div className='StreamViewer-window_container'>
                <NavBar currentTab={2}/>
                <div className="StreamViewer-component">
                    <div className='StreamPresenter-main_area'>
                        <video id='StreamViewer-screen_video' autoPlay={true}></video>
                        <div className='StreamViewer-side_block'>
                            <video id='StreamViewer-webcam_video' autoPlay={true}></video>
                            <div className='StreamViewer-chat_block'>
                                { this.state.stream && this.state.socket ?
                                    <Chat socket={this.state.socket} streamId={this.state.streamIdInputValue}/> : '' }
                            </div>
                        </div>
                    </div>

                    <div className='StreamViewer-control_buttons_group'>
                        {
                            this.state.stream ?
                                <button id='StreamViewer-start_stop_button'
                                        className='common_button red_button'
                                        onClick={ this.stop }>Stop watching</button> :
                                <button id='StreamViewer-start_stop_button'
                                        disabled={!this.state.streamIdInputValue}
                                        className='common_button'
                                        onClick={ this.startViewer }>Start watching</button>
                        }
                        <div className='StreamViewer-stream_id_block'>
                            <span>Stream ID: <b>{this.state.stream ? this.state.streamIdInputValue : ''}</b></span>
                            {
                                !this.state.stream ?
                                    <input type='text' value={this.state.streamIdInputValue}
                                           onChange={this.handleStreamInputChange}
                                           readOnly={!!this.state.stream}/> : ''
                            }
                        </div>
                        {
                            this.state.stream ?
                                <div className='StreamViewer-viewers_count_block'>
                                    <img className='StreamViewer-viewers_icon' src={viewersIcon}/>
                                    <span>{ this.state.streamViewersCount }</span>
                                </div> : ''
                        }
                    </div>
                </div>
            </div>
        );
    }
}

export default withRouter(StreamViewer);