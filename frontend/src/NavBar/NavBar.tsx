import React from 'react';
import { Link } from 'react-router-dom';
import { withRouter } from 'react-router';
import { History, Location } from 'history';
import { serverAddress } from '../constants';
import './NavBar.css';

import createStreamButtonIcon from '../assets/create-stream-button.png';
import logoutButtonIcon from '../assets/logout-button.png';
import searchStreamButtonIcon from '../assets/search-stream-button.png';

enum SelectedTab {
    FIND,
    STREAM_PRESENTER
}

interface IProps {
    currentTab?: SelectedTab;
    history: History;
    location: Location;
    match: any;
    showNotification: (type: 'info' | 'error' | 'success', text: string, notificationTimeout?: number) => void;
    login: string;
}

interface IState {
    currentTab?: SelectedTab;
    streamId?: string;
}

class NavBar extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = {
            currentTab: props.currentTab,
            streamId: ''
        };

        this.handleStreamIdChange = this.handleStreamIdChange.bind(this);
        this.changeTab = this.changeTab.bind(this);
        this.signOut = this.signOut.bind(this);
        this.joinStream = this.joinStream.bind(this);
    }

    handleStreamIdChange(event: React.ChangeEvent<HTMLInputElement>): void {
        this.setState({ streamId: event.target.value });
    }

    changeTab(currentTab: SelectedTab): void {
        if (this.state.currentTab == currentTab) { return; }
        this.setState({ currentTab: currentTab });
    }

    signOut(): void {
        localStorage.removeItem('token');
    }

    joinStream(): void {
        this.props.history.push(`/stream/${this.state.streamId}`);
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
                                    (this.state.currentTab == SelectedTab.FIND ? ' Navbar-tab_active' : '') }
                                    onClick={ () => this.changeTab(SelectedTab.FIND) } title='Search for streams'>
                                <img src={searchStreamButtonIcon} alt='Search for streams'/>
                            </button>
                        </Link>
                        <Link to='/presenter'>
                            <button className={ 'Navbar-tab Navbar-btn_icon' +
                                    (this.state.currentTab == SelectedTab.STREAM_PRESENTER ? ' Navbar-tab_active' : '') }
                                    onClick={ () => this.changeTab(SelectedTab.STREAM_PRESENTER) } title='Create stream'>
                                <img src={createStreamButtonIcon} alt='Create stream'/>
                            </button>
                        </Link>
                        <input className='Navbar-join_input'
                                type='text'
                                placeholder='Enter stream ID'
                                value={this.state.streamId}
                                onChange={this.handleStreamIdChange}/>
                        <button className='Navbar-btn_join common_button green_button small_button'
                                onClick={this.joinStream}
                                disabled={!this.state.streamId}>Join by ID</button>
                    </div>
                </div>
                <div className='Navbar-right_section'>
                    <Link to='/login'>
                        <button className='Navbar-btn_icon' onClick={this.signOut} title='Log out'>
                            <img src={logoutButtonIcon} alt='Log out'/>
                        </button>
                    </Link>
                    <Link to='/profile' className='Navbar-profile_block'>
                        <h3>{this.props.login}</h3>
                        <img src={`https://${serverAddress}/user/${this.props.login}/avatar`} className='Navbar-profile_icon' alt='User profile'/>
                    </Link>
                </div>
            </nav>
        );
    }
}

export default withRouter(NavBar);