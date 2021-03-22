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

var wss: ws.Server = new ws.Server({
    server: server,
    path: '/one2many'
});

wss.on('connection', function(ws: ws) {

    const sessionId: string = nextUniqueId();
    console.log('Connection received with sessionId ' + sessionId);
 
    ws.on('error', function(error: Error) {
        console.log('Connection ' + sessionId + ' error' + error);
        stop(sessionId);
    });
 
    ws.on('close', function() {
        console.log('Connection ' + sessionId + ' closed');
        stop(sessionId);
    });
 
    ws.on('message', function(_message: string) {
        const message = JSON.parse(_message);
        console.log('Connection ' + sessionId + ' received message ', message);

        switch (message.id) {
            case 'presenter':
                startPresenter(sessionId, ws, message.sdpOffer)
                    .then((sdpAnswer: string | undefined) => {
                        console.log('OOOOOOOOOOOOO');
                        ws.send(JSON.stringify({
                            id: 'presenterResponse',
                            response: 'accepted',
                            sdpAnswer: sdpAnswer
                        }));
                    })
                    .catch((error: string) => {
                        console.log('AAAAAAAAAAAA');
                        ws.send(JSON.stringify({
                            id: 'presenterResponse',
                            response: 'rejected',
                            message: error
                        }));
                    });
                break;
    
            case 'viewer':
                startViewer(sessionId, ws, message.sdpOffer)
                    .then((sdpAnswer: string | undefined) => {
                        ws.send(JSON.stringify({
                            id: 'viewerResponse',
                            response: 'accepted',
                            sdpAnswer: sdpAnswer
                        }));
                    })
                    .catch((error: any) => {
                        ws.send(JSON.stringify({
                            id: 'viewerResponse',
                            response: 'rejected',
                            message: error
                        }));
                    })
                break;
    
            case 'stop':
                stop(sessionId);
                break;
    
            case 'onIceCandidate':
                onIceCandidate(sessionId, message.candidate);
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
