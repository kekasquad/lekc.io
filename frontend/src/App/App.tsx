import React from 'react';
import './App.css';
import Auth from '../Auth/Auth';
import NavBar from '../NavBar/NavBar';
import { Redirect, Route, Switch, withRouter } from 'react-router';

function App() {
  return (
    <div className="App">
      <Switch>
        <Route path="/search">
          <NavBar currentItem={0}/>
        </Route>
        <Route path="/stream">
          <NavBar currentItem={1}/>
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
