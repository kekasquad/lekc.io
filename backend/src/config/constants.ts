import path from 'path';

export const PORT = process.env.PORT || 4000;
export const certDir = path.resolve('cert.dev');
export const wsUri = 'ws://localhost:8888/kurento';
export const redisConfig = {
    url: 'redis://localhost:6379/',
    secret: 'kappakeepo'
};
export const mongoUri = 'mongodb://lekcio:s3cret_mongo@localhost:27017/lekcio';
export const jwtConfig = {
    secret: 'Gszh0e4MCCseLY0umcmlWE32GcymUUKExKrNTAnejmHwbg4NaOU8oIs+x+PWDdBc',
    algorihtm: 'HS256',
    expiresIn: '7 days'
};