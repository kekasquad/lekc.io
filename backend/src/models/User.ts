import mongoose, { Schema } from 'mongoose';

const User = mongoose.model(
    'User',
    new Schema({
        login:    String,
        name:     String,
        password: String
    })
);

export default User;