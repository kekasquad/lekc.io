import React from 'react';
import './App.css';
import Auth from '../Auth/Auth';
import NavBar from '../NavBar/NavBar';

function App() {
  return (
    <div className="App">
      <NavBar currentItem={1}/>
    </div>
  );
}

export default App;
