import path from 'path';

export const PORT = process.env.PORT || 4000;
export const certDir = path.resolve('cert.dev');
export const wsUri = 'ws://localhost:8888/kurento';
export const mongoUri = 'mongodb://localhost:27017/lekcio';
