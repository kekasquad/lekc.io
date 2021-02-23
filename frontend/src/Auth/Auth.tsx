import React from 'react';
import './Auth.css';

interface IProps {
    loginMode?: boolean;
}

interface IState {
    loginMode?: boolean;
    login?: string,
    password?: string
    name?: string,
    repeatPassword?: string
}


export default class Auth extends React.Component<IProps, IState> {

    constructor(props: any) {
        super(props);
        this.state = {
            loginMode: props.loginMode === false ? false : true,
            login: '',
            name: '',
            password: '',
            repeatPassword: ''
        };

        this.handleInputChange = this.handleInputChange.bind(this);
    }

    flushControls(): void {
        this.setState(
            { login: '', name: '', password: '', repeatPassword: '' }
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

    loginForm(): JSX.Element {
        return (
            <form className='Auth-form'>
                <div className="Auth-form_field">
                    <label>Login*</label>
                    <input
                        type='text' required name='login'
                        value={this.state.login}
                        onChange={this.handleInputChange}/>
                </div>
                <div className="Auth-form_field">
                    <label>Password*</label>
                    <input
                        type='password' required name='password'
                        value={this.state.password}
                        onChange={this.handleInputChange}/>
                </div>
                <button className='Auth-form_submit_button common_button'>Login</button>
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
                    <label>Name</label>
                    <input type='text' name='name'
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
                <button className='Auth-form_submit_button common_button'>Sign up</button>
            </form>
        );
    }

    render(): JSX.Element {
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