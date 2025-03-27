// Timer variables
let timeLeft = 25 * 60; // 25 minutes in seconds
let isRunning = false;
let currentMode = 'pomodoro'; // pomodoro, short-break, long-break
let soundEnabled = true;

// DOM elements
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('start-btn');
const pomodoroBtn = document.getElementById('pomodoro');
const shortBreakBtn = document.getElementById('short-break');
const longBreakBtn = document.getElementById('long-break');
const timerEndSound = document.getElementById('timer-end-sound');

// Timer modes with their durations in minutes
const modes = {
    'pomodoro': 25,
    'short-break': 5,
    'long-break': 15
};

// Initialize Web Worker for timer
const timerWorker = new Worker(URL.createObjectURL(new Blob([`
    let timer;
    let timeLeft;
    let lastTime;

    self.onmessage = function(e) {
        if (e.data.command === 'start') {
            timeLeft = e.data.timeLeft;
            lastTime = Date.now();
            
            function tick() {
                const now = Date.now();
                const delta = now - lastTime;
                
                if (delta >= 1000) {
                    timeLeft -= Math.floor(delta / 1000);
                    lastTime = now - (delta % 1000);
                    self.postMessage({ timeLeft });
                    
                    if (timeLeft <= 0) {
                        self.postMessage({ finished: true });
                        return;
                    }
                }
                
                timer = requestAnimationFrame(tick);
            }
            
            tick();
        } else if (e.data.command === 'pause') {
            cancelAnimationFrame(timer);
        } else if (e.data.command === 'set') {
            timeLeft = e.data.timeLeft;
        }
    };
`], { type: 'text/javascript' })));

// Worker message handler
timerWorker.onmessage = function(e) {
    if (e.data.finished) {
        timerFinished();
    } else {
        timeLeft = e.data.timeLeft;
        updateDisplay();
    }
};

// Format time as MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update the timer display
function updateDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);
    saveSettings();
}

// Handle timer completion
function timerFinished() {
    isRunning = false;
    startBtn.textContent = 'START';
    
    if (soundEnabled) {
        timerEndSound.currentTime = 0;
        timerEndSound.play().catch(e => console.log("Audio play failed:", e));
    }
    
    // Auto-switch mode after completion
    if (currentMode === 'pomodoro') {
        // Implement your auto-switch logic here if desired
    }
    
    saveSettings();
}

// Start the timer
function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.textContent = 'PAUSE';
    timerWorker.postMessage({ 
        command: 'start', 
        timeLeft: timeLeft 
    });
}

// Pause the timer
function pauseTimer() {
    isRunning = false;
    startBtn.textContent = 'START';
    timerWorker.postMessage({ command: 'pause' });
    saveSettings();
}

// Set the timer mode
function setMode(mode) {
    currentMode = mode;
    timeLeft = modes[mode] * 60;
    
    // Update active button
    document.querySelectorAll('.timer-option').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(mode).classList.add('active');
    
    // Update worker with new time
    if (isRunning) {
        timerWorker.postMessage({ 
            command: 'set', 
            timeLeft: timeLeft 
        });
    }
    
    updateDisplay();
    saveSettings();
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('pomotectnicaSettings', JSON.stringify({
        soundEnabled,
        currentMode,
        timeLeft
    }));
}

// Load settings from localStorage
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('pomotectnicaSettings'));
    if (settings) {
        soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;
        currentMode = settings.currentMode || 'pomodoro';
        timeLeft = settings.timeLeft || modes[currentMode] * 60;
        
        // Update UI to reflect loaded settings
        document.getElementById(currentMode).classList.add('active');
    }
}

// Debounce function for button clicks
function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// Register service worker for PWA
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('ServiceWorker registration successful');
            }).catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
}

// Event listeners with debounce
startBtn.addEventListener('click', debounce(() => {
    if (isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}));

pomodoroBtn.addEventListener('click', debounce(() => setMode('pomodoro')));
shortBreakBtn.addEventListener('click', debounce(() => setMode('short-break')));
longBreakBtn.addEventListener('click', debounce(() => setMode('long-break')));

// For About Popup
function togglePopup() {
    const popup = document.getElementById("popupContent");
    popup.classList.toggle("show");
}

// Initialize
loadSettings();
updateDisplay();
registerServiceWorker();