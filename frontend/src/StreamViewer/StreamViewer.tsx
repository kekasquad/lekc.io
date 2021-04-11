import React from 'react';
import './StreamViewer.css';
import NavBar from '../NavBar/NavBar';
import Stream from '../lib/stream';
import streamScreenPlaceholder from '../assets/stream-screen-placeholder.png';
import streamWebcamPlaceholder from '../assets/stream-webcam-placeholder.png';

interface IProps {
    [key: string]: any
}

interface IState {
    stream: Stream | null;
    ws: WebSocket | null;
    screenVideo: HTMLVideoElement | null;
    webcamVideo: HTMLVideoElement | null;
}

export default class StreamViewer extends React.Component<IProps, IState> {


    constructor(props: any) {
        super(props);

        this.state = {
            stream: null,
            ws: null,
            screenVideo: null,
            webcamVideo: null
        };

        this.startViewer = this.startViewer.bind(this);
        this.stop = this.stop.bind(this);
    }

    componentWillUnmount() {
        this.state.ws?.close();
        this.state.stream?.stop();
    }

    async startViewer(): Promise<void> {
        if (this.state.stream) {
            await this.state.stream.startViewer();
        } else {
            const ws = this.state.ws || new WebSocket(`wss://localhost:4000/one2many`);
            const screenVideo: HTMLVideoElement = document.querySelector('#StreamViewer-screen_video') as HTMLVideoElement;
            const webcamVideo: HTMLVideoElement = document.querySelector('#StreamViewer-webcam_video') as HTMLVideoElement;

            if (screenVideo && webcamVideo) {
                this.setState(
                    { ws, stream: new Stream(ws, screenVideo, webcamVideo), screenVideo, webcamVideo },
                    async () => {
                        await this.state.stream?.startViewer()
                    }
                );
            } else {
                console.error('Cannot load stream');
            }
        }
    }

    stop(): void {
        if (this.state.stream) {
            this.state.stream.stop();
            this.state.ws?.close();
            this.setState({ stream: null, ws: null });
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
                    <video id='StreamViewer-webcam_video' autoPlay={true} poster={streamWebcamPlaceholder}></video>

                    <div className='StreamViewer-control_buttons_group'>
                        {
                            this.state.stream ?
                                <button className='common_button red_button' onClick={ this.stop }>Stop watching</button> :
                                <button className='common_button' onClick={ this.startViewer }>Start watching</button>
                        }
                    </div>
                </div>
            </div>
        );
    }
}