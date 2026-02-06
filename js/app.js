/**
 * Aerauliqa IAQ Monitoring App
 * Main Application Logic
 */

// ===================================
// AQI LEVEL DEFINITIONS
// ===================================
const AQI_LEVELS = {
    EXCELLENT: {
        level: 1,
        status: 'Excellent',
        color: 'var(--aqi-excellent)',
        glow: 'var(--aqi-excellent-glow)',
        tip: {
            icon: '✨',
            title: 'Air quality is excellent',
            text: 'Pristine air conditions! Ideal for all activities including exercise and deep work.'
        }
    },
    GOOD: {
        level: 2,
        status: 'Good',
        color: 'var(--aqi-good)',
        glow: 'var(--aqi-good-glow)',
        tip: {
            icon: '💨',
            title: 'Air quality is good',
            text: 'Perfect conditions for indoor activities. Keep up the good ventilation!'
        }
    },
    POOR: {
        level: 3,
        status: 'Poor',
        color: 'var(--aqi-poor)',
        glow: 'var(--aqi-poor-glow)',
        tip: {
            icon: '🪟',
            title: 'Air quality is declining',
            text: 'Consider opening windows or increasing ventilation to improve air circulation.'
        }
    },
    VERY_POOR: {
        level: 4,
        status: 'Very Poor',
        color: 'var(--aqi-bad)',
        glow: 'var(--aqi-bad-glow)',
        tip: {
            icon: '⚠️',
            title: 'Air quality needs attention',
            text: 'Ventilate immediately. Reduce indoor pollution sources and consider stepping outside.'
        }
    }
};

// ===================================
// SENSOR THRESHOLDS
// ===================================
const THRESHOLDS = {
    temperature: { min: 18, ideal_min: 20, ideal_max: 26, max: 30 },
    humidity: { min: 30, ideal_min: 40, ideal_max: 60, max: 70 },
    co2: { excellent: 600, good: 1000, poor: 1500, max: 2500 },
    voc: { excellent: 25, good: 50, poor: 100, max: 200 }
};

// ===================================
// APP STATE
// ===================================
let appState = {
    connected: true,
    currentAQI: 2,
    sensors: {
        temperature: 24.5,
        humidity: 45,
        co2: 650,
        voc: 28
    }
};

// ===================================
// DOM ELEMENTS
// ===================================
const elements = {
    // AQI Elements
    aqiHero: document.getElementById('aqiHero'),
    aqiRing: document.getElementById('aqiRing'),
    aqiValue: document.getElementById('aqiValue'),
    aqiStatus: document.getElementById('aqiStatus'),
    aqiProgressBar: document.getElementById('aqiProgressBar'),
    ledIndicator: document.getElementById('ledIndicator'),
    
    // Sensor Elements
    tempValue: document.getElementById('tempValue'),
    humidityValue: document.getElementById('humidityValue'),
    co2Value: document.getElementById('co2Value'),
    vocValue: document.getElementById('vocValue'),
    
    // Range Elements
    tempRange: document.getElementById('tempRange'),
    humidityRange: document.getElementById('humidityRange'),
    co2Range: document.getElementById('co2Range'),
    vocRange: document.getElementById('vocRange'),
    
    // Markers
    tempMarker: document.getElementById('tempMarker'),
    humidityMarker: document.getElementById('humidityMarker'),
    co2Marker: document.getElementById('co2Marker'),
    vocMarker: document.getElementById('vocMarker'),
    
    // Tips
    tipTitle: document.getElementById('tipTitle'),
    tipText: document.getElementById('tipText'),
    tipsSection: document.getElementById('tipsSection'),
    
    // Connection
    connectionStatus: document.getElementById('connectionStatus')
};

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Calculate percentage for range visualization
 */
function calculateRangePercentage(value, sensor) {
    const th = THRESHOLDS[sensor];
    
    switch(sensor) {
        case 'temperature':
            return Math.min(100, Math.max(0, ((value - th.min) / (th.max - th.min)) * 100));
        case 'humidity':
            return Math.min(100, Math.max(0, ((value - th.min) / (th.max - th.min)) * 100));
        case 'co2':
            return Math.min(100, Math.max(0, (value / th.max) * 100));
        case 'voc':
            return Math.min(100, Math.max(0, (value / th.max) * 100));
        default:
            return 50;
    }
}

/**
 * Calculate AQI based on all sensor readings
 */
function calculateAQI(sensors) {
    const { temperature, humidity, co2, voc } = sensors;
    const th = THRESHOLDS;
    
    // Score each parameter (lower is better, 1-4 scale)
    let scores = [];
    
    // Temperature score
    if (temperature >= th.temperature.ideal_min && temperature <= th.temperature.ideal_max) {
        scores.push(1);
    } else if (temperature >= th.temperature.min && temperature <= th.temperature.max) {
        scores.push(2);
    } else {
        scores.push(3);
    }
    
    // Humidity score
    if (humidity >= th.humidity.ideal_min && humidity <= th.humidity.ideal_max) {
        scores.push(1);
    } else if (humidity >= th.humidity.min && humidity <= th.humidity.max) {
        scores.push(2);
    } else {
        scores.push(3);
    }
    
    // CO2 score (most impactful)
    if (co2 <= th.co2.excellent) {
        scores.push(1);
    } else if (co2 <= th.co2.good) {
        scores.push(2);
    } else if (co2 <= th.co2.poor) {
        scores.push(3);
    } else {
        scores.push(4);
    }
    
    // VOC score
    if (voc <= th.voc.excellent) {
        scores.push(1);
    } else if (voc <= th.voc.good) {
        scores.push(2);
    } else if (voc <= th.voc.poor) {
        scores.push(3);
    } else {
        scores.push(4);
    }
    
    // Overall AQI is the worst individual score (conservative approach)
    const maxScore = Math.max(...scores);
    
    // If all scores are excellent, return 1
    // Otherwise, calculate weighted average with emphasis on worst score
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const finalScore = Math.round((maxScore * 0.6) + (avgScore * 0.4));
    
    return Math.min(4, Math.max(1, finalScore));
}

/**
 * Get AQI level configuration
 */
function getAQILevel(aqi) {
    switch(aqi) {
        case 1: return AQI_LEVELS.EXCELLENT;
        case 2: return AQI_LEVELS.GOOD;
        case 3: return AQI_LEVELS.POOR;
        case 4: return AQI_LEVELS.VERY_POOR;
        default: return AQI_LEVELS.GOOD;
    }
}

/**
 * Animate value change with smooth transition
 */
function animateValue(element, newValue, decimals = 0) {
    if (!element) return;
    
    element.classList.add('updating');
    setTimeout(() => {
        element.textContent = typeof newValue === 'number' 
            ? newValue.toFixed(decimals) 
            : newValue;
        element.classList.remove('updating');
    }, 150);
}

// ===================================
// UPDATE FUNCTIONS
// ===================================

/**
 * Update AQI display
 */
function updateAQI(aqi) {
    const level = getAQILevel(aqi);
    const root = document.documentElement;
    
    // Update CSS custom properties
    root.style.setProperty('--current-aqi-color', level.color);
    root.style.setProperty('--current-aqi-glow', level.glow);
    
    // Update AQI value and status
    animateValue(elements.aqiValue, aqi);
    animateValue(elements.aqiStatus, level.status);
    
    // Update progress ring (4 levels = 25% each)
    // Full circle = 565.48, so each level = 141.37
    const circumference = 565.48;
    const progress = (aqi / 4) * circumference;
    const offset = circumference - progress;
    
    if (elements.aqiProgressBar) {
        elements.aqiProgressBar.style.strokeDashoffset = offset;
    }
    
    // Update tips
    updateTips(level.tip);
}

/**
 * Update sensor displays
 */
function updateSensors(sensors) {
    // Temperature
    animateValue(elements.tempValue, sensors.temperature, 1);
    const tempPercent = calculateRangePercentage(sensors.temperature, 'temperature');
    if (elements.tempRange) elements.tempRange.style.width = `${tempPercent}%`;
    if (elements.tempMarker) elements.tempMarker.style.left = `${tempPercent}%`;
    
    // Humidity
    animateValue(elements.humidityValue, sensors.humidity, 0);
    const humidityPercent = calculateRangePercentage(sensors.humidity, 'humidity');
    if (elements.humidityRange) elements.humidityRange.style.width = `${humidityPercent}%`;
    if (elements.humidityMarker) elements.humidityMarker.style.left = `${humidityPercent}%`;
    
    // CO2
    animateValue(elements.co2Value, sensors.co2, 0);
    const co2Percent = calculateRangePercentage(sensors.co2, 'co2');
    if (elements.co2Range) elements.co2Range.style.width = `${co2Percent}%`;
    if (elements.co2Marker) elements.co2Marker.style.left = `${co2Percent}%`;
    
    // VOC
    animateValue(elements.vocValue, sensors.voc, 0);
    const vocPercent = calculateRangePercentage(sensors.voc, 'voc');
    if (elements.vocRange) elements.vocRange.style.width = `${vocPercent}%`;
    if (elements.vocMarker) elements.vocMarker.style.left = `${vocPercent}%`;
}

/**
 * Update tips section
 */
function updateTips(tip) {
    const tipIcon = document.querySelector('.tip-icon');
    if (tipIcon) tipIcon.textContent = tip.icon;
    if (elements.tipTitle) elements.tipTitle.textContent = tip.title;
    if (elements.tipText) elements.tipText.textContent = tip.text;
}

/**
 * Update connection status
 */
function updateConnectionStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (connected) {
        statusDot?.classList.add('connected');
        statusDot?.classList.remove('disconnected');
        if (statusText) statusText.textContent = 'Connected';
    } else {
        statusDot?.classList.remove('connected');
        statusDot?.classList.add('disconnected');
        if (statusText) statusText.textContent = 'Disconnected';
    }
}

// ===================================
// SIMULATION (Demo Mode)
// ===================================

/**
 * Simulate sensor data changes for demo purposes
 * In production, this would be replaced with actual device communication
 */
function simulateSensorData() {
    // Slight random variations to simulate real sensor behavior
    const variation = {
        temperature: (Math.random() - 0.5) * 0.4,
        humidity: (Math.random() - 0.5) * 1,
        co2: Math.floor((Math.random() - 0.5) * 30),
        voc: Math.floor((Math.random() - 0.5) * 5)
    };
    
    // Apply variations with bounds
    appState.sensors.temperature = Math.max(15, Math.min(35, 
        appState.sensors.temperature + variation.temperature));
    appState.sensors.humidity = Math.max(20, Math.min(80, 
        appState.sensors.humidity + variation.humidity));
    appState.sensors.co2 = Math.max(400, Math.min(2500, 
        appState.sensors.co2 + variation.co2));
    appState.sensors.voc = Math.max(10, Math.min(200, 
        appState.sensors.voc + variation.voc));
    
    // Calculate new AQI
    appState.currentAQI = calculateAQI(appState.sensors);
    
    // Update UI
    updateSensors(appState.sensors);
    updateAQI(appState.currentAQI);
}

// ===================================
// NAVIGATION
// ===================================

/**
 * Handle navigation clicks
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active to clicked
            item.classList.add('active');
            
            // Handle page navigation (placeholder for future implementation)
            const page = item.dataset.page;
            console.log(`Navigating to: ${page}`);
            
            // For demo, show a subtle feedback
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
                item.style.transform = '';
            }, 150);
        });
    });
}

// ===================================
// INITIALIZATION
// ===================================

/**
 * Initialize the application
 */
function init() {
    console.log('🌬️ Aerauliqa IAQ Monitor Initialized');
    
    // Initial render
    updateSensors(appState.sensors);
    updateAQI(appState.currentAQI);
    updateConnectionStatus(appState.connected);
    
    // Setup navigation
    setupNavigation();
    
    // Start simulation for demo (update every 3 seconds)
    setInterval(simulateSensorData, 3000);
    
    // Add touch feedback for sensor cards
    document.querySelectorAll('.sensor-card').forEach(card => {
        card.addEventListener('touchstart', () => {
            card.style.transform = 'scale(0.98)';
        });
        card.addEventListener('touchend', () => {
            card.style.transform = '';
        });
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===================================
// DEMO CONTROLS (Development Only)
// ===================================

/**
 * Expose demo functions for testing different AQI levels
 * Usage in console: setDemoAQI(1) for Excellent, setDemoAQI(4) for Very Poor
 */
window.setDemoAQI = function(level) {
    const scenarios = {
        1: { temperature: 22, humidity: 50, co2: 450, voc: 15 },
        2: { temperature: 24, humidity: 45, co2: 750, voc: 35 },
        3: { temperature: 27, humidity: 35, co2: 1200, voc: 75 },
        4: { temperature: 30, humidity: 70, co2: 2000, voc: 150 }
    };
    
    if (scenarios[level]) {
        appState.sensors = { ...scenarios[level] };
        appState.currentAQI = level;
        updateSensors(appState.sensors);
        updateAQI(appState.currentAQI);
        console.log(`Demo AQI set to level ${level}`);
    }
};

window.toggleConnection = function() {
    appState.connected = !appState.connected;
    updateConnectionStatus(appState.connected);
    console.log(`Connection: ${appState.connected ? 'Connected' : 'Disconnected'}`);
};
