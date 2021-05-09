import cors from 'cors';
import express from 'express';
import fs from 'fs';
import https from 'https';
import JWT, { VerifyErrors } from 'jsonwebtoken';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import passport from 'passport';
import PassportJwt from 'passport-jwt';
import { Server, Socket } from 'socket.io';
import { certDir, PORT, mongoUri, jwtConfig } from './config/constants';
import {
    viewers, streamRooms, stopStream, stopViewer, startPresenter, changeStreamName,
    startViewer, onPresenterIceCandidate, onViewerIceCandidate, onChatMessage,
    Stream
} from './ws-utils';
import { User, UserAvatar, UserModel } from './models/User';

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
    const upload = multer();
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
                    console.log(error);
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
        '/user/password',
        passport.authenticate('jwt', { session: false }),
        (req, res) => {
            if (req.user) {
                const user = req.user as User;
                user.changePassword(req.body.oldPassword, req.body.newPassword, (error: Error, updatedUser: any) => {
                    if (error) {
                        return res.status(400).json({
                            error: 'Couldn\'t change password'
                        });
                    } else {
                        return res.status(200).json({
                            user: updatedUser
                        });
                    }
                });
            } else {
                return res.status(401).json({
                    error: 'User is not authenticated'
                });
            }
        }
    );

    router.get(
        '/user/:id',
        passport.authenticate('jwt', { session: false }),
        (req, res) => {
            if (req.user) {
                UserModel.findById(req.params.id).exec()
                    .then((user: User | null) => {
                        if (!user) {
                            return res.status(404).json({
                                error: 'User not found'
                            });
                        }
                        return res.status(200).json({ user });
                    })
                    .catch(() => res.status(404).json({
                        error: 'User not found'
                    }));
            } else {
                return res.status(401).json({
                    error: 'User is not authenticated'
                });
            }
        }
    );

    router.get(
        '/user/:login/avatar',
        (req, res) => {
            UserModel.findOne({ login: req.params.login })
                .select('avatar')
                .exec()
                .then((userAvatar: any) => {
                    console.log(userAvatar);
                    if (userAvatar.avatar) {
                        const avatar = userAvatar.avatar as UserAvatar;
                        res.contentType(avatar.contentType);
                        return res.status(200).set('Content-Type', ).send(avatar.data);
                    } else {
                        return res.redirect('https://static-cdn.jtvnw.net/jtv_user_pictures/fc144fea-e5b3-4ee6-bb38-60784be23877-profile_image-300x300.png');
                    }
                })
                .catch((err: Error) => {
                    console.log(err);   
                    return res.status(404).json({error: 'User not found'})
                });
        }
    );

    router.put(
        '/user/avatar',
        passport.authenticate('jwt', { session: false }),
        upload.single("image"),
        (req, res) => {
            if (req.user) {
                const user = req.user as User;
                UserModel.updateOne(
                    { login: user.login },
                    { avatar: {
                        data: req.file.buffer,
                        contentType: req.file.mimetype
                    } },
                    { },
                    (error: Error, docs: any) => {
                        if (error) {
                            return res.status(400).json({
                                error: 'Error changing avatar'
                            });
                        }
                        return res.status(200).json({
                            user: user
                        });
                    }
                );
            } else {
                return res.status(401).json({
                    error: 'User is not authenticated'
                });
            }
        }
    );

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

    router.get(
        '/streams',
        passport.authenticate('jwt', { session: false }),
        (req, res) => {
            if (req.user) {
                const response = Array.from(streamRooms.values()).map((stream: Stream) => {
                    return {
                        id: stream.id,
                        name: stream.name,
                        presenterId: stream.presenter.userId,
                        viewersCount: stream.viewers.size
                    }
                }).sort((el1, el2) => el2.viewersCount - el1.viewersCount);
                return res.status(200).json(
                    (req.query.limit && !isNaN(+req.query.limit)) ? response.slice(0, +req.query.limit) : response
                );
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

        UserModel.findById(userId).exec().then((user: User | null) => {
            if (!user) {
                throw 'User not found';
            }

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
            });

            socket.on('changeStreamName', (streamId: string, streamName: string) => {
                changeStreamName(streamId, streamName, user);
            });
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