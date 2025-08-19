import { useEffect, useMemo, useRef, useState } from 'react';

const QUESTION_MARK_IMG = 'https://cdn.pixabay.com/photo/2015/12/23/23/15/question-mark-1106309_1280.png';


const TEST_MODE = false;
const TEST_COUNTDOWN_SECONDS = 30;
const NAMES_SOURCE_URL = 'https://cdn-assets.teuteuf.fr/data/common/countries.json';

// Names loaded dynamically from NAMES_SOURCE_URL using the English `name` field


function formatTime(msRemaining, showHours) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (showHours) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

// Hardcoded clue templates grouped by difficulty. These will be turned into
// concrete strings using the daily country's data once loaded.
const cluesByDifficulty = {
  hard: [
    (d) => d?.latitude ? `It's latitude is: ${d.latitude}.` : null,
    (d) => d?.longitude ? `It's longitude is: ${d.longitude}.` : null,
    (d) => Array.isArray(d?.borders) && d.borders.length ? `It borders ${d.borders.length} countries.` : null,
    (d) => d?.capital ? `Its capital city is not its largest city.` : null,
    (d) => typeof d?.size === 'number' ? `Its area is around ${Math.round(d.size / 1000) * 1000} km².` : null,
  ],
  medium: [
    (d) => d?.capital ? `Its capital is ${d.capital}.` : null,
    (d) => Array.isArray(d?.languages) && d.languages.length ? `One of its languages is ${d.languages[0]}.` : null,
    (d) => d?.continent ? `It is located in ${d.continent}.` : null,
    (d) => typeof d?.population === 'number' ? `Population is roughly ${Math.round(d.population / 1_000_000)} million.` : null,
  ],
  easy: [
    (d) => {
      if (!d?.currencyData) return null;
      const name = d.currencyData.name || (Array.isArray(d.currencyData.nameChoices) ? d.currencyData.nameChoices[0] : null);
      if (!name) return null;
      return `One of its currencies is ${name}.`;
    },    
    (d) => Array.isArray(d?.borders) && d.borders.length? 'It shares a border with ${d.borders[0]}.' : null,
    (d) => d?.tld ? `Its internet TLD ends with ${d.tld}.` : null,
    (d) => d?.code ? `Its ISO code starts with ${String(d.code).slice(0, 1)}.` : null,
    (d) => d?.name ? `Its name has ${d.name.length} letters.` : null,
  ],
};

export default function App() {
  const [allCountryNames, setAllCountryNames] = useState([]);
  const [namesSourceItems, setNamesSourceItems] = useState([]);
  const [answerName, setAnswerName] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [countryData, setCountryData] = useState(null);
  const [selectedClues, setSelectedClues] = useState([]);

  const [nameHintEnabled, setNameHintEnabled] = useState(false);
  const [flagHintEnabled, setFlagHintEnabled] = useState(false);

  const [currentHint, setCurrentHint] = useState(0);
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [previousGuesses, setPreviousGuesses] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [guessesInfo, setGuessesInfo] = useState('');

  const [countdownText, setCountdownText] = useState('');
  const [targetTime, setTargetTime] = useState(null);

  const [darkMode, setDarkMode] = useState(false);

  const [rulesOpen, setRulesOpen] = useState(true);
  const [hintsOpen, setHintsOpen] = useState(false);

  const guessInputRef = useRef(null);
  const intervalRef = useRef(null);
  const virtualDateRef = useRef(new Date());
  const targetTimeRef = useRef(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('darkMode');
    if (saved === '1') {
      setDarkMode(true);
    }
  }, []);
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    window.localStorage.setItem('darkMode', darkMode ? '1' : '0');
  }, [darkMode]);

  // Compute the answer (country name/code of the day) from NAMES_SOURCE_URL list
  useEffect(() => {
    if (namesSourceItems.length > 0) {
      const idx = getTodayCountryIndex(namesSourceItems.length);
      const item = namesSourceItems[idx];
      setAnswerName(item?.name || '');
      setAnswerCode(item?.code ? String(item.code).toLowerCase() : '');
    }
  }, [namesSourceItems]);

  // Load country names for autocomplete/validation from NAMES_SOURCE_URL (English `name` only)
  useEffect(() => {
    let cancelled = false;
    async function loadNames() {
      try {
        const res = await fetch(NAMES_SOURCE_URL);
        if (!res.ok) throw new Error('Failed to load country names');
        const data = await res.json();
        const items = (Array.isArray(data) ? data : []).filter((i) => i && i.name && i.code);
        const names = items.map((i) => i.name).filter(Boolean);
        const unique = Array.from(new Set(names));
        if (!cancelled) {
          setNamesSourceItems(items);
          setAllCountryNames(unique);
        }
      } catch (err) {
        console.error('Error loading country names:', err);
      }
    }
    loadNames();
    return () => {
      cancelled = true;
    };
  }, []);

  function getTodayCountryIndex(listLength) {
    if (!listLength) return 0;
    const startDate = new Date(2025, 6, 23);
    const dateToUse = TEST_MODE ? virtualDateRef.current : new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceStart = Math.floor((dateToUse - startDate) / msPerDay);
    return ((daysSinceStart % listLength) + listLength) % listLength;
  }

  // Countdown and daily rollover; depends on names list being available
  useEffect(() => {
    const nextTarget = TEST_MODE
      ? new Date(Date.now() + TEST_COUNTDOWN_SECONDS * 1000)
      : (() => { const t = new Date(); t.setHours(24,0,0,0); return t; })();
    setTargetTime(nextTarget);
    targetTimeRef.current = nextTarget;
    setCurrentHint(0);
    setGuessesUsed(0);
    setPreviousGuesses([]);
    setGameOver(false);
    setResultMessage('');
    setGuessesInfo('');

    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      const now = new Date();
      const t = targetTimeRef.current;
      if (!t) return;
      const diff = t - now;
      if (diff <= 0) {
        if (TEST_MODE) {
          virtualDateRef.current.setDate(virtualDateRef.current.getDate() + 1);
        }
        // roll answer
        if (namesSourceItems.length > 0) {
          const idxName = getTodayCountryIndex(namesSourceItems.length);
          const item = namesSourceItems[idxName];
          setAnswerName(item?.name || '');
          setAnswerCode(item?.code ? String(item.code).toLowerCase() : '');
        }
        setCurrentHint(0);
        setGuessesUsed(0);
        setPreviousGuesses([]);
        setGameOver(false);
        setResultMessage('');
        setGuessesInfo('');

        const newTarget = TEST_MODE
          ? new Date(Date.now() + TEST_COUNTDOWN_SECONDS * 1000)
          : (() => { const t2 = new Date(); t2.setHours(24,0,0,0); return t2; })();
        setTargetTime(newTarget);
        targetTimeRef.current = newTarget;
        setCountdownText(formatTime(newTarget - new Date(), !TEST_MODE));
        return;
      }
      setCountdownText(formatTime(diff, !TEST_MODE));
    }, 1000);

    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [namesSourceItems]);

  // Load per-country data for clue generation
  useEffect(() => {
    let cancelled = false;
    async function loadCountry() {
      if (!answerCode) return;
      try {
        const res = await fetch(`https://cdn-assets.teuteuf.fr/data/common/countries/${answerCode}.json`);
        if (!res.ok) throw new Error('Failed to load country data');
        const data = await res.json();
        if (!cancelled) setCountryData(data);
      } catch (err) {
        console.error('Error loading country data:', err);
        if (!cancelled) setCountryData(null);
      }
    }
    loadCountry();
    return () => { cancelled = true; };
  }, [answerCode]);

  // Deterministically pick daily clues (3 hard, 3 medium, 4 easy)
  useEffect(() => {
    if (!countryData) return;
    // Build available concrete clues from templates
    const build = (templates) => templates
      .map((fn) => {
        try { return typeof fn === 'function' ? fn(countryData) : null; } catch { return null; }
      })
      .filter((s) => typeof s === 'string' && s.trim().length > 0);
    const hard = build(cluesByDifficulty.hard);
    const medium = build(cluesByDifficulty.medium);
    const easy = build(cluesByDifficulty.easy);

    // Seeded RNG based on YYYY-MM-DD
    const seedStr = new Date().toISOString().slice(0,10);
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); }
    function rand() { h += 0x6D2B79F5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

    function pickN(arr, n) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, Math.min(n, copy.length));
    }

    const daily = [
      ...pickN(hard, 3),
      ...pickN(medium, 3),
      ...pickN(easy, 4),
    ];
    while (daily.length < 10) {
      const allClues = [...hard, ...medium, ...easy].filter(c => !daily.includes(c));
      if (!allClues.length) break;
      daily.push(allClues[0]); // just add remaining clues
    }
    setSelectedClues(daily);
    setCurrentHint(0);
  }, [countryData]);

  const hintLabel = useMemo(() => `Clue ${currentHint + 1}: `, [currentHint]);
  const currentHintText = useMemo(() => (selectedClues[currentHint] || ''), [selectedClues, currentHint]);

  const imageSrc = useMemo(() => {
    const flagUrl = answerCode ? `https://cdn-assets.teuteuf.fr/data/common/flags/${answerCode}.svg` : '';
    if (gameOver && flagUrl) return flagUrl;
    if (flagHintEnabled && flagUrl) return flagUrl;
    return QUESTION_MARK_IMG;
  }, [answerCode, gameOver, flagHintEnabled]);

  const imageFilter = useMemo(() => {
    if (gameOver) return 'none';
    if (flagHintEnabled) return 'blur(15px)';
    return 'none';
  }, [gameOver, flagHintEnabled]);

  const displayName = useMemo(() => (answerName || (countryData?.name ?? '')), [answerName, countryData]);
  const nameHintText = useMemo(() => {
    if (!nameHintEnabled || !displayName) return '';
    if (guessesUsed >= 8) {
      return displayName[0] + '_'.repeat(Math.max(0, displayName.length - 1));
    }
    return '_'.repeat(displayName.length);
  }, [nameHintEnabled, displayName, guessesUsed]);

  function isValidCountryGuess(guess) {
    return allCountryNames.some(
      (n) => n.toLowerCase() === guess.trim().toLowerCase()
    );
  }

  function endGame(success, finalGuessCount) {
    setGameOver(true);
    const nameToShow = displayName || '';
    if (!nameToShow) return;
    if (success) {
      const used = typeof finalGuessCount === 'number' ? finalGuessCount : guessesUsed;
      setResultMessage(`Correct! The country is ${nameToShow}!`);
      setGuessesInfo(`You got it in ${used} guess${used === 1 ? '' : 'es'}!`);
    } else {
      setResultMessage(`Out of guesses! The country was ${nameToShow}.`);
      setGuessesInfo('You used all 10 guesses.');
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (gameOver || !answerName) return;
    const formData = new FormData(e.currentTarget);
    const guess = String(formData.get('guess') || '').trim();
    if (!isValidCountryGuess(guess)) {
      setResultMessage('Please enter a valid guess');
      return;
    }
    const isDuplicate = previousGuesses.some(
      (g) => g.toLowerCase() === guess.toLowerCase()
    );
    if (isDuplicate) {
      setResultMessage('This country has already been guessed.');
      return;
    }
    const newGuesses = [...previousGuesses, guess];
    const nextGuessesUsed = guessesUsed + 1;
    setPreviousGuesses(newGuesses);
    setGuessesUsed(nextGuessesUsed);

    // Compare against answerName from NAMES_SOURCE_URL only
    if (answerName && guess.toLowerCase() === String(answerName).toLowerCase()) {
      endGame(true, nextGuessesUsed);
      return;
    }
    const nextHint = currentHint + 1;
    if (nextHint < selectedClues.length) {
      setCurrentHint(nextHint);
      const cluesLeft = selectedClues.length - nextHint;
      setResultMessage(
        `Incorrect, you have ${cluesLeft} clue${cluesLeft === 1 ? '' : 's'} remaining.`
      );
    } else {
      endGame(false);
    }
    if (guessInputRef.current) guessInputRef.current.value = '';
  }

  const showHintsButtonVisible = !gameOver && currentHint >= 1;

  function handleShare(success) {
    if (!country) return;
    const message = success
      ? `I bet you can't guess this country in less guesses than me! (${guessesUsed} guess${guessesUsed === 1 ? '' : 'es'}) https://jonathanwilliams2008.github.io/country-guesser/`
      : `This country is impossible to guess! https://jonathanwilliams2008.github.io/country-guesser/`;
    navigator.clipboard?.writeText(message).catch(() => {});
    if (navigator.share) {
      navigator.share({ text: message }).catch(() => {});
    }
  }

  const resultColor = gameOver && resultMessage.startsWith('Correct!')
    ? 'var(--result-correct)'
    : resultMessage.startsWith('Incorrect')
    ? 'var(--result-try)'
    : resultMessage
    ? 'var(--result-wrong)'
    : 'inherit';

  return (
    <>
      <div className="top-left-controls">
        <button id="dark-mode-toggle" onClick={() => setDarkMode((v) => !v)}>
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <button id="info-btn" title="Game Rules" onClick={() => setRulesOpen(true)}>
          ℹ️ How to Play
        </button>
      </div>

      <div className="difficulty-settings">
        <h3>Difficulty Settings</h3>
        <div className="toggle-container">
          <label className="toggle-label">
            <span>Name Hint</span>
            <span className="info-icon" title="Shows the first letter of the country name after 8 guesses">ℹ️</span>
            <input
              type="checkbox"
              checked={nameHintEnabled}
              onChange={(e) => setNameHintEnabled(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="toggle-container">
          <label className="toggle-label">
            <span>Flag Hint</span>
            <span className="info-icon" title="Shows a blurred version of the country's flag">ℹ️</span>
            <input
              type="checkbox"
              checked={flagHintEnabled}
              onChange={(e) => setFlagHintEnabled(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="container">
        <h1>Country Guesser</h1>
        <div id="image-container">
          <img
            id="country-image"
            src={imageSrc}
            alt={gameOver ? `${displayName} Flag` : flagHintEnabled ? `${displayName} Flag (Blurred)` : 'Country Flag or Question Mark'}
            style={{ filter: imageFilter }}
          />
        </div>

        {!gameOver && (
          <div id="hint-container">
            <span id="hint-label">{hintLabel}</span>
            <span id="hint">{currentHintText}</span>
            {showHintsButtonVisible && (
              <button
                id="show-hints-btn"
                title="Show all previous clues"
                style={{ marginLeft: '10px', verticalAlign: 'middle' }}
                onClick={() => setHintsOpen(true)}
              >
                Show Previous Clues
              </button>
            )}
            {nameHintEnabled && displayName && (
              <div id="name-hint" style={{ marginTop: '10px', textAlign: 'center' }}>
                <span>Country name: </span>
                <span id="name-hint-text" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{nameHintText}</span>
              </div>
            )}
          </div>
        )}

        {!gameOver && (
          <form id="guess-form" onSubmit={handleSubmit}>
            <input
              ref={guessInputRef}
              type="text"
              id="guess-input"
              name="guess"
              placeholder="Enter your guess"
              autoComplete="off"
              required
              list={undefined}
              onInput={(e) => {
                const value = e.currentTarget.value.trim();
                if (value.length >= 2) {
                  e.currentTarget.setAttribute('list', 'countries-list');
                } else {
                  e.currentTarget.removeAttribute('list');
                }
              }}
              onFocus={(e) => {
                const value = e.currentTarget.value.trim();
                if (value.length < 2) e.currentTarget.removeAttribute('list');
              }}
              onClick={(e) => {
                const value = e.currentTarget.value.trim();
                if (value.length < 2) e.currentTarget.removeAttribute('list');
              }}
            />
            <datalist id="countries-list">
              {allCountryNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <button type="submit" id="submit-btn" disabled={gameOver}>Submit</button>
          </form>
        )}

        <div id="result" style={{ color: resultColor }}>
          {resultMessage}
        </div>
        <div id="guesses-info">{guessesInfo}</div>
        <div id="countdown-container">
          <span>Next game in: </span><span id="countdown">{countdownText}</span>
        </div>

        {gameOver && (
          <button
            id="share-btn"
            style={{
              marginTop: '16px',
              padding: '14px 28px',
              fontSize: '1.2rem',
              borderRadius: '6px',
              background: '#3498db',
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => handleShare(resultMessage.startsWith('Correct!'))}
          >
            Share your score with your friends! ➤
        </button>
        )}
      </div>

      {rulesOpen && (
        <div id="rules-modal" className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) setRulesOpen(false); }}>
          <div className="modal-content">
            <button className="close-modal" id="close-rules" onClick={() => setRulesOpen(false)}>&times;</button>
            <h2>How to Play</h2>
            <ul>
              <li><b>The aim of this game is to guess the country in as few guesses as possible.</b></li>
              <li>Every day a new country is chosen and you get 10 clues (each clue getting more obious), one at a time to guess it.</li>
              <li>e.g if the country of the day is "United Kingdom", the first clue might be "It is located in Europe".</li>
              <li>Enter your guess after each clue. You have one guess per clue.</li>
              <li>If you guess correctly, the flag is revealed and you win!</li>
              <li>If you use all 10 clues, you lose and the answer and flag are revealed.</li>
              <li>Use the difficulty toogles if you want an easier experience.</li>
              <li>The game resets with a new country every day at 12:00 AM British time.</li>
              <li><b>Disclaimer:</b> This game only includes countries that are full members of the United Nations. Disputed territories or partially recognized states are not part of the game.</li>
            </ul>
          </div>
        </div>
      )}

      {hintsOpen && (
        <div id="hints-modal" className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) setHintsOpen(false); }}>
          <div className="modal-content">
            <button className="close-modal" id="close-hints" onClick={() => setHintsOpen(false)}>&times;</button>
            <h2>Previous Hints</h2>
      <ul id="hints-list" style={{ paddingLeft: '20px' }}>
            {selectedClues.slice(0, currentHint + 1).map((h, i) => (
      <li key={i}>{`Clue ${i + 1}: ${h}`}</li>
    ))}
            </ul>
          </div>
        </div>
      )}

      <footer className="site-footer">© 2025 Jonathan Williams. All rights reserved.</footer>
    </>
  );
}

