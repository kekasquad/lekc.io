import React from 'react';
import { io, Socket } from 'socket.io-client';
import './StreamViewer.css';
import NavBar from '../NavBar/NavBar';
import Stream from '../lib/stream';
import streamScreenPlaceholder from '../assets/stream-screen-placeholder.png';
import streamWebcamPlaceholder from '../assets/stream-webcam-placeholder.png';
import viewersIcon from '../assets/viewers-icon.png';
import Chat from '../Chat/Chat';

interface IProps {
    [key: string]: any
}

interface IState {
    streamIdInputValue: string;
    stream: Stream | null;
    streamViewersCount: number;
    socket: Socket | null;
    screenVideo: HTMLVideoElement | null;
    webcamVideo: HTMLVideoElement | null;
}

export default class StreamViewer extends React.Component<IProps, IState> {


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
            const socket: Socket = this.state.socket || io(`wss://localhost:4000`);
            const screenVideo: HTMLVideoElement = document.querySelector('#StreamViewer-screen_video') as HTMLVideoElement;
            const webcamVideo: HTMLVideoElement = document.querySelector('#StreamViewer-webcam_video') as HTMLVideoElement;

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
            <div className="kek">
                <NavBar currentItem={2}/>
                <div className="StreamViewer-component">
                    <video id='StreamViewer-screen_video' autoPlay={true} poster={streamScreenPlaceholder}></video>
                    <div>
                        <video id='StreamViewer-webcam_video' autoPlay={true} poster={streamWebcamPlaceholder}></video>
                        {
                            this.state.stream && this.state.socket ?
                                <div className='StreamViewer-chat_block'>
                                    <Chat socket={this.state.socket} streamId={this.state.streamIdInputValue}/>
                                </div> : ''
                        }
                    </div>

                    <div className='StreamViewer-control_buttons_group'>
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
                                <button className='common_button red_button'
                                        onClick={ this.stop }>Stop watching</button> :
                                <button disabled={!this.state.streamIdInputValue}
                                        className='common_button'
                                        onClick={ this.startViewer }>Start watching</button>
                        }
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