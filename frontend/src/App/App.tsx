import React from 'react';
import './App.css';
import Auth from '../Auth/Auth';
import NavBar from '../NavBar/NavBar';
import StreamPresenter from '../StreamPresenter/StreamPresenter';
import StreamViewer from '../StreamViewer/StreamViewer';
import { Redirect, Route, Switch, withRouter } from 'react-router';
import Search from '../Search/Search';

function App() {
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
        <Route path="/login">
          <Auth/>
        </Route>
        <Redirect from="/" to="/search"/>
      </Switch>
      </div>
  );
}

export default withRouter(App);
