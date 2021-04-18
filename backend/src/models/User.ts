import mongoose, { Schema } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

const userSchema = new Schema({
    login: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String            
    }
});

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'login',
    session: false
});

const User = mongoose.model(
    'User',
    userSchema
);

export default User;