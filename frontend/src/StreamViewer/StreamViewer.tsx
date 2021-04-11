import React from 'react';
import './StreamViewer.css';
import { WebRtcPeer } from 'kurento-utils';
import NavBar from '../NavBar/NavBar';
import Stream from "../lib/stream";

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
            const screenVideo: HTMLVideoElement = document.querySelector('#Stream-screen_video') as HTMLVideoElement;
            const webcamVideo: HTMLVideoElement = document.querySelector('#Stream-webcam_video') as HTMLVideoElement;

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
                <div className="Stream-component">
                    <div className='Stream-control_buttons_group'>
                        {
                            this.state.stream ?
                                <button onClick={ this.stop }>Stop watching</button> :
                                <button onClick={ this.startViewer }>Start watching</button>
                        }
                    </div>

                    <video id='Stream-screen_video' autoPlay={true}></video>
                    <video id='Stream-webcam_video' autoPlay={true}></video>

                </div>
            </div>
        );
    }
}