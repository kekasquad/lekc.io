import React from "react";
import './NavBar.css';

enum SelectedTab {
  FIND,
  STREAM,
  PROFILE
}

const NavBar = ({currentItem}:{ currentItem: SelectedTab }) => {
    return (
        <nav className="navbar">
          <div className="brand_section">
            Lekc.io {currentItem}
            <div className="tabs">
              <button className={currentItem == SelectedTab.FIND ? 'tab btn_icon tab_active' : 'tab btn_icon'}>
                <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="36" viewBox="0 0 24 24" width="36">
                  <g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M7,9H2V7h5V9z M7,12H2v2h5V12z M20.59,19l-3.83-3.83C15.96,15.69,15.02,16,14,16c-2.76,0-5-2.24-5-5s2.24-5,5-5s5,2.24,5,5 c0,1.02-0.31,1.96-0.83,2.75L22,17.59L20.59,19z M17,11c0-1.65-1.35-3-3-3s-3,1.35-3,3s1.35,3,3,3S17,12.65,17,11z M2,19h10v-2H2 V19z"/></g>
                </svg>
              </button>
              <button className={currentItem == SelectedTab.STREAM ? 'tab btn_icon tab_active' : 'tab btn_icon'}>
                <svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="36" viewBox="0 0 24 24" width="36">
                  <g><path d="M21,3H3C1.9,3,1,3.9,1,5v3h2V5h18v14h-7v2h7c1.1,0,2-0.9,2-2V5C23,3.9,22.1,3,21,3z M1,18v3h3C4,19.34,2.66,18,1,18z M1,14 v2c2.76,0,5,2.24,5,5h2C8,17.13,4.87,14,1,14z M1,10v2c4.97,0,9,4.03,9,9h2C12,14.92,7.07,10,1,10z M11,11.09v2L14.5,15l3.5-1.91 v-2L14.5,13L11,11.09z M14.5,6L9,9l5.5,3L20,9L14.5,6z"/><path d="M0,0h24v24H0V0z" fill="none"/></g>
                </svg>
              </button>
              <button className={currentItem == SelectedTab.PROFILE ? 'tab btn_icon tab_active' : 'tab btn_icon'}>
                <svg id="Layer_1" enable-background="new 0 0 480 480" height="36" viewBox="0 0 480 480" width="36" xmlns="http://www.w3.org/2000/svg">
                  <path d="m402 424.743v47.257c0 4.418-3.582 8-8 8s-8-3.582-8-8v-47.257c0-36.795-29.775-66.572-66.573-66.571-17.41 0-33.208-8.87-42.258-23.728-2.299-3.773-1.103-8.696 2.67-10.994 3.772-2.299 8.695-1.103 10.994 2.671 6.122 10.051 16.812 16.051 28.594 16.051 45.638-.002 82.573 36.93 82.573 82.571zm-111.612-58.26c2.846 3.38 2.412 8.427-.968 11.272-11.781 9.917-26.254 16.025-41.42 17.627v36.618c0 4.418-3.582 8-8 8s-8-3.582-8-8v-36.603c-24.747-2.591-46.758-17.082-58.921-38.818-4.034 1.045-8.227 1.592-12.505 1.592-36.879 0-66.574 29.849-66.574 66.571v47.258c0 4.418-3.582 8-8 8s-8-3.582-8-8v-47.257c0-45.636 36.929-82.571 82.571-82.571 18.459 0 33.429-14.871 33.429-33.342v-2.107c-34.919-16.697-59.429-51.784-60.923-92.643-14.37-3.455-25.077-16.317-25.077-31.62v-97.46c0-17.451 12.839-31.96 29.566-34.579 14.369-30.791 44.965-50.421 79.286-50.421h68.607c48.27 0 87.541 39.271 87.541 87.541v94.919c0 4.418-3.582 8-8 8s-8-3.582-8-8v-94.919c0-39.448-32.093-71.541-71.541-71.541h-68.607c-29.423 0-55.497 17.652-66.424 44.971-1.215 3.037-4.157 5.029-7.428 5.029-10.477 0-19 8.523-19 19v97.46c0 6.348 3.656 11.865 9 14.636v-51.863c0-30.878 25.122-56 56-56h102c30.879 0 56 25.12 56 55.997v65.503c0 69.574-67.988 122.42-137.17 102.053-1.244 15.763-9.789 29.158-22.057 37.259 19.065 32.204 62.56 39.698 91.342 15.469 3.378-2.843 8.426-2.411 11.273.969zm-50.388-65.358c50.178 0 91-40.822 91-91v-64.895c0-22.054-17.944-39.997-40-39.997h-102c-22.056 0-40 17.944-40 40v64.892c0 50.178 40.822 91 91 91z"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="right_section">
            <button className="btn_icon btn_exit_profile">
              <svg xmlns="http://www.w3.org/2000/svg" height="36" viewBox="0 0 24 24" width="36"><path d="M0 0h24v24H0V0z" fill="none"/>
                <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              </svg>
            </button>
            <button className="btn_text btn_join">Join by id</button>
          </div>
        </nav>
    )
};



export default NavBar;