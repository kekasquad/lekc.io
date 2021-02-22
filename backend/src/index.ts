import express from 'express';
import { PORT } from './config/constants';

const app: express.Express = express();
app.use(express.json());

app.listen(PORT, (): void => {
    console.log(`Server is listening on port ${PORT}`);
});