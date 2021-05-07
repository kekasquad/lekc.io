import mongoose, { Schema, PassportLocalSchema, PassportLocalModel, PassportLocalDocument } from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';

export interface User extends PassportLocalDocument  {
    login: string;
    name: string;
}

export interface UserAvatar {
    avatar: {
        data: Buffer, 
        contentType: string
    }
}

const avatarSchema = new Schema({
    data: Buffer, 
    contentType: String
});

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
        type: avatarSchema,
        select: false
    }
}) as PassportLocalSchema;

userSchema.plugin(passportLocalMongoose, {
    usernameField: 'login',
    session: false
});

interface UserModel<T extends PassportLocalDocument> extends PassportLocalModel<T> {}

export const UserModel: UserModel<User> = mongoose.model<User>('User', userSchema);
