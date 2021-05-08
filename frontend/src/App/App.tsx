import React, { useEffect, useState } from 'react';
import './App.css';
import Auth from '../Auth/Auth';
import StreamPresenter from '../StreamPresenter/StreamPresenter';
import StreamViewer from '../StreamViewer/StreamViewer';
import Profile from '../Profile/Profile';
import { Redirect, Route, Switch, useHistory, withRouter } from 'react-router';
import Search from '../Search/Search';
import useToken from './useToken';
import Notification from '../Notification/Notification';
import { NOTIFICATION_TIMEOUT, serverAddress } from '../constants';

interface IState {
    type: 'info' | 'error' | 'success';
    text: string;
    show: boolean;
    timeout: NodeJS.Timeout | null;
}

function App() {
    const {token, setToken} = useToken();
    const history = useHistory();
    const [notification, setNotification] = useState<IState>({
        type: 'info',
        text: '',
        show: false,
        timeout: null
    });

    const showNotification = (
        type: 'info' | 'error' | 'success', text: string,
        notificationTimeout: number = NOTIFICATION_TIMEOUT
    ) => {
        if (text) {
            if (notification.timeout) {
                clearTimeout(notification.timeout);
            }
            const timeout: NodeJS.Timeout = setTimeout(
                () => setNotification({ type: notification.type, text, show: false, timeout: null }),
                notificationTimeout
            );
            setNotification({ type, text, show: true, timeout });
        }
    };

    useEffect(() => {
        fetch(`https://${serverAddress}/user`, {
          "method": "GET",
          "headers": {
            'Content-Type': 'application/json',
            "Authorization": `Bearer ${token}`
          }
        }).then(response => {
          if (response.status !== 200) {
            setToken('');
          }
        }).catch(err => {
            showNotification('error', 'Authentication error');
            setTimeout(() => history.push('/login'), NOTIFICATION_TIMEOUT);
        });
      });

    const closeNotification = () => {
        if (notification.timeout) {
            clearTimeout(notification.timeout);
        }
        setNotification({ type: notification.type, text: notification.text, show: false, timeout: null });
    };

    return (
        <div className='App'>
            <Notification type={notification.type} text={notification.text} show={notification.show} onClick={closeNotification}/>
            <Switch>
                <Route path='/login'>
                    <Auth setToken={setToken} showNotification={showNotification}/>
                </Route>
                <PrivateRoute path='/search' component={Search}
                              isAuthenticated={!!token} showNotification={showNotification}/>
                <PrivateRoute path='/presenter' component={StreamPresenter}
                              isAuthenticated={!!token} showNotification={showNotification}/>
                <PrivateRoute path='/stream/:id' component={StreamViewer}
                              isAuthenticated={!!token} showNotification={showNotification}/>
                <PrivateRoute path='/profile'
                              isAuthenticated={!!token} showNotification={showNotification}>
                    <Profile token={token} showNotification={showNotification}/>                  
                </PrivateRoute>
                <Redirect from='/' to='/search'/>
            </Switch>
        </div>
    );
}

const PrivateRoute = ({component, isAuthenticated, showNotification, ...rest}: any) => {
    const routeComponent = (props: any) => {
        const from = '?from=' + props.location.pathname;
        return (
            isAuthenticated
                ? React.createElement(component, {...props, showNotification})
                : <Redirect to={{
                    pathname: '/login',
                    search: from
                }}/>
        );
    }
    return <Route {...rest} render={routeComponent}/>;
};

export default withRouter(App);
