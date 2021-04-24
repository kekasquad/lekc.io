import mongoose, { Schema, PassportLocalSchema, PassportLocalModel, PassportLocalDocument } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

export interface User extends PassportLocalDocument  {
    login: string;
    name: string;
    avatar: string;
}

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
}) as PassportLocalSchema;

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'login',
    session: false
});

interface UserModel<T extends PassportLocalDocument> extends PassportLocalModel<T> {}

export const UserModel: UserModel<User> = mongoose.model<User>('User', userSchema);
