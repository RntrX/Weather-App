const API_KEY = "379a6eb24d7b63efe749013b96491bb3";  // Replace with your OpenWeatherMap API key
const CUSTOMER_ADDRESS = "7721 111th pl SE, Newcastle, Washington 98056";
let currentDispatchStatus = "inactive";
let currentTeamMember = null;
let serviceStartTime = null;
const savedEmails = new Set();

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadDefaultWeather();
    initializeTeamControls();
    initializeServiceControls();
    initializeNotifications();
    
    // Add event listeners for dispatch buttons
    document.getElementById('customerRequestBtn').addEventListener('click', handleCustomerRequest);
    document.getElementById('manualDispatchBtn').addEventListener('click', handleManualDispatch);
    document.getElementById('cancelDispatchBtn').addEventListener('click', handleDispatchCancel);
});

// Weather Functions
function loadDefaultWeather() {
    getWeatherByCoords(47.5329, -122.1637); // Newcastle, WA coordinates
}

async function getWeatherByCoords(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=imperial&appid=${API_KEY}`
        );
        const data = await response.json();
        updateWeatherDisplay(data);
        checkSnowConditions(data);
    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching weather data. Please try again.');
    }
}

async function getWeather(city) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${API_KEY}`
        );
        const data = await response.json();
        
        if (data.cod === '404') {
            alert('City not found! Please try again.');
            return;
        }
        
        updateWeatherDisplay(data);
        checkSnowConditions(data);
    } catch (error) {
        console.error('Error:', error);
        alert('Error fetching weather data. Please try again.');
    }
}

function updateWeatherDisplay(data) {
    const weatherDiv = document.getElementById('weather-display');
    weatherDiv.innerHTML = `
        <div class="weather-info">
            <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="Weather icon">
            <div class="temperature">${Math.round(data.main.temp)}°F</div>
            <div class="description">${data.weather[0].description}</div>
            <div class="details">
                <p>Feels like: ${Math.round(data.main.feels_like)}°F</p>
                <p>Humidity: ${data.main.humidity}%</p>
                <p>Wind Speed: ${data.wind.speed} mph</p>
            </div>
        </div>
    `;
}

// Team Management Functions
function initializeTeamControls() {
    const teamSelect = document.getElementById('teamMemberSelect');
    teamSelect.addEventListener('change', handleTeamSelection);

    const etaInput = document.getElementById('etaTime');
    etaInput.addEventListener('change', handleEtaUpdate);
}

function handleTeamSelection(event) {
    currentTeamMember = event.target.value;
    if (currentTeamMember) {
        document.getElementById('startServiceBtn').disabled = false;
        updateStatus('pending', `Team member assigned`);
    }
}

function handleEtaUpdate(event) {
    const eta = event.target.value;
    if (eta && currentTeamMember) {
        updateStatus('pending', `ETA set to ${eta}`);
    }
}

// Service Control Functions
function initializeServiceControls() {
    document.getElementById('startServiceBtn').addEventListener('click', handleServiceStart);
    document.getElementById('completeServiceBtn').addEventListener('click', handleServiceComplete);
}

function handleServiceStart() {
    if (currentTeamMember) {
        serviceStartTime = new Date();
        document.getElementById('startServiceBtn').disabled = true;
        document.getElementById('completeServiceBtn').disabled = false;
        updateStatus('active', `Service started`);
    }
}

function handleServiceComplete() {
    if (currentTeamMember && serviceStartTime) {
        const duration = Math.round((new Date() - serviceStartTime) / 1000 / 60); // minutes
        document.getElementById('completeServiceBtn').disabled = true;
        updateStatus('inactive', `Service completed (Duration: ${duration} minutes)`);
        resetServiceControls();
    }
}

// Status Management Functions
function updateStatus(status, reason) {
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    currentDispatchStatus = status;

    statusIndicator.classList.remove('status-active', 'status-pending', 'status-inactive');
    statusIndicator.classList.add(`status-${status}`);

    statusText.textContent = `${reason}`;

    document.getElementById('manualDispatchBtn').disabled = status === 'active';
    document.getElementById('cancelDispatchBtn').disabled = status === 'inactive';
    document.getElementById('customerRequestBtn').disabled = status === 'active';

    addToLog(reason);
}

function addToLog(message) {
    const dispatchHistory = document.getElementById('dispatchHistory');
    const timestamp = new Date().toLocaleString();
    const logEntry = document.createElement('div');
    logEntry.classList.add('log-entry');
    logEntry.innerHTML = `
        <strong>${timestamp}</strong><br>
        ${message}
    `;
    dispatchHistory.insertBefore(logEntry, dispatchHistory.firstChild);
}

// Email Notification Functions
function initializeNotifications() {
    document.getElementById('emailNotifications').addEventListener('change', handleNotificationToggle);
    document.getElementById('saveEmailBtn').addEventListener('click', saveEmailAddress);
    loadSavedEmails();
}

function saveEmailAddress() {
    const emailInput = document.getElementById('notificationEmail');
    const statusElement = document.getElementById('emailSaveStatus');
    const email = emailInput.value.trim();

    if (!email || !email.includes('@') || !email.includes('.')) {
        statusElement.textContent = 'Please enter a valid email address';
        statusElement.className = 'save-status error';
        return;
    }

    savedEmails.add(email);
    localStorage.setItem('savedEmails', JSON.stringify([...savedEmails]));
    updateEmailList();
    
    emailInput.value = '';
    statusElement.textContent = 'Email saved successfully!';
    statusElement.className = 'save-status success';
    
    setTimeout(() => {
        statusElement.textContent = '';
    }, 3000);
}

function updateEmailList() {
    const emailList = document.getElementById('emailList');
    emailList.innerHTML = '';
    
    if (savedEmails.size === 0) {
        emailList.innerHTML = '<li>No emails subscribed yet</li>';
        return;
    }
    
    savedEmails.forEach(email => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${email}
            <button onclick="removeEmail('${email}')" class="remove-btn">Remove</button>
        `;
        emailList.appendChild(li);
    });
}

function removeEmail(email) {
    savedEmails.delete(email);
    localStorage.setItem('savedEmails', JSON.stringify([...savedEmails]));
    updateEmailList();
}

function loadSavedEmails() {
    const saved = localStorage.getItem('savedEmails');
    if (saved) {
        const emails = JSON.parse(saved);
        emails.forEach(email => savedEmails.add(email));
        updateEmailList();
    }
}

// Weather Condition Functions
function checkSnowConditions(data) {
    const weatherId = data.weather[0].id;
    const weatherDescription = data.weather[0].description.toLowerCase();
    const temp = data.main.temp;
    
    if ((weatherId >= 600 && weatherId <= 622) || 
        weatherDescription.includes('snow') || 
        (temp <= 32 && data.main.humidity > 70)) {
        updateStatus('active', 'Automatic dispatch due to snow conditions');
    } else if (currentDispatchStatus === 'active') {
        return;
    } else {
        updateStatus('inactive', 'No snow conditions detected');
    }
}

// Utility Functions
function getWeatherForCity() {
    const city = document.getElementById('cityInput').value.trim();
    if (city) {
        getWeather(city);
    } else {
        alert('Please enter a city name');
    }
}

function handleCustomerRequest() {
    updateStatus('pending', 'Customer requested service');
}

function handleManualDispatch() {
    if (!currentTeamMember) {
        alert('Please select a team member first');
        return;
    }
    updateStatus('active', 'Manual dispatch initiated');
}

function handleDispatchCancel() {
    updateStatus('inactive', 'Dispatch cancelled');
    resetServiceControls();
}

function resetServiceControls() {
    currentTeamMember = null;
    serviceStartTime = null;
    document.getElementById('teamMemberSelect').value = '';
    document.getElementById('etaTime').value = '';
    document.getElementById('startServiceBtn').disabled = true;
    document.getElementById('completeServiceBtn').disabled = true;
}

function handleNotificationToggle() {
    // This function can be expanded to handle notification preferences
    console.log('Notification settings updated');
}