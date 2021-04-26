import React from 'react'; 
import './Profile.css';
import NavBar from '../NavBar/NavBar';

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
        fetch('https://localhost:4000/user', {
            "method": "GET",
            "headers": {
                'Content-Type': 'application/json',
                "Authorization": "Bearer " + this.props.token
            }
        })
            .then((data) => data.json())
            .then((data) => this.setState({
                isLoading: false,
                profile: {
                    fullName: data.user.name,
                    nickname: data.user.login,
                    avatar: data.user.avatar
                }
            }))
            .catch((error) => this.setState({
                isLoading: false,
                loadingError: error
            }));
    }

    changePassword = async(data: any) => {
        fetch('https://localhost:4000/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).then(data => {
            return data.json();
        }).then((data: any) => {
            this.setState({ 
                profile: {
                    avatar: data.user.avatar
                } 
            });
        }).catch((err) => {
            console.log('Error updating user.', err);
        });
    }

    handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState(
            { [event.target.name]: event.target.value }
        );
    }

    submitForm(event: React.MouseEvent): void {
        // event.preventDefault();
        // if (!this.validateFormFields()) {
        //     this.setState({ errorText: FORM_ERROR_MESSAGES.incorrectData });
        //     return;
        // }
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
            <div>
                <div className="profile_content_information">
                        <img src={this.state.profile?.avatar} className="profile_content_information_avatar"/>
                        <span className="profile_content_information_fullname"> { this.state.profile?.fullName } </span>
                        <span className="profile_content_information_nickname"> { "@" + this.state.profile?.nickname } </span>
                    </div>
                    <div className="profile_content_change">
                        <div className="profile_content_change_password">
                            Change password
                            <form className="profile_content_change_password_form">
                                <div className="form_change_old_password">
                                    <label>Old password<span className="form_error">{this.state.fieldsError?.oldPasswordError}</span></label>
                                    <input
                                        type='text' name='oldPassword'
                                        value={this.state.oldPassword}
                                        onChange={this.handleInputChange}/>
                                </div>
                                <div className="form_change_new_password">
                                    <label>New password</label>
                                    <input
                                        type='password' name='newPassword'
                                        value={this.state.newPassword}
                                        onChange={this.handleInputChange}/>
                                </div>
                                <div className="form_change_repeat">
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
                            Change profile image
                            <form className="profile_content_change_image_drop">
                                Add new profile image
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
                <div className="profile_content">
                    { 
                        this.state.isLoading ? this.loading() :
                            this.state.loadingError !== undefined ? this.error() :
                            this.profile()
                    }
                </div>
            </div>
        );
    }

}