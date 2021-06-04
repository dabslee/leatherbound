import React from "react";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {page: "home"};
  }

  render() {
    // prep text
    var schedule = localStorage.getItem("schedule");
    var todo = localStorage.getItem("todo");
    var notes = localStorage.getItem("notes");
    // render
    if (this.state.page == "home") {
      return (
        <div id="content-container">
          <div id="app-container">
              <div id="quicklinks" class="app-double">
                  <h2 style={{backgroundColor: "var(--highlighter1)"}}>Quick Links</h2>
                  <div id="quicklinks-container">
                      <a href="https://www.gmail.com" class="link-icon">
                          <img src="https://img.icons8.com/plasticine/400/000000/gmail.png" style={{width:"100px"}}/>
                          <figcaption>Mail</figcaption>
                      </a>
                      <a href="https://www.drive.google.com" class="link-icon">
                          <img src="https://img.icons8.com/plasticine/400/000000/google-drive.png" style={{width:"100px"}}/>
                          <figcaption>Drive</figcaption>
                      </a>
                      <a href="https://calendar.google.com/" class="link-icon">
                          <img src="https://img.icons8.com/plasticine/400/000000/google-calendar.png" style={{width:"100px"}}/>
                          <figcaption>Calendar</figcaption>
                      </a>
                      <a href="https://phubprod.princeton.edu/psp/phubprod/?cmd=start" class="link-icon">
                          <img src="https://img.icons8.com/plasticine/400/000000/fox.png" style={{width:"100px"}}/>
                          <figcaption>TigerHub</figcaption>
                      </a>
                      <a href="https://play.spotify.com/" class="link-icon">
                          <img src="https://img.icons8.com/plasticine/400/000000/spotify.png" style={{width:"100px"}}/>
                          <figcaption>Spotify</figcaption>
                      </a>
                      <a href="https://github.com/" class="link-icon">
                          <img src="https://img.icons8.com/plasticine/400/000000/github--v1.png" style={{width:"100px"}}/>
                          <figcaption>GitHub</figcaption>
                      </a>
                      <a href="https://blackboard.princeton.edu/" class="link-icon">
                          <img src="https://img.icons8.com/plasticine/400/000000  /compose.png" style={{width:"100px"}}/>
                          <figcaption>BlackBoard</figcaption>
                      </a>
                      <a href="https://canvas.princeton.edu/" class="link-icon">
                          <img src="https://img.icons8.com/plasticine/400/000000/canvas-student.png" style={{width:"100px"}}/>
                          <figcaption>Canvas</figcaption>
                      </a>
                  </div>
              </div>
              <div id="todo" class="app-double">
                  <h2 style={{backgroundColor: "var(--highlighter3)"}}>To do</h2>
                  <textarea id="todo-area" style={{width:"100%", height:"75%"}}>{todo}</textarea>
              </div>
              <div id="schedule" class="app">
                  <h2 style={{backgroundColor: "var(--highlighter2)"}}>Schedule</h2>
                  <textarea id="schedule-area" style={{width:"100%", height:"75%"}}>{schedule}</textarea>
              </div>
              <div id="notes" class="app">
                  <h2 style={{backgroundColor: "var(--highlighter4)"}}>Notes</h2>
                  <textarea id="notes-area" style={{width:"100%", height:"75%"}}>{notes}</textarea>
              </div>
              <div id="weather" class="app-double">
                  <h2 style={{backgroundColor: "var(--highlighter5)"}}>Weather</h2>
                  <div style={{display:"flex", flexDirection:"row", fontSize:"x-large", fontWeight:"lighter", height:"75%"}}>
                      <div style={{width:"400px", display:"flex", marginLeft:"60px", marginTop:"20px"}}>
                          <p>
                              <b>- TODAY -</b><br/>
                              <span id="description-today"></span><br/>
                              Current: <span id="current-temp-today"></span> &deg;F<br/>
                              High: <span id="high-temp-today"></span> &deg;F<br/>
                              Low: <span id="low-temp-today"></span> &deg;F<br/>
                              Precipitation: <span id="precipitation-today"></span>%
                          </p>
                          <img id="icon-today" src="https://img.icons8.com/plasticine/400/000000/sun--v1.png" style={{height:"100px", margin:"10px"}}/>
                      </div>
                      <div style={{width:"400px", display:"flex", marginTop:"20px"}}>
                          <p>
                              <b>- TOMORROW -</b><br/>
                              <span id="description-tomorrow"></span><br/>
                              Current: <span id="average-temp-tomorrow"></span> &deg;F<br/>
                              High: <span id="high-temp-tomorrow"></span> &deg;F<br/>
                              Low: <span id="low-temp-tomorrow"></span> &deg;F<br/>
                              Precipitation: <span id="precipitation-tomorrow"></span>%
                          </p>
                          <img id="icon-tomorrow" src="https://img.icons8.com/plasticine/400/000000/sun--v1.png" style={{height:"100px", margin:"10px"}}/>
                      </div>
                  </div>
              </div>
          </div>
          <div id="todiary" class="navigator" onClick={() => this.setState({page: "diary"})}>&#12297;</div>
        </div>
      );
    } else {
      var diary = localStorage.getItem("diary");
      return (
        <div id="content-container">
          <div id="tohome" class="navigator" onClick={() => this.setState({page: "home"})}>&#12296;</div>
          <div class="app-container">
              <div class="app" style={{width: "80vw", height: "65vh"}}>
                  <textarea id="diary-area" style={{width:"100%", height:"100%"}}>{diary}</textarea>
              </div>
          </div>
        </div>
      )
    }
  }
}

export default App;