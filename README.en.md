# Class 392 Random Student Selection System

A beautiful and practical classroom random student selection system, supporting multiple selection modes and fair weighting algorithms.

## Features

### 🎯 Core Features
- **Random Selection**: Multiple selection modes, supporting single or multiple students drawing
- **Fair Weighting**: Intelligently adjusts selection probability based on historical records
- **Inverse Probability**: Students not selected have a higher chance of being chosen next time
- **Grade Association**: Import grade data to assign rankings to students

### 📊 Data Statistics
- Real-time display of statistics such as selected student count, total students, draw count, etc.
- Progress bar visualization showing selection progress
- Complete history records, supporting detailed view of each selection session

### 🎨 Interface Features
- Genshin Impact-style quote display
- Multiple special student badge styles (Gold, Blue, Green, Cloud shapes, etc.)
- Exquisite animation effects (Confetti celebration animation)
- Rattlesnake animation effect

### 🕐 Class Schedule
- Real-time display of current class information
- Countdown for class periods
- Display information for the next class

### 🔧 Additional Features
- **Student Management**: Select/deselect students via modal window
- **Background Switching**: Support changing interface background
- **History Undo**: Support undoing the most recent selection record
- **Data Persistence**: Automatically save selection history

## Usage Instructions

### Basic Usage
1. Enter the number of students to select in the input box
2. Click the "Start Draw" button to perform random selection
3. Selection results will be displayed on the main interface and automatically recorded in history

### Switching Modes
- Click the mode switch button to toggle between "Normal Mode" and "Weighted Mode"
- In Weighted Mode, students selected fewer times have a higher probability of being chosen

### Student Management
1. Click the student list button in the sidebar to open the student management modal
2. Check/uncheck students in the modal
3. Supports Select All/Unselect All
4. Click "Confirm" to save selections

## File Structure

```
├── index.html              # Main Page
├── src/
│   ├── css/
│   │   └── styles.css     # Stylesheet
│   ├── js/
│   │   ├── script.js      # Core Logic (Selection Algorithm)
│   │   ├── schedule.js    # Schedule Management
│   │   ├── animation.js   # Animation Effects
│   │   ├── confetti.js    # Confetti Animation
│   │   ├── background.js  # Background Management
│   │   └── cdn-fallback.js # CDN Fallback Handling
│   └── assets/
│       ├── grades.csv     # Grade Data
│       └── ...            # Other Resource Files
└── tools/
    ├── README.md          # Toolset Documentation
    └── history-editor.user.js # History Record Editor
```

## Tech Stack

- **Frontend Framework**: Native HTML/CSS/JavaScript
- **Icon Library**: Font Awesome
- **Storage**: LocalStorage
- **Algorithms**: Weighted Random Selection, Inverse Probability Distribution

## Dependencies

- Font Awesome Icon Library (loaded via CDN)
- Google Fonts (Source Han Sans / Noto Sans SC)

## Extension Tools

### History Record Editor
Located at `tools/history-editor.user.js`, can be installed as a Userscript into browser extensions (like Tampermonkey) for:
- Visually edit selection history records
- Batch delete records
- Audit data changes

See `tools/README.md` for detailed usage instructions.

## License

MIT License