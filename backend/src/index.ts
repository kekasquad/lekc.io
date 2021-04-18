import cors from 'cors';
import express from 'express';
import session from 'express-session';

import fs from 'fs';
import path from 'path';
import https from 'https';
import ws from 'ws';

import passport from 'passport';
import PassportJwt from 'passport-jwt';
import JWT from 'jsonwebtoken';

import mongoose from 'mongoose';
import redisConnect from 'connect-redis';
import redis from 'redis';

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
    const RedisStore = redisConnect(session);
    const redisClient = redis.createClient(redisConfig.url);
    const app: express.Express = express();
    const router = express.Router();
    
    app.use(express.json());
    app.use(cors());
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(session({
        store: new RedisStore({
            client: redisClient
        }),
        secret: redisConfig.secret,
        resave: false,
        saveUninitialized: false
    }));
    
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
            console.log('THE ONLY ONE REGISTER ON THIS WILD SERVER');
            const user = new User({
                login: req.body.login,
                name: req.body.name
            });
            User.register(user, req.body.password, (error: Error, user: any) => {
                if (error) {
                    console.log('YOU ARE A WEAKLING');
                    next(error);
                    return;
                }
                console.log('YOU KINDA GOOD, ENTER');
                req.user = user;
                next();
            });
        },
        (req, res) => {
            console.log('ARE YOU HERE?');
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
            console.log('ARE YOU HERE?');
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
                    user: req.user,
                    authenticated: true
                });
            } else {
                return res.status(401).json({
                    error: 'User is not authenticated',
                    authenticated: false
                });
            }
        }
    );
    
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