// Test mode - set to true to enable shorter countdown for testing
const TEST_MODE = false;
const TEST_COUNTDOWN_SECONDS = 30; // 30 seconds for testing

// For test mode: track virtual date that changes every TEST_COUNTDOWN_SECONDS
let virtualDate = new Date();

// Countries data will be loaded from JSON
let countries = [];

const QUESTION_MARK_IMG = "https://cdn.pixabay.com/photo/2015/12/23/23/15/question-mark-1106309_1280.png"; // You should provide this image in your project

// Full list of country names for autocomplete
const ALL_COUNTRY_NAMES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua & Deps","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Rep","Chad","Chile","China","Colombia","Comoros","Congo","Congo {Democratic Rep}","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","East Timor","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland {Republic}","Israel","Italy","Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar, {Burma}","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","Norway","Oman","Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","St Kitts & Nevis","St Lucia","Saint Vincent & the Grenadines","Samoa","San Marino","Sao Tome & Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Swaziland","Sweden","Switzerland","Syria","Tajikistan","Tanzania","Thailand","Togo","Tonga","Trinidad & Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

// Deterministically select today's country based on the date
function getTodayCountryIndex() {
    // Start date: 8th July 2025 (months are 0-based, so 6 = July)
    const startDate = new Date(2025, 6, 8);
    const dateToUse = TEST_MODE ? virtualDate : new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceStart = Math.floor((dateToUse - startDate) / msPerDay);
    // Ensure positive and wrap around
    return ((daysSinceStart % countries.length) + countries.length) % countries.length;
}

let countryIndex;
let country;
let currentHint = 0;
let gameOver = false;
let guessesUsed = 0;
let previousGuesses = [];

// Set the target time for the countdown
let targetTime;

const hintLabel = document.getElementById('hint-label');
const hintElem = document.getElementById('hint');
const guessForm = document.getElementById('guess-form');
const guessInput = document.getElementById('guess-input');
const resultElem = document.getElementById('result');
const imageElem = document.getElementById('country-image');
const countdownElem = document.getElementById('countdown');
const guessesInfoElem = document.getElementById('guesses-info');

// Dark mode toggle logic
const darkModeToggle = document.getElementById('dark-mode-toggle');
function setDarkMode(enabled) {
    document.body.classList.toggle('dark', enabled);
    if (enabled) {
        darkModeToggle.textContent = '☀️ Light Mode';
    } else {
        darkModeToggle.textContent = '🌙 Dark Mode';
    }
    localStorage.setItem('darkMode', enabled ? '1' : '0');
}

darkModeToggle.addEventListener('click', () => {
    setDarkMode(!document.body.classList.contains('dark'));
});

// On load, apply saved dark mode preference
(function() {
    const saved = localStorage.getItem('darkMode');
    if (saved === '1') setDarkMode(true);
})();

function showHint() {
    hintLabel.textContent = `Hint ${currentHint + 1}:`;
    hintElem.textContent = country.hints[currentHint];
}

function showFlag() {
    imageElem.src = country.flag;
    imageElem.alt = country.name + ' Flag';
}

function showQuestionMark() {
    imageElem.src = QUESTION_MARK_IMG;
    imageElem.alt = 'Country Flag or Question Mark';
}

// Create share button (hidden by default)
let shareBtn = document.createElement('button');
shareBtn.id = 'share-btn';
shareBtn.textContent = 'Share your score with your friends! ➤';
shareBtn.style.display = 'none';
shareBtn.style.marginTop = '16px';
shareBtn.style.padding = '14px 28px';
shareBtn.style.fontSize = '1.2rem';
shareBtn.style.borderRadius = '6px';
shareBtn.style.background = '#3498db';
shareBtn.style.color = 'white';
shareBtn.style.border = 'none';
shareBtn.style.cursor = 'pointer';
shareBtn.style.transition = 'background 0.2s';
shareBtn.addEventListener('mouseover', () => shareBtn.style.background = '#217dbb');
shareBtn.addEventListener('mouseout', () => shareBtn.style.background = '#3498db');

function showShareButton(success) {
    let message = '';
    if (success) {
        message = `I bet you can't guess this country in less guesses than me! (${guessesUsed} guess${guessesUsed === 1 ? '' : 'es'}) https://jonathanwilliams2008.github.io/country-guesser/`;
    } else {
        message = `This country is impossible to guess! https://jonathanwilliams2008.github.io/country-guesser/`;
    }
    shareBtn.style.display = '';
    shareBtn.onclick = function() {
        // Always copy to clipboard
        navigator.clipboard.writeText(message).then(() => {
            shareBtn.textContent = 'Share your score with your friends! ➤';
            setTimeout(() => {
                shareBtn.textContent = 'Share your score with your friends! ➤';
            }, 1500);
        });
        // If Web Share API is available, also use it
        if (navigator.share) {
            navigator.share({
                text: message
            });
        }
    };
    // Insert the share button right after guessesInfoElem
    if (guessesInfoElem && guessesInfoElem.parentNode) {
        guessesInfoElem.parentNode.insertBefore(shareBtn, guessesInfoElem.nextSibling);
    }
}

function hideShareButton() {
    shareBtn.style.display = 'none';
}

function endGame(success) {
    gameOver = true;
    guessInput.disabled = true;
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('hint-container').style.display = 'none';
    guessForm.style.display = 'none';
    if (success) {
        resultElem.textContent = 'Correct! The country is ' + country.name + '!';
        resultElem.style.color = '#27ae60';
        guessesInfoElem.textContent = `You got it in ${guessesUsed} guess${guessesUsed === 1 ? '' : 'es'}!`;
        showFlag();
    } else {
        resultElem.textContent = 'Out of guesses! The country was ' + country.name + '.';
        resultElem.style.color = '#e74c3c';
        guessesInfoElem.textContent = 'You used all 10 guesses.';
        showFlag();
    }
    showShareButton(success);
}

function resetGameUI() {
    currentHint = 0;
    guessesUsed = 0;
    previousGuesses = [];
    gameOver = false;
    guessInput.disabled = false;
    document.getElementById('submit-btn').disabled = false;
    resultElem.textContent = '';
    guessesInfoElem.textContent = '';
    document.getElementById('hint-container').style.display = '';
    guessForm.style.display = '';
    showQuestionMark();
    showHint();
    hideShareButton();
}


function updateCountdown() {
    const now = new Date();
    const diff = targetTime - now;
    
    if (diff <= 0) {
        // Time's up! Reset the game
        if (TEST_MODE) {
            // In test mode, advance the virtual date by one day
            virtualDate.setDate(virtualDate.getDate() + 1);
        }
        
        countryIndex = getTodayCountryIndex();
        country = countries[countryIndex];
        resetGameUI();
        
        // Set new target time for next reset
        if (TEST_MODE) {
            targetTime = new Date(Date.now() + TEST_COUNTDOWN_SECONDS * 1000);
        } else {
            targetTime = new Date();
            targetTime.setHours(24, 0, 0, 0);
        }
        return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (TEST_MODE) {
        countdownElem.textContent = `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
    } else {
        countdownElem.textContent = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
    }
}

// Load countries data from JSON
async function loadCountries() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/JonathanWilliams2008/Countries_list/refs/heads/main/countries.json');
        if (!response.ok) {
            throw new Error('Failed to load countries data');
        }
        countries = await response.json();
        
        // Initialize the game after loading data
        initializeGame();
    } catch (error) {
        console.error('Error loading countries:', error);
        // Fallback to a simple error message
        document.body.innerHTML = '<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;"><h1>Error Loading Game</h1><p>Failed to load countries data. Please check your internet connection and try again.</p></div>';
    }
}

function initializeGame() {
    // Populate datalist for autocomplete (use ALL_COUNTRY_NAMES)
    const datalist = document.getElementById('countries-list');
    datalist.innerHTML = '';
    ALL_COUNTRY_NAMES.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        datalist.appendChild(option);
    });
    // Set the target time for the countdown
    if (TEST_MODE) {
        // For testing: set target to TEST_COUNTDOWN_SECONDS from now
        targetTime = new Date(Date.now() + TEST_COUNTDOWN_SECONDS * 1000);
    } else {
        // Normal mode: set target to next midnight
        targetTime = new Date();
        targetTime.setHours(24, 0, 0, 0);
    }
    
    // Initialize game state
    countryIndex = getTodayCountryIndex();
    country = countries[countryIndex];
    
    // Start the game
    resetGameUI();
    setInterval(updateCountdown, 1000);
    updateCountdown();
    
    // Add test mode indicator to the page
    if (TEST_MODE) {
        const testIndicator = document.createElement('div');
        testIndicator.textContent = `TEST MODE: Game resets every ${TEST_COUNTDOWN_SECONDS} seconds`;
        testIndicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #ff6b6b; color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; z-index: 1000;';
        document.body.appendChild(testIndicator);
    }
}

// Start loading the countries data
loadCountries();

// Modal logic for rules
const infoBtn = document.getElementById('info-btn');
const rulesModal = document.getElementById('rules-modal');
const closeRulesBtn = document.getElementById('close-rules');

infoBtn.addEventListener('click', () => {
    rulesModal.style.display = 'flex';
    closeRulesBtn.focus();
});

closeRulesBtn.addEventListener('click', () => {
    rulesModal.style.display = 'none';
    infoBtn.focus();
});

// Close modal when clicking outside modal-content
rulesModal.addEventListener('mousedown', (e) => {
    if (e.target === rulesModal) {
        rulesModal.style.display = 'none';
        infoBtn.focus();
    }
});

// Close modal on Escape key
window.addEventListener('keydown', (e) => {
    if (rulesModal.style.display === 'flex' && e.key === 'Escape') {
        rulesModal.style.display = 'none';
        infoBtn.focus();
    }
});

// Add global error logging
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global JS Error:', message, source, lineno, colno, error);
    // Removed alert to prevent user confusion when site works fine
};

// Helper: Only allow guesses that match a country in ALL_COUNTRY_NAMES
function isValidCountryGuess(guess) {
    return ALL_COUNTRY_NAMES.some(name => name.toLowerCase() === guess.trim().toLowerCase());
}

guessForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (gameOver) return;
    const guess = guessInput.value.trim();
    if (!isValidCountryGuess(guess)) {
        resultElem.textContent = 'Please enter a valid guess';
        resultElem.style.color = '#e74c3c';
        return;
    }
    // Check for duplicate guess (case-insensitive)
    if (previousGuesses.some(g => g.toLowerCase() === guess.toLowerCase())) {
        resultElem.textContent = 'This country has already been guessed.';
        resultElem.style.color = '#e74c3c';
        return;
    }
    previousGuesses.push(guess);
    guessesUsed++;
    if (guess.toLowerCase() === country.name.toLowerCase()) {
        endGame(true);
    } else {
        currentHint++;
        if (currentHint < country.hints.length) {
            showHint();
            const hintsLeft = country.hints.length - currentHint;
            resultElem.textContent = `Incorrect, you have ${hintsLeft} hint${hintsLeft === 1 ? '' : 's'} remaining.`;
            resultElem.style.color = '#e67e22';
        } else {
            endGame(false);
        }
    }
    guessInput.value = '';
});

// Dynamically show datalist only after 2+ characters
const datalistId = 'countries-list';
function handleGuessInputDatalist() {
    if (guessInput.value.trim().length >= 2) {
        guessInput.setAttribute('list', datalistId);
    } else {
        guessInput.removeAttribute('list');
    }
}
guessInput.addEventListener('input', handleGuessInputDatalist);
// On page load, ensure correct state
handleGuessInputDatalist();

guessInput.addEventListener('focus', function() {
    if (guessInput.value.trim().length < 2) {
        guessInput.removeAttribute('list');
    }
});
guessInput.addEventListener('click', function() {
    if (guessInput.value.trim().length < 2) {
        guessInput.removeAttribute('list');
    }
});

// Support Me button logic
const supportBtn = document.getElementById('support-btn');
supportBtn.addEventListener('click', function() {
    window.open('https://buymeacoffee.com/jonathanwilliams', '_blank');
}); 