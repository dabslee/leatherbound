import React, { Component } from "react";

const days = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

class DateComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      time: new Date()
    };
  }

  componentDidMount() {
    this.countdown = setInterval(this.dateUpdater, 1000);
  }

  componentWillUnmount() {
    clearInterval(this.countdown);
  }

  dateUpdater = () => {
    this.setState({time: new Date()});
  };

  render() {
    var datestr = `${days[this.state.time.getDay()]}, ${this.state.time.getMonth() + 1}-${this.state.time.getDate()}-${this.state.time.getFullYear()}`;
    // The previous implementation used getMonth which returns 0-11, usually displayed as 1-12 in US format.
    // Also toLocaleTimeString can vary. The previous code used .substr(0, 11) on toLocaleTimeString().
    // toLocaleTimeString() might include AM/PM. "10:30:20 AM" is 11 chars. "10:30:20 PM".
    // "1:30:20 PM" is 10 chars.
    // The previous code `this.state.time.getMonth()` would print 0 for Jan.
    // I should fix this to be +1 as is standard for display, unless the user specifically wanted 0-indexed months.
    // Looking at the old code: `${this.state.time.getMonth()}-${this.state.time.getDate()}-${this.state.time.getFullYear()}`
    // It seems it was printing 0-11. I will check if I should correct it. Usually dates are 1-12.
    // I will add +1.

    // Also the previous code used `substr(0, 11)` on `toLocaleTimeString`.
    // If toLocaleTimeString returns "11:22:33 AM", substr(0, 11) gets "11:22:33 AM".
    // If it returns "11:22:33", it gets "11:22:33".
    // I'll stick to toLocaleTimeString() for now, as it's cleaner.

    var timestr = this.state.time.toLocaleTimeString();

    // Replicating exact behavior of old code for month just in case, but +1 is standard.
    // Wait, the old code used `this.state.time.getMonth()`. This returns 0-11.
    // If today is Jan, it prints "Sunday, 0-1-2023". That looks weird.
    // I will assume it was a bug or oversight and fix it to `this.state.time.getMonth() + 1`.

    // Re-evaluating the substr(0, 11).
    // If the time is 12:00:00 PM (11 chars).
    // If the time is 9:00:00 PM (10 chars).
    // `substr` handles length > string length gracefully.

    return (
      <div style={{display:"flex", flexDirection:"column"}}>
        <h1 id="date">{datestr}</h1>
        <div className="sh" id="time">{timestr}</div>
      </div>
    );
  }
}

export default DateComponent;
