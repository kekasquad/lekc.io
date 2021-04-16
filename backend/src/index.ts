import cors from 'cors';
import express from 'express';
import session from 'express-session';

import fs from 'fs';
import path from 'path';
import https from 'https';
import ws from 'ws';

import passport from 'passport';
import local from 'passport-local';

import mongoose from 'mongoose';
import redis from 'connect-redis';

import { certDir, PORT, redisConfig, mongoUri } from './config/constants';
import { stop, nextUniqueId, startPresenter, startViewer, onIceCandidate } from './ws-utils';
import User from './models/User';

const options = {
  cert: fs.readFileSync(path.resolve(certDir, 'cert.pem')),
  key:  fs.readFileSync(path.resolve(certDir, 'key.pem')),
};

mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    const RedisStore = redis(session);
    const LocalStrategy = local.Strategy;
    const app: express.Express = express();
    
    app.use(express.json());
    app.use(cors());
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(session({
        store: new RedisStore({
            url: redisConfig.url
        }),
        secret: redisConfig.secret,
        resave: false,
        saveUninitialized: false
    }));

    passport.use(new LocalStrategy(
        (username, password, done) => {
          User.findOne({ username: username }, (err: Error, user: any) => {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            if (!user.verifyPassword(password)) { return done(null, false); }
            return done(null, user);
          });
        }
    ));

    app.post('/login',
        passport.authenticate('local', { failureRedirect: '/login' }),
        (req, res) => {
            res.redirect('/');
        }
    )
    
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
}).catch(() => {
    console.log(`Unable to connect to MongoDB on the address ${mongoUri}`);
});