import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { certDir, PORT, mongoUri } from './config/constants';
import {
    viewers, streamRooms, stopStream, stopViewer, startPresenter,
    startViewer, onPresenterIceCandidate, onViewerIceCandidate, onChatMessage
} from './ws-utils';

const options = {
    cert: fs.readFileSync(path.resolve(certDir, 'cert.pem')),
    key:  fs.readFileSync(path.resolve(certDir, 'key.pem'))
};

export let wsServer: Server;

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true, authSource: 'admin' }).then(() => {
    const app: express.Express = express();
    app.use(cors());
    app.use(express.json());

    app.get('/', (req, res) => {
        res.send('Hello World!')
    });

    const server: https.Server = https.createServer(options, app);

    wsServer = new Server(server, {
        cors: {
            origin: '*'
        }
    });

    wsServer.on('connection', async function(socket: Socket) {
        console.log(`Connection received with id: ${socket.id}`);

        socket.on('disconnect', async (reason: string) => {
            console.log(`Connection ${socket.id} disconnected with reason: ${reason}`);
            if (viewers.has(socket.id)) {
                await stopViewer(socket.id);
            } else if (streamRooms.has(socket.id)) {
                await stopStream(socket.id);
            }
        });

        socket.on('presenter', async (type: 'screen' | 'webcam', sdpOffer: string) => {
            console.log(`Connection ${socket.id} received presenter's SDP offer with type ${type}`);
            try {
                const sdpAnswer: string = await startPresenter(socket, type, sdpOffer);
                socket.emit('sdpResponse', 'accepted', type, sdpAnswer);
            } catch (error) {
                console.log(`Presenter's SDP response error: ${error}`);
                await stopStream(socket.id);
                socket.emit('sdpResponse', 'rejected', type, error);
            }
        });

        socket.on('viewer', async (streamId: string, type: 'screen' | 'webcam', sdpOffer: string) => {
            console.log(`Connection ${socket.id} received viewer's SDP offer with type ${type}`);
            try {
                const sdpAnswer: string = await startViewer(streamId, socket, type, sdpOffer);
                socket.emit('sdpResponse', 'accepted', type, sdpAnswer);
            } catch (error) {
                console.log(`Viewer's SDP response error: ${error}`);
                await stopViewer(socket.id);
                socket.emit('sdpResponse', 'rejected', type, error);
            }
        });

        socket.on('presenterIceCandidate', async (streamId: string, type: 'screen' | 'webcam', candidate: RTCIceCandidate) => {
            await onPresenterIceCandidate(streamId, socket.id, type, candidate);
        });

        socket.on('viewerIceCandidate', async (streamId: string, type: 'screen' | 'webcam', candidate: RTCIceCandidate) => {
            await onViewerIceCandidate(streamId, socket.id, type, candidate);
        });

        socket.on('sendChatMessage', (streamId: string, userName: string, message: string) => {
            onChatMessage(socket, streamId, userName, message);
        })
    });
    server.listen(PORT, (): void => {
        console.log(`Server is listening on port ${PORT}`);
    });

}).catch(() => {
    console.log(`Unable to connect to MongoDB on the address ${mongoUri}`);
})
