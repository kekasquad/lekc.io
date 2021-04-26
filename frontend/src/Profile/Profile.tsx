import React from 'react'; 
import './Profile.css';
import NavBar from '../NavBar/NavBar';
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
    newAvatarPath?: string;
}

interface IProps {
    token?: string;
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
            fieldsError: {},
            newAvatarPath: ''
        }
        this.handleInputChange = this.handleInputChange.bind(this);
        this.loadProfile();
    }

    loadProfile(): void {
        this.setState({
            isLoading: true,
            loadingError: undefined,
            profile: {},
            oldPassword: '',
            newPassword: '',
            newPasswordRepeat: '',
            fieldsError: {},
            newAvatarPath: ''
        });
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
                    avatar: data.user.avatar
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
            const user: any = await (await fetch(`https://${serverAddress}/user`, {
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
                    fullName: user.name,
                    nickname: user.login,
                    avatar: user.avatar
                }
            });
        } catch (err) {
            console.log('Error updating user.', err);
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

    submitForm(event: React.MouseEvent): void {
        event.preventDefault();
        if (!this.validateFormFields()) {
            return;
        }
        const oldPassword = this.state.oldPassword;
        const newPassword = this.state.newPassword;
        const avatar = this.state.newAvatarPath;
        this.updateUser({
            oldPassword,
            newPassword,
            avatar
        });
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
        return (
            <div className="profile_content">
                <div className="profile_content_information">
                        <img src={this.state.profile?.avatar} className="profile_content_information_avatar"/>
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
                                        type='text' name='oldPassword'
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
                        <div className="profile_content_change_image">
                            <h3>Change profile image</h3>
                            <form className="profile_content_change_image_drop">
                                Add new profile image
                                <button className='profile_content_upload_image_btn btn_icon'>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                        <path d="M0 0h24v24H0z" fill="none"/>
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                    </svg>
                                </button>
                            </form>
                        </div>
                    </div>
            </div>
        );
    }

    render(): JSX.Element {
        return (
            <div className="window">
                <NavBar currentItem={3}/>
                { 
                    this.state.isLoading ? this.loading() :
                        this.state.loadingError !== undefined ? this.error() :
                        this.profile()
                }
            </div>
        );
    }

}