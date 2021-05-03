import cors from 'cors';
import express from 'express';
import fs from 'fs';
import https from 'https';
import JWT, { VerifyErrors } from 'jsonwebtoken';
import mongoose from 'mongoose';
import path from 'path';
import passport from 'passport';
import PassportJwt from 'passport-jwt';
import { Server, Socket } from 'socket.io';
import { certDir, PORT, mongoUri, jwtConfig } from './config/constants';
import {
    viewers, streamRooms, stopStream, stopViewer, startPresenter,
    startViewer, onPresenterIceCandidate, onViewerIceCandidate, onChatMessage
} from './ws-utils';
import { User, UserModel } from './models/User';

const options = {
    cert: fs.readFileSync(path.resolve(certDir, 'cert.pem')),
    key:  fs.readFileSync(path.resolve(certDir, 'key.pem'))
};

export let wsServer: Server;

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    authSource: 'admin'
}).then(() => {
    const app: express.Express = express();
    const router = express.Router();

    app.use(express.json());
    app.use(cors());
    app.use(passport.initialize());

    passport.use(UserModel.createStrategy());

    passport.serializeUser((user: Express.User, done: (err: any, id?: unknown) => void) => { UserModel.serializeUser()(user as typeof UserModel, done) });
    passport.deserializeUser(UserModel.deserializeUser());

    passport.use(new PassportJwt.Strategy(
        {
            jwtFromRequest: PassportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtConfig.secret,
            algorithms: [jwtConfig.algorihtm]
        },
        (payload: any, done: any) => {
            UserModel.findById(payload.sub)
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
            const user = new UserModel({
                login: req.body.login,
                name: req.body.name
            });
            UserModel.register(user, req.body.password, (error: Error, user: any) => {
                if (error) {
                    next(error);
                    return;
                }
                req.user = user;
                next();
            });
        },
        (req, res) => {
            const user = req.user as User;
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
            const user = req.user as User;
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
            if (req.user) {
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
            if (req.user) {
                const user = req.user as User;
                let isError = false;
                if (req.body.oldPassword && req.body.newPassword) {
                    console.log('changing');
                    user.changePassword(req.body.oldPassword, req.body.newPassword, (error: Error, updatedUser: any) => {
                        if (error) {
                            isError = true;
                            console.log(error);
                            return res.status(400).json({
                                error: 'Couldn\'t change password'
                            });
                        }
                    });
                }
                if (req.body.avatar) {
                    UserModel.updateOne({ login: user.login }, { avatar: req.body.avatar }).catch((error: Error) => {
                        isError = true;
                        return res.status(404).json({
                            error: 'There is no such user'
                        });
                    });
                }
                if (isError) {
                    UserModel.findOne({ login: user.login }).then((user) => {
                        return res.status(200).json({
                            user: user
                        });
                    }).catch((error: Error) => {
                        return res.status(404).json({
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
                const user = req.user as User;
                UserModel.deleteOne({ login: user.login }).then(() => {
                    return res.status(200).json({
                        status: "OK"
                    });
                }).catch((error: Error) => {
                    return res.status(404).json({
                        error: 'There is no such user'
                    });
                });
            } else {
                return res.status(401).json({
                    error: 'User is not authenticated'
                });
            }
        }
    );

    app.use('/', router);

    const server: https.Server = https.createServer(options, app);

    wsServer = new Server(server, {
        cors: {
            origin: '*'
        }
    });

    wsServer.use((socket: Socket, next: (err?: any) => void) => {
        if (socket.handshake.query?.token && typeof socket.handshake.query.token === 'string'){
            JWT.verify(
                socket.handshake.query.token,
                jwtConfig.secret,
                (err: VerifyErrors | null) => {
                    if (err) {
                        return next(new Error('Authentication error'));
                    }
                    next();
                }
            );
        }
        else {
            next(new Error('Authentication error'));
        }
    }).on('connection', async (socket: Socket) => {
        console.log(`Connection received with id: ${socket.id}`);
        let userId: string = '';
        if (socket.handshake.query?.token && typeof socket.handshake.query.token === 'string') {
            const decoded = JWT.decode(socket.handshake.query.token);
            userId = typeof decoded === 'string' ? JSON.parse(decoded).sub : decoded?.sub;
            if (!userId) {
                socket.disconnect();
                return
            }
        }

        UserModel.findById(userId).exec().then(() => {
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
                    const sdpAnswer: string = await startPresenter(socket, userId, type, sdpOffer);
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
                    const sdpAnswer: string = await startViewer(streamId, socket, userId, type, sdpOffer);
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
        }).catch(() => {
            console.log('User not found');
            socket.disconnect();
        });
    });
    server.listen(PORT, (): void => {
        console.log(`Server is listening on port ${PORT}`);
    });
}).catch((error) => {
    console.log(error);
    console.log(`Unable to connect to MongoDB on the address ${mongoUri}`);
});