import React, { Component } from "react";

/* Weather */
const apiKey = process.env.REACT_APP_WEATHER_API_KEY;
const iconMap = {
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

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      page: "home",
      weatherData: {
        today: {},
        tomorrow: {}
      }
    };
  }

  componentDidMount() {
    this.weatherUpdate(this.props.settings.weatherLocation);
    // Refresh weather every hour instead of using intervals for DOM updates
    this.weatherInterval = setInterval(() => this.weatherUpdate(this.props.settings.weatherLocation), 3600000);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.settings.weatherLocation !== this.props.settings.weatherLocation) {
      this.weatherUpdate(this.props.settings.weatherLocation);
    }
  }

  componentWillUnmount() {
      clearInterval(this.weatherInterval);
  }

  weatherUpdate = (location) => {
    // If location is not provided or empty, default to Princeton ID

    let weatherUrl = `https://api.openweathermap.org/data/2.5/weather?appid=${apiKey}`;
    let forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?appid=${apiKey}`;

    if (!location) location = "Princeton, US";

    if (/^\d+$/.test(location)) {
        weatherUrl += `&id=${location}`;
        forecastUrl += `&id=${location}`;
    } else {
        location = location.replaceAll(' ', '').replaceAll(', US', '') + ", US";
        weatherUrl += `&q=${location}`;
        forecastUrl += `&q=${location}`;
    }

    fetch(weatherUrl)
      .then(resp => {
          if (!resp.ok) throw new Error("Weather fetch failed");
          return resp.json();
      })
      .then(data => {
          this.setState(prevState => ({
              weatherData: {
                  ...prevState.weatherData,
                  today: {
                      description: data.weather[0].description,
                      currentTemp: kToF(data.main.temp),
                      highTemp: kToF(data.main.temp_max),
                      lowTemp: kToF(data.main.temp_min),
                      icon: "https://img.icons8.com/plasticine/400/000000/" + (iconMap[data.weather[0].icon] || "sun--v1") + ".png"
                  }
              }
          }));
      })
      .catch(e => console.error(e));

    fetch(forecastUrl)
      .then(resp => {
          if (!resp.ok) throw new Error("Forecast fetch failed");
          return resp.json();
      })
      .then(data => {
          // Find tomorrow's forecast (approx 24h later, index 8 usually for 3h steps)
          const tomorrow = data.list[8] || data.list[0];
          this.setState(prevState => ({
              weatherData: {
                  ...prevState.weatherData,
                  today: {
                      ...prevState.weatherData.today,
                      precipitation: Math.round(data.list[0].pop * 100)
                  },
                  tomorrow: {
                      description: tomorrow.weather[0].description,
                      averageTemp: kToF(tomorrow.main.temp),
                      highTemp: kToF(tomorrow.main.temp_max),
                      lowTemp: kToF(tomorrow.main.temp_min),
                      precipitation: Math.round(tomorrow.pop * 100),
                      icon: "https://img.icons8.com/plasticine/400/000000/" + (iconMap[tomorrow.weather[0].icon] || "sun--v1") + ".png"
                  }
              }
          }));
      })
      .catch(e => console.error(e));
  }

  render() {
    const { settings } = this.props;
    const { weatherData } = this.state;
    const today = weatherData.today || {};
    const tomorrow = weatherData.tomorrow || {};

    // prep text
    var schedule = localStorage.getItem("schedule");
    var todo = localStorage.getItem("todo");
    var notes = localStorage.getItem("notes");

    if (this.state.page === "home") {
      return (
        <div id="content-container">
          <div id="app-container">
              <div id="quicklinks" className="app-double">
                  <h2 style={{backgroundColor: "var(--highlighter1)"}}>Quick Links</h2>
                  <div id="quicklinks-container">
                      {settings.quickLinks && settings.quickLinks.map((link, i) => (
                          link.url && link.title && (
                            <a key={i} href={link.url} className="link-icon">
                                <img class="drawn-icon" src={`https://img.icons8.com/plasticine/400/000000/${link.icon}.png`} style={{width:"100px"}} alt={link.title}/>
                                <figcaption>{link.title}</figcaption>
                            </a>
                          )
                      ))}
                  </div>
              </div>
              <div id="todo" className="app-double">
                  <h2 style={{backgroundColor: "var(--highlighter3)"}}>To do</h2>
                  <textarea id="todo-area" style={{width:"100%", height:"75%"}} defaultValue={todo}></textarea>
              </div>
              <div id="schedule" className="app">
                  <h2 style={{backgroundColor: "var(--highlighter2)"}}>Schedule</h2>
                  <textarea id="schedule-area" style={{width:"100%", height:"75%"}} defaultValue={schedule}></textarea>
              </div>
              <div id="notes" className="app">
                  <h2 style={{backgroundColor: "var(--highlighter4)"}}>Notes</h2>
                  <textarea id="notes-area" style={{width:"100%", height:"75%"}} defaultValue={notes}></textarea>
              </div>
              <div id="weather" className="app-double">
                  <h2 style={{backgroundColor: "var(--highlighter5)"}}>Weather ({settings.weatherLocation})</h2>
                  <div style={{display:"flex", flexDirection:"row", fontSize:"x-large", fontWeight:"lighter", height:"75%"}}>
                      <div style={{width:"400px", display:"flex", marginLeft:"60px", marginTop:"20px"}}>
                          <p>
                              <b>- TODAY -</b><br/>
                              <span>{today.description}</span><br/>
                              Current: <span>{today.currentTemp}</span> &deg;F<br/>
                              High: <span>{today.highTemp}</span> &deg;F<br/>
                              Low: <span>{today.lowTemp}</span> &deg;F<br/>
                              Precipitation: <span>{today.precipitation}</span>%
                          </p>
                          {today.icon && <img src={today.icon} style={{height:"100px", margin:"10px"}} alt="weather-today"/>}
                      </div>
                      <div style={{width:"400px", display:"flex", marginTop:"20px"}}>
                          <p>
                              <b>- TOMORROW -</b><br/>
                              <span>{tomorrow.description}</span><br/>
                              Current: <span>{tomorrow.averageTemp}</span> &deg;F<br/>
                              High: <span>{tomorrow.highTemp}</span> &deg;F<br/>
                              Low: <span>{tomorrow.lowTemp}</span> &deg;F<br/>
                              Precipitation: <span>{tomorrow.precipitation}</span>%
                          </p>
                          {tomorrow.icon && <img src={tomorrow.icon} style={{height:"100px", margin:"10px"}} alt="weather-tomorrow"/>}
                      </div>
                  </div>
              </div>
          </div>
          <div id="todiary" className="navigator" onClick={() => this.setState({page: "diary"})}>&#12297;</div>
        </div>
      );
    } else {
      var diary = localStorage.getItem("diary");
      return (
        <div id="content-container">
          <div id="tohome" className="navigator" onClick={() => this.setState({page: "home"})}>&#12296;</div>
          <div className="app-container">
              <div className="app" style={{width: "80vw", height: "65vh"}}>
                  <textarea id="diary-area" style={{width:"100%", height:"100%"}} defaultValue={diary}></textarea>
              </div>
          </div>
        </div>
      )
    }
  }
}

export default App;
