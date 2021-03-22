import path from 'path';

export const PORT = process.env.PORT || 4000;
export const certDir = path.resolve('cert.dev');
export const wsUri = 'wss://localhost:8433/kurento';
