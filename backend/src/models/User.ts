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
    },
    avatar: {
        type: String,
        default: 'https://static-cdn.jtvnw.net/jtv_user_pictures/fc144fea-e5b3-4ee6-bb38-60784be23877-profile_image-300x300.png'
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