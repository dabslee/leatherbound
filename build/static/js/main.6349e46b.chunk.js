(this.webpackJsonpleatherbound=this.webpackJsonpleatherbound||[]).push([[0],{10:function(t,e,i){},13:function(t,e,i){"use strict";i.r(e);var n=i(1),c=i.n(n),s=i(4),o=i.n(s),r=(i(9),i(10),i(3)),a=i.n(r),d=i(0),l="9237036ab7c0bf80dd4223ff17715372",h={"01d":"sun--v1","01n":"bright-moon","02d":"partly-cloudy-day--v1","02n":"partly-cloudy-night","03d":"cloud","03n":"cloud","04d":"cloud","04n":"cloud","09d":"rain","09n":"rain","10d":"rain","10n":"rain","11d":"storm--v1","11n":"storm--v1","13d":"snow-storm","13n":"snow-storm","50d":"foggy-night-1","50n":"foggy-night-1"};function p(t){return Math.round(1.8*(t-273.15)+32)}var j=a()({getInitialState:function(){return{page:"home"}},componentDidMount:function(){fetch("https://api.openweathermap.org/data/2.5/weather?id=5102922&appid=".concat(l)).then((function(t){return t.json()})).then((function(t){document.getElementById("description-today").innerHTML=t.weather[0].description,document.getElementById("current-temp-today").innerHTML=p(t.main.temp),document.getElementById("high-temp-today").innerHTML=p(t.main.temp_max),document.getElementById("low-temp-today").innerHTML=p(t.main.temp_min),document.getElementById("icon-today").src="https://img.icons8.com/plasticine/400/000000/"+h[t.weather[0].icon]+".png"})),fetch("https://api.openweathermap.org/data/2.5/forecast?id=5102922&appid=".concat(l)).then((function(t){return t.json()})).then((function(t){document.getElementById("precipitation-today").innerHTML=100*t.list[0].pop,console.log(t.list[8].weather[0].description),document.getElementById("description-tomorrow").innerHTML=t.list[8].weather[0].description,document.getElementById("average-temp-tomorrow").innerHTML=p(t.list[8].main.temp),document.getElementById("high-temp-tomorrow").innerHTML=p(t.list[8].main.temp_max),document.getElementById("low-temp-tomorrow").innerHTML=p(t.list[8].main.temp_min),document.getElementById("precipitation-tomorrow").innerHTML=100*t.list[8].pop,document.getElementById("icon-tomorrow").src="https://img.icons8.com/plasticine/400/000000/"+h[t.list[8].weather[0].icon]+".png"}))},render:function(){var t=this,e=localStorage.getItem("schedule"),i=localStorage.getItem("todo"),n=localStorage.getItem("notes");if("home"==this.state.page)return Object(d.jsxs)("div",{id:"content-container",children:[Object(d.jsxs)("div",{id:"app-container",children:[Object(d.jsxs)("div",{id:"quicklinks",class:"app-double",children:[Object(d.jsx)("h2",{style:{backgroundColor:"var(--highlighter1)"},children:"Quick Links"}),Object(d.jsxs)("div",{id:"quicklinks-container",children:[Object(d.jsxs)("a",{href:"https://www.gmail.com",class:"link-icon",children:[Object(d.jsx)("img",{src:"https://img.icons8.com/plasticine/400/000000/gmail.png",style:{width:"100px"}}),Object(d.jsx)("figcaption",{children:"Mail"})]}),Object(d.jsxs)("a",{href:"https://www.drive.google.com",class:"link-icon",children:[Object(d.jsx)("img",{src:"https://img.icons8.com/plasticine/400/000000/google-drive.png",style:{width:"100px"}}),Object(d.jsx)("figcaption",{children:"Drive"})]}),Object(d.jsxs)("a",{href:"https://calendar.google.com/",class:"link-icon",children:[Object(d.jsx)("img",{src:"https://img.icons8.com/plasticine/400/000000/google-calendar.png",style:{width:"100px"}}),Object(d.jsx)("figcaption",{children:"Calendar"})]}),Object(d.jsxs)("a",{href:"https://phubprod.princeton.edu/psp/phubprod/?cmd=start",class:"link-icon",children:[Object(d.jsx)("img",{src:"https://img.icons8.com/plasticine/400/000000/fox.png",style:{width:"100px"}}),Object(d.jsx)("figcaption",{children:"TigerHub"})]}),Object(d.jsxs)("a",{href:"https://play.spotify.com/",class:"link-icon",children:[Object(d.jsx)("img",{src:"https://img.icons8.com/plasticine/400/000000/spotify.png",style:{width:"100px"}}),Object(d.jsx)("figcaption",{children:"Spotify"})]}),Object(d.jsxs)("a",{href:"https://github.com/",class:"link-icon",children:[Object(d.jsx)("img",{src:"https://img.icons8.com/plasticine/400/000000/github--v1.png",style:{width:"100px"}}),Object(d.jsx)("figcaption",{children:"GitHub"})]}),Object(d.jsxs)("a",{href:"https://blackboard.princeton.edu/",class:"link-icon",children:[Object(d.jsx)("img",{src:"https://img.icons8.com/plasticine/400/000000  /compose.png",style:{width:"100px"}}),Object(d.jsx)("figcaption",{children:"BlackBoard"})]}),Object(d.jsxs)("a",{href:"https://canvas.princeton.edu/",class:"link-icon",children:[Object(d.jsx)("img",{src:"https://img.icons8.com/plasticine/400/000000/canvas-student.png",style:{width:"100px"}}),Object(d.jsx)("figcaption",{children:"Canvas"})]})]})]}),Object(d.jsxs)("div",{id:"todo",class:"app-double",children:[Object(d.jsx)("h2",{style:{backgroundColor:"var(--highlighter3)"},children:"To do"}),Object(d.jsx)("textarea",{id:"todo-area",style:{width:"100%",height:"75%"},children:i})]}),Object(d.jsxs)("div",{id:"schedule",class:"app",children:[Object(d.jsx)("h2",{style:{backgroundColor:"var(--highlighter2)"},children:"Schedule"}),Object(d.jsx)("textarea",{id:"schedule-area",style:{width:"100%",height:"75%"},children:e})]}),Object(d.jsxs)("div",{id:"notes",class:"app",children:[Object(d.jsx)("h2",{style:{backgroundColor:"var(--highlighter4)"},children:"Notes"}),Object(d.jsx)("textarea",{id:"notes-area",style:{width:"100%",height:"75%"},children:n})]}),Object(d.jsxs)("div",{id:"weather",class:"app-double",children:[Object(d.jsx)("h2",{style:{backgroundColor:"var(--highlighter5)"},children:"Weather"}),Object(d.jsxs)("div",{style:{display:"flex",flexDirection:"row",fontSize:"x-large",fontWeight:"lighter",height:"75%"},children:[Object(d.jsxs)("div",{style:{width:"400px",display:"flex",marginLeft:"60px",marginTop:"20px"},children:[Object(d.jsxs)("p",{children:[Object(d.jsx)("b",{children:"- TODAY -"}),Object(d.jsx)("br",{}),Object(d.jsx)("span",{id:"description-today"}),Object(d.jsx)("br",{}),"Current: ",Object(d.jsx)("span",{id:"current-temp-today"})," \xb0F",Object(d.jsx)("br",{}),"High: ",Object(d.jsx)("span",{id:"high-temp-today"})," \xb0F",Object(d.jsx)("br",{}),"Low: ",Object(d.jsx)("span",{id:"low-temp-today"})," \xb0F",Object(d.jsx)("br",{}),"Precipitation: ",Object(d.jsx)("span",{id:"precipitation-today"}),"%"]}),Object(d.jsx)("img",{id:"icon-today",src:"https://img.icons8.com/plasticine/400/000000/sun--v1.png",style:{height:"100px",margin:"10px"}})]}),Object(d.jsxs)("div",{style:{width:"400px",display:"flex",marginTop:"20px"},children:[Object(d.jsxs)("p",{children:[Object(d.jsx)("b",{children:"- TOMORROW -"}),Object(d.jsx)("br",{}),Object(d.jsx)("span",{id:"description-tomorrow"}),Object(d.jsx)("br",{}),"Current: ",Object(d.jsx)("span",{id:"average-temp-tomorrow"})," \xb0F",Object(d.jsx)("br",{}),"High: ",Object(d.jsx)("span",{id:"high-temp-tomorrow"})," \xb0F",Object(d.jsx)("br",{}),"Low: ",Object(d.jsx)("span",{id:"low-temp-tomorrow"})," \xb0F",Object(d.jsx)("br",{}),"Precipitation: ",Object(d.jsx)("span",{id:"precipitation-tomorrow"}),"%"]}),Object(d.jsx)("img",{id:"icon-tomorrow",src:"https://img.icons8.com/plasticine/400/000000/sun--v1.png",style:{height:"100px",margin:"10px"}})]})]})]})]}),Object(d.jsx)("div",{id:"todiary",class:"navigator",onClick:function(){return t.setState({page:"diary"})},children:"\u3009"})]});var c=localStorage.getItem("diary");return Object(d.jsxs)("div",{id:"content-container",children:[Object(d.jsx)("div",{id:"tohome",class:"navigator",onClick:function(){return t.setState({page:"home"})},children:"\u3008"}),Object(d.jsx)("div",{class:"app-container",children:Object(d.jsx)("div",{class:"app",style:{width:"80vw",height:"65vh"},children:Object(d.jsx)("textarea",{id:"diary-area",style:{width:"100%",height:"100%"},children:c})})})]})}}),m={0:"Sunday",1:"Monday",2:"Tuesday",3:"Wednesday",4:"Thursday",5:"Friday",6:"Saturday"},g=a()({getInitialState:function(){return{time:new Date}},componentDidMount:function(){this.countdown=setInterval(this.dateUpdater,1e3)},componentWillUnmount:function(){clearInterval(this.countdown)},dateUpdater:function(){this.setState({time:new Date})},render:function(){var t="".concat(m[this.state.time.getDay()],", ").concat(this.state.time.getMonth(),"-").concat(this.state.time.getDate(),"-").concat(this.state.time.getFullYear()),e=this.state.time.toLocaleTimeString().substr(0,11);return Object(d.jsxs)("div",{style:{display:"flex",flexDirection:"column"},children:[Object(d.jsx)("h1",{id:"date",children:t}),Object(d.jsx)("div",{class:"sh",id:"time",children:e})]})}});function b(){for(var t=["schedule","todo","notes","diary"],e=0;e<5;e++){var i=document.getElementById(t[e]+"-area");i&&localStorage.setItem(t[e],i.value)}}o.a.render(Object(d.jsxs)(c.a.StrictMode,{children:[Object(d.jsxs)("div",{id:"header-container",children:[Object(d.jsx)(g,{}),Object(d.jsx)("div",{id:"logo",children:"\xa7 leatherbound"})]}),Object(d.jsx)(j,{}),Object(d.jsxs)("div",{id:"footer-container",children:[Object(d.jsx)("p",{children:"\xa9 Brandon Lee, 2021 \u2022 all rights reserved"}),Object(d.jsxs)("div",{style:{display:"flex",flexDirection:"row",alignItems:"center"},children:[Object(d.jsxs)("div",{class:"theme-switch-wrapper",children:[Object(d.jsxs)("label",{class:"theme-switch",for:"checkbox",children:[Object(d.jsx)("input",{type:"checkbox",id:"checkbox"}),Object(d.jsx)("div",{class:"slider round"})]}),Object(d.jsx)("div",{style:{fontStyle:"normal"},children:"\u2002\u263e"})]}),Object(d.jsx)("div",{children:Object(d.jsx)("a",{href:"http://brandonssandbox.com/",children:"BrandonsSandbox.com"})})]})]})]}),document.getElementById("root"),(function(){window.onunload=function(){b()},window.onkeypress=function(){b()},window.onkeydown=function(){b(),console.log("saved")}}));var x=document.querySelector('.theme-switch input[type="checkbox"]'),u=localStorage.getItem("theme");u&&(document.documentElement.setAttribute("data-theme",u),"dark"===u&&(x.checked=!0)),x.addEventListener("change",(function(t){t.target.checked?(document.documentElement.setAttribute("data-theme","dark"),localStorage.setItem("theme","dark")):(document.documentElement.setAttribute("data-theme","light"),localStorage.setItem("theme","light"))}),!1)},9:function(t,e,i){}},[[13,1,2]]]);
//# sourceMappingURL=main.6349e46b.chunk.js.map