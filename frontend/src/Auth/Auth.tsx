import React from 'react';
import './Auth.css';

interface IProps {
    loginMode?: boolean;
}

interface IState {
    loginMode: boolean;
}


export default class Auth extends React.Component<IProps, IState> {

    constructor(props: any) {
        super(props);
        this.state = {
            loginMode: props.loginMode === false ? false : true
        };
    }

    changeMode(loginMode: boolean) {
        this.setState({ loginMode });
    }

    loginForm() {
        return (
            <form className='Auth-form'>
                <div className="Auth-form_field">
                    <label>Login*</label>
                    <input type='text' required/>
                </div>
                <div className="Auth-form_field">
                    <label>Password*</label>
                    <input type='password' required/>
                </div>
                <button className='Auth-form_submit_button common_button'>Login</button>
            </form>
        );
    }

    signupForm() {
        return (
            <form className='Auth-form'>
                <div className="Auth-form_field">
                    <label>Login*</label>
                    <input type='text' required/>
                </div>
                <div className="Auth-form_field">
                    <label>Name</label>
                    <input type='text'/>
                </div>
                <div className="Auth-form_field">
                    <label>Password*</label>
                    <input type='password' required/>
                </div>
                <div className="Auth-form_field">
                    <label>Repeat password*</label>
                    <input type='password' required/>
                </div>
                <button className='Auth-form_submit_button common_button'>Sign up</button>
            </form>
        );
    }

    render() {
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