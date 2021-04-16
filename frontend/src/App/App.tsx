import React from 'react';
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
  
  if (!token) {
    return (
      <div className="App">
        <Auth setToken={setToken} />
      </div>
    );
  }

  return (
    <div className="App">
      <Switch>
        <Route path="/search">
          <Search/>
        </Route>
        <Route path="/stream-presenter">
          <StreamPresenter />
        </Route>
        <Route path="/stream-viewer">
          <StreamViewer />
        </Route>
        <Route path="/profile">
          <NavBar currentItem={2}/>
        </Route>
        <Redirect from="/" to="/search"/>
      </Switch>
      </div>
  );
}

export default withRouter(App);
