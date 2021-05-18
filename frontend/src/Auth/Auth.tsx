import React from 'react';
import { Redirect } from 'react-router-dom';
import './Auth.css';
import { FORM_ERROR_MESSAGES, serverAddress } from '../constants';

interface IProps {
    loginMode?: boolean;
    setToken?: any;
    location?: {
        search?: {
            from?: string
        }
    }
    showNotification: (type: 'info' | 'error' | 'success', text: string, notificationTimeout?: number) => void;
}

interface IState {
    redirectToReferrer?: boolean; 
    loginMode?: boolean;
    login?: string;
    password?: string;
    name?: string;
    repeatPassword?: string;
    formErrors?: {
        login?: string;
        password?: string;
        name?: string;
        repeatPassword?: string;
    };
    errorText?: string;
}

export default class Auth extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            redirectToReferrer: false,
            loginMode: props.loginMode !== false,
            login: '',
            name: '',
            password: '',
            repeatPassword: '',
            formErrors: {},
            errorText: ''
        };

        this.handleInputChange = this.handleInputChange.bind(this);
        this.submitForm = this.submitForm.bind(this);
    }
    
    async login(data: any): Promise<void> {
        try {
            const tokenData: any = await (await fetch(`https://${serverAddress}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })).json();
            this.props.setToken(tokenData.token);
            this.setState({ redirectToReferrer: true });
            this.props.showNotification('success', 'Successfully logged in', 1300);
        } catch (err) {
            this.props.showNotification('error', 'Error logging in');
            console.log('Error logging in', err);
        }
    }

     async register(data: any): Promise<void> {
        try {
            const tokenData: any = await (await fetch(`https://${serverAddress}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })).json();
            this.props.setToken(tokenData.token);
            this.setState({ redirectToReferrer: true });
            this.props.showNotification('success', 'Successfully registered', 1300);
        } catch (err) {
            this.props.showNotification(
                'error', 'Error signing up'
            );
            console.log('Error signing up', err);
        }
    }

    flushControls(): void {
        this.setState(
            { login: '', name: '', password: '', repeatPassword: '', formErrors: {} }
        );
    }

    changeMode(loginMode: boolean): void {
        if (this.state.loginMode === loginMode) { return; }
        this.setState({ loginMode });
        this.flushControls();
    }

    handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState(
            { [event.target.name]: event.target.value }
        );
    }

    validateFormFields(): boolean {
        const errors: any = {};
        for (let field of ['login', 'password', 'name']) {
            if (this.state.loginMode && field === 'name') {
                continue;
            }
            if (!((this.state as any)[field])) {
                errors[field] = FORM_ERROR_MESSAGES.emptyValue;
            }
        }
        if (!this.state.loginMode) {
            if (this.state.repeatPassword !== this.state.password) {
                errors.repeatPassword = FORM_ERROR_MESSAGES.repeatedPasswordMismatch;
            }
        }
        if (Object.keys(errors).length === 0) { return true; }
        this.setState({ formErrors: errors });
        return false;
    }

    async submitForm(event: React.MouseEvent): Promise<void> {
        event.preventDefault();
        if (!this.validateFormFields()) {
            this.setState({ errorText: FORM_ERROR_MESSAGES.incorrectData });
            return;
        }
        if (this.state.loginMode) {
            const login = this.state.login;
            const password = this.state.password;
            await this.login({
                login,
                password
            });
        } else {
            const login = this.state.login;
            const name = this.state.name;
            const password = this.state.password;
            await this.register({
                login,
                name,
                password
            });
        }
    }

    loginForm(): JSX.Element {
        return (
            <form className='Auth-form'>
                <div className="Auth-form_field">
                    <label>Login*<span className="form_error">{this.state.formErrors?.login}</span></label>
                    <input
                        type='text' name='login'
                        value={this.state.login}
                        onChange={this.handleInputChange}/>
                </div>
                <div className="Auth-form_field">
                    <label>Password*<span className="form_error">{this.state.formErrors?.password}</span></label>
                    <input
                        type='password' name='password'
                        value={this.state.password}
                        onChange={this.handleInputChange}/>
                </div>
                <button className='Auth-form_submit_button common_button' onClick={this.submitForm}>Login</button>
            </form>
        );
    }

    signupForm(): JSX.Element {
        return (
            <form className='Auth-form'>
                <div className="Auth-form_field">
                    <label>Login*</label>
                    <input type='text' required name='login'
                        value={this.state.login}
                        onChange={this.handleInputChange}/>
                </div>
                <div className="Auth-form_field">
                    <label>Name*</label>
                    <input type='text' required name='name'
                        value={this.state.name}
                        onChange={this.handleInputChange}/>
                </div>
                <div className="Auth-form_field">
                    <label>Password*</label>
                    <input type='password' required name='password'
                        value={this.state.password}
                        onChange={this.handleInputChange}/>
                </div>
                <div className="Auth-form_field">
                    <label>Repeat password*</label>
                    <input type='password' required name='repeatPassword'
                        value={this.state.repeatPassword}
                        onChange={this.handleInputChange}/>
                </div>
                <button className='Auth-form_submit_button common_button' onClick={this.submitForm}>Sign up</button>
            </form>
        );
    }

    render(): JSX.Element {
        if (this.state.redirectToReferrer) {
            const redirectTo = new URLSearchParams(window.location.search).get('from') || '/';
            return (
				<Redirect to={redirectTo}/>
			);
        }
        return (
          <div className='Auth-component'>
            <h1>Lekc.io</h1>
            <div className='Auth-form_container'>
              <div className='Auth-form_control_block'>
                <div className={ 'Auth-form_control_button' + (this.state.loginMode ? ' active' : '')} onClick={ () => this.changeMode(true) }>
                  <span>Login</span>
                </div>
                <div className={ 'Auth-form_control_button' + (!this.state.loginMode ? ' active' : '') } onClick={ () => this.changeMode(false) }>
                  <span>Sign up</span>
                </div>
              </div>
              {this.state.loginMode ? this.loginForm() : this.signupForm() }
            </div>
          </div>
      );
    }
}