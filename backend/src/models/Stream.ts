import mongoose, { Schema } from 'mongoose';

const Stream = mongoose.model(
    'Stream',
    new Schema({
        name: String,
        presenter: String,
        viewers: [String]
    })
);

export default Stream;