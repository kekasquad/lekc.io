import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { certDir, PORT, mongoUri } from './config/constants';
import { stop, nextUniqueId, startPresenter, startViewer, onIceCandidate } from './ws-utils';

const options = {
    cert: fs.readFileSync(path.resolve(certDir, 'cert.pem')),
    key:  fs.readFileSync(path.resolve(certDir, 'key.pem'))
};

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    const app: express.Express = express();
    app.use(cors());
    app.use(express.json());

    app.get('/', (req, res) => {
        res.send('Hello World!')
    });

    const server: https.Server = https.createServer(options, app);

    const wsServer: Server = new Server(server, {
        cors: {
            origin: '*'
        }
    });

    wsServer.on('connection', async function(socket: Socket) {

        const sessionId: string = nextUniqueId();
        console.log(`Connection received with sessionId: ${sessionId}`);

        socket.on('disconnect', async function(reason: string) {
            console.log(`Connection ${sessionId} disconnected with reason: ${reason}`);
            await stop(sessionId);
        });

        socket.on('presenter', async (type: 'screen' | 'webcam', sdpOffer: string) => {
            console.log(`Connection ${sessionId} received presenter's SDP offer with type ${type}`);
            try {
                const sdpAnswer: string = await startPresenter(sessionId, socket, type, sdpOffer);
                socket.emit('sdpResponse', 'accepted', type, sdpAnswer);
            } catch (error) {
                console.log(`Presenter's SDP response error: ${error}`);
                await stop(sessionId);
                socket.emit('sdpResponse', 'rejected', type, error);
            }
        });

        socket.on('viewer', async (type: 'screen' | 'webcam', sdpOffer: string) => {
            console.log(`Connection ${sessionId} received viewer's SDP offer with type ${type}`);
            try {
                const sdpAnswer: string = await startViewer(sessionId, socket, type, sdpOffer);
                socket.emit('sdpResponse', 'accepted', type, sdpAnswer);
            } catch (error) {
                console.log(`Viewer's SDP response error: ${error}`);
                await stop(sessionId);
                socket.emit('sdpResponse', 'rejected', type, error);
            }
        });

        socket.on('iceCandidate', async (type: 'screen' | 'webcam', candidate: RTCIceCandidate) => {
            await onIceCandidate(sessionId, type, candidate);
        });
    });
    server.listen(PORT, (): void => {
        console.log(`Server is listening on port ${PORT}`);
    });

}).catch(() => {
    console.log(`Unable to connect to MongoDB on the address ${mongoUri}`);
})
