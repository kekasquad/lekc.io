import React from 'react';
import { useHistory } from 'react-router-dom';
import './App.css';
import Auth from '../Auth/Auth';
import NavBar from '../NavBar/NavBar';
import StreamPresenter from '../StreamPresenter/StreamPresenter';
import StreamViewer from '../StreamViewer/StreamViewer';
import { Redirect, Route, Switch, withRouter } from 'react-router';
import Search from '../Search/Search';
import useToken from './useToken';

function App() {
  const { token, setToken } = useToken();
  const history = useHistory();
  return (
    <div className="App">
      <Switch>
        <Route path="/login">
			    <Auth setToken={setToken}/> 
		    </Route>
        <PrivateRoute path="/search" component={Search} isAuthenticated={!!token}/>
        <PrivateRoute path="/stream-presenter" component={StreamPresenter} isAuthenticated={!!token} history={history}/>
        <PrivateRoute path="/stream-viewer" component={StreamViewer} isAuthenticated={!!token} history={history}/>
        <PrivateRoute path="/profile" component={NavBar} isAuthenticated={!!token}/>
        <Redirect from="/" to="/search"/>
      </Switch>
      </div>
  );
}

const PrivateRoute = ({component, isAuthenticated, ...rest}: any) => {
	const routeComponent = (props: any) => {
    const from = "?from=" + props.location.pathname;
    return (
      isAuthenticated
        ? React.createElement(component, props)
        : <Redirect to={{
          pathname: '/login',
          search: from
        }}/>
    );
  } 
	return <Route {...rest} render={routeComponent}/>;
};

export default withRouter(App);
