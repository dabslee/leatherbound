# Leatherbound

<img src="https://img.shields.io/badge/React-17.0.2-blue?style=flat-square&logo=react&logoColor=white"> <img src="https://img.shields.io/badge/Flask-3.1.2-black?style=flat-square&logo=flask&logoColor=white"> <img src="https://img.shields.io/badge/Chrome_Extension-MV3-yellow?style=flat-square&logo=google-chrome&logoColor=white">

Leatherbound is a custom new tab page for Google Chrome built with React and a small Flask backend. It replaces the default new tab page with a configurable dashboard featuring quick links, to-do lists, schedule management, notes, and weather updates. The application features a clean, leather-bound journal aesthetic with customizable fonts and themes.

![screenshot](public/leatherbound_screenshot.png)

## Key Features

*   **Quick Links:** Customizable shortcuts to your favorite websites with a variety of icon options.
*   **Productivity Tools:** Built-in areas for managing To-Do lists, Schedules, and Notes.
*   **Rich Text Formatting:** Ctrl-B for bolding, Ctrl-I for italics, Ctrl-U for underlining, Ctrl+Shift+7 for numbered lists, Ctrl+Shift+8 for bullet-pointed lists.
*   **Weather Updates:** Real-time weather information based on your location (City name or Zip code).
*   **Customization:** personalized the look and feel with different fonts, themes (Light/Dark/System), and font sizes.
*   **Cross-Session Persistence:** Settings and notes persist across sessions using cookies, or even cross-devices via authentication with a Flask backend.
*   **Data Management:** Import and export your entire configuration, including settings and content, to back up or transfer your setup.

## Installation

1.  Download the repository as a zip file and then unpack.
2.  In the root folder, create a `.env` file (you can see the `.env.example` file for the list of variables you need). You can create a free API key to use for `REACT_APP_WEATHER_API_KEY` [here](https://api.openweathermap.org). You can use `https://leatherbound.brandonssandbox.com/` as the `REACT_APP_FLASK_URI` to connect with an example backend for storing your personal notes and settings.
3.  Go to `chrome://extensions/` in your Chrome browser.
4.  Turn on **Developer mode** in the top right corner.
5.  Click the **Load unpacked** button.
6.  Select the `build` folder inside the unpacked repository.
7.  Open a new tab to see Leatherbound in action!

## Development

To run the project locally for development:

1.  Clone the repository.
2.  Run `npm install` to install dependencies.
3.  Run `npm start` to start the development server.

To build the extension for production:

1.  Run `npm run build`.
2.  The output will be in the `build` folder.
