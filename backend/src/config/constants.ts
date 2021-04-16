import path from 'path';

export const PORT = process.env.PORT || 4000;
export const certDir = path.resolve('cert.dev');
export const wsUri = 'ws://localhost:8888/kurento';
export const redisConfig = {
    url: process.env.REDIS_STORE_URI || "",
    secret: process.env.REDIS_STORE_SECRET || ""
};
export const mongoUri = '0.0.0.0:27017';