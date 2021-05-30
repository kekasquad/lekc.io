import path from 'path';

export const PORT = process.env.PORT || 4000;
export const certDir = path.resolve('cert.dev');
export const wsUri = 'ws://127.0.0.1:8888/kurento';
export const mongoUri = 'mongodb://lekcio:s3cret_mongo@127.0.0.1:27017/lekcio';
export const jwtConfig = {
    secret: 'Gszh0e4MCCseLY0umcmlWE32GcymUUKExKrNTAnejmHwbg4NaOU8oIs+x+PWDdBc',
    algorihtm: 'HS256',
    expiresIn: '7 days'
};
