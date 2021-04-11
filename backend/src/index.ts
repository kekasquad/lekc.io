import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import ws from 'ws';
import { certDir, PORT } from './config/constants';
import { stop, nextUniqueId, startPresenter, startViewer, onIceCandidate } from './ws-utils';

const options = {
  cert: fs.readFileSync(path.resolve(certDir, 'cert.pem')),
  key:  fs.readFileSync(path.resolve(certDir, 'key.pem')),
};

const app: express.Express = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World!')
});

const server: https.Server = https.createServer(options, app).listen(PORT, (): void => {
    console.log(`Server is listening on port ${PORT}`);
});

const wss: ws.Server = new ws.Server({
    server: server,
    path: '/one2many'
}, () => { console.log('WS started') });

wss.on('connection', async function(ws: ws) {

    const sessionId: string = nextUniqueId();
    console.log('Connection received with sessionId ' + sessionId);
 
    ws.on('error', async function(error: Error) {
        console.log('Connection ' + sessionId + ' error' + error);
        await stop(sessionId);
    });
 
    ws.on('close', async function() {
        console.log('Connection ' + sessionId + ' closed');
        await stop(sessionId);
    });
 
    ws.on('message', async function(_message: string) {
        const message = JSON.parse(_message);
        console.log('Connection ' + sessionId + ' received message ', message);

        switch (message.id) {
            case 'presenter':
                try {
                    const sdpAnswer: string = await startPresenter(sessionId, ws, message.type, message.sdpOffer);
                    ws.send(JSON.stringify({
                        id: 'sdpResponse',
                        type: message.type,
                        response: 'accepted',
                        sdpAnswer: sdpAnswer
                    }));
                    break;
                }
                catch (error) {
                    console.log(error);
                    await stop(sessionId);
                    ws.send(JSON.stringify({
                        id: 'sdpResponse',
                        type: message.type,
                        response: 'rejected',
                        message: error
                    }));
                    break;
                }
            case 'viewer':
                try {
                    const sdpAnswer: string = await startViewer(sessionId, ws, message.type, message.sdpOffer);
                    ws.send(JSON.stringify({
                        id: 'sdpResponse',
                        type: message.type,
                        response: 'accepted',
                        sdpAnswer: sdpAnswer
                    }));
                    break;
                }
                catch (error) {
                    console.log(error);
                    await stop(sessionId);
                    ws.send(JSON.stringify({
                        id: 'sdpResponse',
                        type: message.type,
                        response: 'rejected',
                        message: error
                    }));
                    break;
                }
    
            case 'stop':
                await stop(sessionId);
                break;
    
            case 'onIceCandidate':
                await onIceCandidate(sessionId, message.type, message.candidate);
                break;
    
            default:
                ws.send(JSON.stringify({
                    id: 'error',
                    message: 'Invalid message ' + message
                }));
                break;
        }
    });
});
