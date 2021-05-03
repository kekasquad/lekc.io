import React from 'react';
import { Link } from 'react-router-dom';
import './NavBar.css';

import createStreamButtonIcon from '../assets/create-stream-button.png';
import logoutButtonIcon from '../assets/logout-button.png';
import searchStreamButtonIcon from '../assets/search-stream-button.png';
import userProfileButtonIcon from '../assets/user-profile-button.png';

enum SelectedTab {
  FIND,
  STREAM_PRESENTER,
  PROFILE
}

interface IProps {
  currentItem?: SelectedTab;
  joinMode?: boolean;
}

interface IState {
  currentItem?: SelectedTab;
  joinMode?: boolean;
  roomID?: string;
  roomPassword?: string;
  fieldsErrors?: {
    roomID?: string;
  }
  errorText?: string;
}

export default class NavBar extends React.Component<IProps, IState> {

  constructor(props: any) {
    super(props);
    this.state = {
      currentItem: props.currentItem,
      joinMode: props.joinMode === true,
      roomID: '',
      roomPassword: '',
      fieldsErrors: {},
      errorText: ''
    };
    
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  handleInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
      this.setState(
          { [event.target.name]: event.target.value }
      );
  }

  flushControls(): void {
    this.setState(
        { roomID: '', roomPassword: '', fieldsErrors: {} }
    );
  }
  
  changeMode(joinMode: boolean): void {
    if (this.state.joinMode === joinMode) { return; }
    this.setState({ joinMode });
    this.flushControls();
  }

  changeTab(currentTab: SelectedTab): void {
    if (this.state.currentItem == currentTab) { return; }
    this.setState({ currentItem: currentTab });
  }

  validateFormFields(): boolean {
      return false;
  }

  signOut(): void {
    localStorage.removeItem('token');
  }

  render(): JSX.Element {
    return (
      <nav className='Navbar-component'>
        <div className='Navbar-left_section'>
          <Link to='/'>
            <h1>Lekc.io</h1>
          </Link>
          <div className='Navbar-tabs'>
            <Link to='/search'>
              <button className={ 'Navbar-tab Navbar-btn_icon' +
                                  (this.state.currentItem == SelectedTab.FIND ? ' Navbar-tab_active' : '') }
                      onClick={ () => this.changeTab(SelectedTab.FIND) }>
                <img src={searchStreamButtonIcon} alt='Search streams'/>
              </button>
            </Link>
            <Link to='/presenter'>
              <button className={ 'Navbar-tab Navbar-btn_icon' +
                                  (this.state.currentItem == SelectedTab.STREAM_PRESENTER ? ' Navbar-tab_active' : '') }
                      onClick={ () => this.changeTab(SelectedTab.STREAM_PRESENTER) }>
                <img src={createStreamButtonIcon} alt='Create stream'/>
              </button>
            </Link>
            <Link to='/profile'>
              <button className={ 'Navbar-tab Navbar-btn_icon' +
                                  (this.state.currentItem == SelectedTab.PROFILE ? ' Navbar-tab_active' : '') }
                      onClick={ () => this.changeTab(SelectedTab.PROFILE) }>
                <img src={userProfileButtonIcon} alt='User profile'/>
              </button>
            </Link>
          </div>
        </div>
        <div className='Navbar-right_section'>
          <Link to='/login'>
            <button className='Navbar-btn_icon' onClick={ () => this.signOut() }>
              <img src={logoutButtonIcon} alt='Log out'/>
            </button>
          </Link>
          <button className='Navbar-btn_join common_button green_button small_button'
                  onClick={ () => this.changeMode(true) }>Join by id</button>
        </div>
      </nav>
    );
  }
}