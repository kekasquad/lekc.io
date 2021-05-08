import React from 'react'; 
import './Profile.css';
import NavBar from '../NavBar/NavBar';
import DragAndDrop from '../DragAndDrop/DragAndDrop';
import { FORM_ERROR_MESSAGES, serverAddress } from '../constants';

interface IState {
    isLoading?: boolean;
    loadingError?: Error;
    profile?: {
        fullName?: string;
        nickname?: string;
        avatar?: string;
    };
    oldPassword?: string;
    newPassword?: string;
    newPasswordRepeat?: string;
    fieldsError?: {
        oldPasswordError?: string;
        passwordMissmatchError?: string;
    };
    lastAvatarUpdate?: number;
}

interface IProps {
    token: string;
    login: string;
    showNotification: (type: 'info' | 'error' | 'success', text: string, notificationTimeout?: number) => void;
}

export default class Profile extends React.Component<IProps, IState> {

    constructor(props: any) {
        super(props);
        this.state = {
            isLoading: true,
            loadingError: undefined,
            profile: {},
            oldPassword: '',
            newPassword: '',
            newPasswordRepeat: '',
            fieldsError: {}
        }
        this.handleInputChange = this.handleInputChange.bind(this);
        this.submitForm = this.submitForm.bind(this);
        this.handleFileChoose = this.handleFileChoose.bind(this);
    }

    componentDidMount() {
        this.loadUser();
    }

    async loadUser(): Promise<void> {
        this.setState({
            isLoading: true,
            profile: {},
            loadingError: undefined
        });
        try {
            const data: any = await (await fetch(`https://${serverAddress}/user`, {
                "method": "GET",
                "headers": {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${this.props.token}`
                }
            })).json();
            this.setState({
                isLoading: false,
                profile: {
                    fullName: data.user.name,
                    nickname: data.user.login,
                    avatar: `https://${serverAddress}/user/${data.user.login}/avatar`
                }
            });
        } catch (err) {
            this.setState({
                isLoading: false,
                loadingError: err
            });
        }
    }

    async updateUser(data: any): Promise<void> {
        try {
            const user: any = await (await fetch(`https://${serverAddress}/user/password `, {
                "method": "PUT",
                "headers": {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${this.props.token}`
                },
                body: JSON.stringify(data)
            })).json();
            this.setState({
                isLoading: false,
                profile: {
                    fullName: data.user.name,
                    nickname: data.user.login,
                    avatar: `https://${serverAddress}/user/${data.user.login}/avatar`
                }
            });
        } catch (err) {
            console.log('Error updating user.', err);
        }
    }

    async loadAvatar(file: any): Promise<void> {
        try {
            const form = new FormData();
            form.append('image', file);
            const data: any = await (await fetch(`https://${serverAddress}/user/avatar`, {
                "method": "PUT",
                "headers": {
                    "Authorization": `Bearer ${this.props.token}`
                },
                body: form
            })).json();
            this.setState({
                isLoading: false,
                profile: {
                    fullName: data.user.name,
                    nickname: data.user.login,
                    avatar: `https://${serverAddress}/user/${data.user.login}/avatar${this.state.profile?.avatar?.substr(this.state.profile?.avatar?.length - 1) === '/' ? '' : '/' }`
                }
            });
        } catch (err) {
            console.log('Error updating user\'s avatar.', err);
        }
    }

    handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState(
            { [event.target.name]: event.target.value }
        );
    }

    validateFormFields(): boolean {
        const errors: any = {};
        for (let field of ['oldPassword', 'newPassword']) {
            if (!((this.state as any)[field])) {
                errors[field] = FORM_ERROR_MESSAGES.emptyValue;
            }
        }
        if (this.state.newPassword !== this.state.newPasswordRepeat) {
            errors.passwordMissmatchError = FORM_ERROR_MESSAGES.repeatedPasswordMismatch;
        }
        if (Object.keys(errors).length === 0) { return true; }
        this.setState({ fieldsError: errors });
        return false;
    }

    async submitForm(event: React.MouseEvent): Promise<void> {
        event.preventDefault();
        if (!this.validateFormFields()) {
            return;
        }
        const oldPassword = this.state.oldPassword;
        const newPassword = this.state.newPassword;
        await this.updateUser({
            oldPassword,
            newPassword
        });
    }

    handleFileDrop = (files: any) => {
        if (files.length == 1 && files[0].type.split('/')[0] === 'image') {
            this.loadAvatar(files[0]);
        } else {
            //TODO: U WANT TOO MUCH SAY IN STATE
        }
    }

    async handleFileChoose(event: any) {
        if (event.target.files.length == 1) {
            this.loadAvatar(event.target.files[0]);
        }
    }

    loading(): JSX.Element {
        return (
            <div>loading...</div>
        );
    }

    error(): JSX.Element {
        return (
            <div>error</div>
        );
    }

    profile(): JSX.Element {
        const view = (
            <div className="profile_content">
                <div className="profile_content_information">
                    <img src={this.state.profile?.avatar} 
                        className="profile_content_information_avatar"/>
                    <div className="profile_content_information_names">
                        <h1> { this.state.profile?.fullName } </h1>
                        <h2> { "@" + this.state.profile?.nickname } </h2>
                    </div>
                </div>
                <div className="profile_content_change">
                    <div className="profile_content_change_password">
                        <h3>Change password</h3>
                        <form className="profile_content_change_password_form">
                            <div className="form_change_field">
                                <label>Old password<span className="form_error">{this.state.fieldsError?.oldPasswordError}</span></label>
                                <input
                                    type='password' name='oldPassword'
                                    value={this.state.oldPassword}
                                    onChange={this.handleInputChange}/>
                            </div>
                            <div className="form_change_field">
                                <label>New password</label>
                                <input
                                    type='password' name='newPassword'
                                    value={this.state.newPassword}
                                    onChange={this.handleInputChange}/>
                            </div>
                            <div className="form_change_field">
                                <label>Repeat new password<span className="form_error">{this.state.fieldsError?.passwordMissmatchError}</span></label>
                                <input
                                    type='password' name='newPasswordRepeat'
                                    value={this.state.newPasswordRepeat}
                                    onChange={this.handleInputChange}/>
                            </div>
                            <button className='form_change_submit_btn btn_text' onClick={this.submitForm}>Save</button>
                        </form>
                    </div>
                    <form className="profile_content_change_image" encType="multipart/form-data">
                        <h3>Change profile image</h3>
                        <DragAndDrop handleFileDrop={this.handleFileDrop}>
                            Add new profile image
                            <label htmlFor="file-input" className='profile_content_upload_image_btn btn_icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                    <path d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                </svg>
                            </label>
                            <input id="file-input" accept="image/*" type='file' onChange={ this.handleFileChoose }/>
                        </DragAndDrop>
                    </form>
                </div>
            </div>
        );
        return view;
    }

    render(): JSX.Element {
        return (
            <div className="window">
                <NavBar showNotification={this.props.showNotification} login={this.props.login}/>
                { 
                    this.state.isLoading ? this.loading() :
                        this.state.loadingError !== undefined ? this.error() :
                        this.profile()
                }
            </div>
        );
    }

}