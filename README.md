# dayleaf

A calm personal workspace in a cream and dusty-blue palette: daily entries (a distraction-free writing view and a pinboard canvas), a journal, notes, calendar with events, habit tracker, projects, goals from overarching goals down to the day, and an About Me planning space.

Plain HTML, CSS and JavaScript. There is no build step, no dependencies and no server. Everything is stored in the browser.

## Run it

Open `index.html` in a browser. To serve it locally instead:

```bash
npx serve .
```

## Features

- **Daily entry**: Write mode with a rich-text editor, or Board mode with schedule, habits, to-dos, goals, notes and a canvas for notes, images and drawing
- **Journal and notes**: this week up front, older posts browsable by week, month or year
- **Calendar**: month and agenda views, repeating events that appear in the daily entry on the day
- **Habit tracker**: per-habit colour, schedule, streaks and a 28-day view
- **Goals**: overarching goals with a year, month, week, day tree, plus banner images on every tab
- **Years**: switch the whole site between years, review a year, and start a new one with carry-over
- **About Me**: identity, values, affirmations, life wheel, letters to your future self, vision board
- **Privacy**: optional PIN lock with AES-GCM encrypted storage, auto-lock and a timed pause after wrong attempts. Manual backup and restore from Settings on desktop

## Data and privacy

All data lives in your browser's local storage on your device. Nothing is sent anywhere. Backups are plain JSON files, so keep them somewhere safe. If you forget your PIN the data cannot be recovered.

## Layout

```
index.html        page shell
css/styles.css    all styles (responsive: phone, tablet, laptop, wide)
js/               utils, quotes, store, security, mascot, board, editor, views, app
assets/mascot.png the bunny
```
