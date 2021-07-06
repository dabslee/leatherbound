import $ from "jquery";
import React from "react";
import createClass from 'create-react-class';

/* Weather */
const apiKey = "9237036ab7c0bf80dd4223ff17715372";
const icons = {
    "01d":"sun--v1",
    "01n":"bright-moon",
    "02d":"partly-cloudy-day--v1",
    "02n":"partly-cloudy-night",
    "03d":"cloud",
    "03n":"cloud",
    "04d":"cloud",
    "04n":"cloud",
    "09d":"rain",
    "09n":"rain",
    "10d":"rain",
    "10n":"rain",
    "11d":"storm--v1",
    "11n":"storm--v1",
    "13d":"snow-storm",
    "13n":"snow-storm",
    "50d":"foggy-night-1",
    "50n":"foggy-night-1"
}
function kToF(tempK) {
    return Math.round((tempK-273.15)*1.8+32);
}
function weatherUpdate() {
  fetch(`https://api.openweathermap.org/data/2.5/weather?id=5102922&appid=${apiKey}`)
  .then(function(resp) { return resp.json() })
  .then(function(data) {
      localStorage.setItem("description-today", data.weather[0].description);
      localStorage.setItem("current-temp-today", kToF(data.main.temp));
      localStorage.setItem("high-temp-today", kToF(data.main.temp_max));
      localStorage.setItem("low-temp-today", kToF(data.main.temp_min));
      localStorage.setItem("icon-today", "https://img.icons8.com/plasticine/400/000000/" + icons[data.weather[0].icon] + ".png");
  });
  fetch(`https://api.openweathermap.org/data/2.5/forecast?id=5102922&appid=${apiKey}`)
  .then(function(resp) { return resp.json() })
  .then(function(data) {
      localStorage.setItem("precipitation-today", data.list[0].pop * 100);

      localStorage.setItem("description-tomorrow", data.list[8].weather[0].description);
      localStorage.setItem("average-temp-tomorrow", kToF(data.list[8].main.temp));
      localStorage.setItem("high-temp-tomorrow", kToF(data.list[8].main.temp_max));
      localStorage.setItem("low-temp-tomorrow", kToF(data.list[8].main.temp_min));
      localStorage.setItem("precipitation-tomorrow", data.list[8].pop * 100);
      localStorage.setItem("icon-tomorrow", "https://img.icons8.com/plasticine/400/000000/" + icons[data.list[8].weather[0].icon] + ".png");
  });
}
function weatherRender() {
    $("#description-today").html(localStorage.getItem("description-today"));
    $("#current-temp-today").html(localStorage.getItem("current-temp-today"));
    $("#high-temp-today").html(localStorage.getItem("high-temp-today"));
    $("#low-temp-today").html(localStorage.getItem("low-temp-today"));
    $("icon-today").attr("src", localStorage.getItem("icon-today"));
    $("#precipitation-today").html(localStorage.getItem("precipitation-today"));

    $("#description-tomorrow").html(localStorage.getItem("description-tomorrow"));
    $("#average-temp-tomorrow").html(localStorage.getItem("average-temp-tomorrow"));
    $("#high-temp-tomorrow").html(localStorage.getItem("high-temp-tomorrow"));
    $("#low-temp-tomorrow").html(localStorage.getItem("low-temp-tomorrow"));
    $("#precipitation-tomorrow").html(localStorage.getItem("precipitation-tomorrow"));
    $("#icon-tomorrow").attr("src", localStorage.getItem("icon-tomorrow"));
}

var App = createClass( {
  getInitialState: function() {
      return {page: "home"};
  },

  componentDidMount: function() {
      weatherUpdate();
      setInterval(weatherRender, 100);
  },

  render: function() {
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
          <div class="app-container" style={{display: "flex", flexDirection: "row"}}>
              <div class="app" style={{width: "40vw", height: "65vh"}}>
                  <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                    <h1>Diary</h1>
                    <label>Mood: <select>
                        <option>Great</option>
                        <option>Good</option>
                        <option>Neutral</option>
                        <option>Bad</option>
                        <option>Terrible</option>
                        </select></label>
                    <button>Save Entry</button>
                  </div>
                  <textarea id="diary-area" style={{width:"100%", height:"100%"}}>{diary}</textarea>
              </div>
              <div>
                  <h2>Mood Calendar</h2>
              </div>
          </div>
        </div>
      )
    }
  }
} );

export default App;