import cors from 'cors';
import express from 'express';

import fs from 'fs';
import path from 'path';
import https from 'https';
import ws from 'ws';

import passport from 'passport';
import PassportJwt from 'passport-jwt';
import JWT from 'jsonwebtoken';

import mongoose from 'mongoose';

import { certDir, PORT, redisConfig, mongoUri, jwtConfig } from './config/constants';
import { stop, nextUniqueId, startPresenter, startViewer, onIceCandidate } from './ws-utils';
import User from './models/User';

const options = {
  cert: fs.readFileSync(path.resolve(certDir, 'cert.pem')),
  key:  fs.readFileSync(path.resolve(certDir, 'key.pem')),
};

mongoose.connect(mongoUri, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    authSource: 'admin'
}).then(() => {
    const app: express.Express = express();
    const router = express.Router();
    
    app.use(express.json());
    app.use(cors());
    app.use(passport.initialize());
    
    passport.use(User.createStrategy());
    
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());

    passport.use(new PassportJwt.Strategy(
        {
            jwtFromRequest: PassportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtConfig.secret,
            algorithms: [jwtConfig.algorihtm]
        },
        (payload: any, done: any) => {
            User.findById(payload.sub)
                .then(user => {
                    if (user) {
                        done(null, user);
                    } else {
                        done(null, false);
                    }
                }).catch(error => {
                    done(error, false);
                });
        }
    ));

    router.post(
        '/register',
        (req, res, next) => {
            const user = new User({
                login: req.body.login,
                name: req.body.name
            });
            User.register(user, req.body.password, (error: Error, user: any) => {
                if (error) {
                    next(error);
                    return;
                }
                req.user = user;
                next();
            });
        },
        (req, res) => {
            const user = req.user;
            const token = JWT.sign(
                {
                    login: user.login
                },
                jwtConfig.secret,
                {
                    expiresIn: jwtConfig.expiresIn,
                    subject: user._id.toString()
                }
            );
            res.json({ token });
        }
    );

    router.post(
        '/login',
        passport.authenticate('local', { session: false }),
        (req, res) => {
            const user = req.user;
            const token = JWT.sign(
                {
                    login: user.login
                },
                jwtConfig.secret,
                {
                    expiresIn: jwtConfig.expiresIn,
                    subject: user._id.toString()
                }
            );
            res.json({ token });
        }
    );
    
    router.get(
        '/user', 
        passport.authenticate('jwt', { session: false }),
        (req, res) => {
            if(req.user) {
                return res.status(200).json({
                    user: req.user
                });
            } else {
                return res.status(401).json({
                    error: 'User is not authenticated'
                });
            }
        }
    );

    router.put(
        '/user',
        passport.authenticate('jwt', { session: false }),
        (req, res) => {
            if(req.user) {
                var isError = false
                if (req.body.oldPassword && req.body.newPassword) {
                    console.log('changing');
                    req.user.changePassword(req.body.oldPassword, req.body.newPassword, (error: Error, user: any) => {
                        if (error) {
                            isError = true;
                            console.log(error);
                            return res.status(500).json({
                                error: 'Couldn\'t change password'
                            });
                        }
                    });
                }
                if (req.body.avatar) {
                    User.updateOne({ login: req.user.login }, { avatar: req.body.avatar }).catch((error: Error) => {
                        isError = true;
                        return res.status(500).json({
                            error: 'There is no such user'
                        });
                    });
                }
                if (isError) {
                    User.findOne({ login: req.user.login }).then((user) => {
                        return res.status(200).json({
                            user: user
                        });
                    }).catch((error: Error) => {
                        return res.status(500).json({
                            error: 'There is no such user'
                        });
                    });
                }
            } else {
                return res.status(401).json({
                    error: 'User is not authenticated'
                });
            }
        }
    )

    router.delete(
        '/user',
        passport.authenticate('jwt', { session: false }),
        (req, res) => {
            if(req.user) {
                User.deleteOne({ login: req.user.login }).then(() => {
                    return res.status(200).json({
                        status: "OK"
                    });
                }).catch((error: Error) => {
                    return res.status(500).json({
                        error: 'There is no such user'
                    });
                });
            } else {
                return res.status(401).json({
                    error: 'User is not authenticated'
                });
            }
        }
    )
    
    app.use('/', router);
    
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
}).catch((error) => {
    console.log(error);
    console.log(`Unable to connect to MongoDB on the address ${mongoUri}`);
});