import React from 'react';
import './App.css';
import Auth from '../Auth/Auth';
import Stream from '../Stream/Stream';
import Search from '../Search/Search';
import Profile from '../Profile/Profile';
import { Redirect, Route, Switch, withRouter } from 'react-router';

function App() {
  return (
    <div className="App">
      <Switch>
        <Route path="/search">
          <Search/>
        </Route>
        <Route path="/stream">
          <Stream />
        </Route>
        <Route path="/profile">
          <Profile/>
        </Route>
        <Route path="/login">
          <Auth/>
        </Route>
        <Redirect from="/" to="/search"/>
      </Switch>
      </div>
  );
}

export default withRouter(App);
