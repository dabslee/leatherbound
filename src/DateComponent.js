import React from "react";
import createClass from 'create-react-class';

const months = {
  0: 'January',
  1: 'February',
  2: 'March',
  3: 'April',
  4: 'May',
  5: 'June',
  6: 'July',
  7: 'August',
  8: 'September',
  9: 'October',
  10: 'November',
  11: 'December'
};
const days = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday'
};

var DateComponent = createClass( {
  getInitialState: function() {
    return {time: new Date()};
  },

  componentDidMount: function() {
    this.countdown = setInterval(this.dateUpdater, 1000);
  },

  componentWillUnmount: function() {
    clearInterval(this.countdown);
  },

  dateUpdater: function() {
    this.setState({time: new Date()});
  },

  render: function() {
    var datestr = `${days[this.state.time.getDay()]}, ${this.state.time.getMonth()}-${this.state.time.getDate()}-${this.state.time.getFullYear()}`;
    var timestr = this.state.time.toLocaleTimeString().substr(0, 11);
    return (
      <div style={{display:"flex", flexDirection:"column"}}>
        <h1 id="date">{datestr}</h1>
        <div class="sh" id="time">{timestr}</div>
      </div>
    );
  }
} );

export default DateComponent;