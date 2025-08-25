import { useEffect, useMemo, useRef, useState } from 'react';
import confetti from "canvas-confetti";


const QUESTION_MARK_IMG = 'https://cdn.pixabay.com/photo/2015/12/23/23/15/question-mark-1106309_1280.png';


const TEST_MODE = true;
const TEST_COUNTDOWN_SECONDS = 1000000;
const NAMES_SOURCE_URL = 'https://cdn-assets.teuteuf.fr/data/common/countries.json';
const CITIES_SOURCE_URL = 'https://cdn-assets.teuteuf.fr/data/common/cities.json';
const PRODUCTS_SOURCE_URL = 'https://cdn-assets.teuteuf.fr/data/common/products.json';
const LANGUAGES_SOURCE_URL = 'https://cdn-assets.teuteuf.fr/data/common/languages.json';
const GEOGRID_BASE_URL = 'https://cdn-assets.teuteuf.fr/data/geogrid/countries/';


// Names loaded dynamically from NAMES_SOURCE_URL using the English `name` field

function triggerConfetti() {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 }
  });
}

// Function to convert ISO code to country name
function getCountryNameFromCode(code, namesSourceItems) {
  if (!code || !namesSourceItems || namesSourceItems.length === 0) return code;
  const country = namesSourceItems.find(item => item.code && String(item.code).toLowerCase() === String(code).toLowerCase());
  return country ? country.name : code;
}

// Function to get a random non-capital city from a country
function getRandomNonCapitalCity(countryCode, citiesData, seededRandom) {
  if (!countryCode || !citiesData || citiesData.length === 0) {
    console.log('getRandomNonCapitalCity: Missing data', { countryCode, citiesDataLength: citiesData?.length });
    return null;
  }
  const countryCities = citiesData.filter(city => 
    city.countryCode === countryCode.toUpperCase() && 
    city.capital === false && 
    city.names && 
    city.names.en
  );
  console.log('getRandomNonCapitalCity: Found cities', { countryCode, cityCount: countryCities.length, cities: countryCities.map(c => c.names.en) });
  if (countryCities.length === 0) return null;
  const randomIndex = Math.floor(seededRandom() * countryCities.length);
  return countryCities[randomIndex].names.en;
}

// Function to get the capital city of a country
function getCapitalCity(countryCode, citiesData, seededRandom) {
  if (!countryCode || !citiesData || citiesData.length === 0) {
    console.log('getCapitalCity: Missing data', { countryCode, citiesDataLength: citiesData?.length });
    return null;
  }
  const capitalCity = citiesData.find(city => 
    city.countryCode === countryCode.toUpperCase() && 
    city.capital === true && 
    city.names && 
    city.names.en
  );
  console.log('getCapitalCity: Found capital', { countryCode, capitalCity: capitalCity?.names?.en });
  return capitalCity ? capitalCity.names.en : null;
}

// Convert common photo page URLs into direct embeddable image URLs when possible
function toEmbeddableImageUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  try {
    const url = new URL(inputUrl);
    const host = url.host.toLowerCase();
    const pathname = url.pathname;
    // If it's already a direct image link
    if (/[.](jpg|jpeg|png|webp|gif)$/i.test(pathname)) return inputUrl;
    // Handle Unsplash photo page URLs => use source.unsplash.com/{id}
    if (host.includes('unsplash.com')) {
      // patterns like /photos/{id} or /photos/{slug}-{id}
      const segments = pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1] || '';
      const id = last.split('-').pop();
      if (id && /^[A-Za-z0-9_-]+$/.test(id)) {
        // Use a fixed size for consistent rendering
        return `https://source.unsplash.com/${id}/1200x800`;
      }
    }
    // Pixabay page URLs are not directly embeddable without CDN path; skip
    return null;
  } catch {
    return null;
  }
}

// Function to get a random top export product name from a country
function getRandomTopExport(countryData, productsData, seededRandom) {
  console.log('getRandomTopExport: Checking country data structure:', {
    countryDataKeys: countryData ? Object.keys(countryData) : null,
    hasTopExports: !!countryData?.topExports,
    hasProductData: !!countryData?.productData,
    productDataKeys: countryData?.productData ? Object.keys(countryData.productData) : null,
    topExportsData: countryData?.topExports,
    productDataTopExports: countryData?.productData?.topExports,
    productsDataLength: productsData?.length
  });

  // Check if we have top exports data in either location
  let topExports = null;
  if (countryData?.topExports && Array.isArray(countryData.topExports)) {
    topExports = countryData.topExports;
  } else if (countryData?.productData?.topExports && Array.isArray(countryData.productData.topExports)) {
    topExports = countryData.productData.topExports;
  }

  if (!topExports || !productsData || productsData.length === 0) {
    console.log('getRandomTopExport: Missing data', { 
      hasTopExports: !!topExports, 
      topExportsArray: Array.isArray(topExports), 
      topExportsLength: topExports?.length,
      productsDataLength: productsData?.length 
    });
    return null;
  }
  
  // Get a random top export product code using seeded random
  const randomIndex = Math.floor(seededRandom() * topExports.length);
  const randomTopExport = topExports[randomIndex];
  if (!randomTopExport?.productCode) {
    console.log('getRandomTopExport: No product code in random top export', randomTopExport);
    return null;
  }
  
  // Find the corresponding product in the products data
  const product = productsData.find(p => p.productCode === randomTopExport.productCode);
  if (!product?.names?.en) {
    console.log('getRandomTopExport: Product not found or no English name', { 
      productCode: randomTopExport.productCode, 
      product, 
      productsDataLength: productsData.length 
    });
    return null;
  }
  
  console.log('getRandomTopExport: Successfully found product', { 
    productCode: randomTopExport.productCode, 
    productName: product.names.en 
  });
  return product.names.en;
}

// Function to get a random language name from a country
function getRandomLanguage(countryData, languagesData, seededRandom) {
  console.log('getRandomLanguage: Checking country data structure:', {
    countryDataKeys: countryData ? Object.keys(countryData) : null,
    hasLanguageData: !!countryData?.languageData,
    hasLanguagesInLanguageData: !!countryData?.languageData?.languages,
    languageDataLanguagesArray: Array.isArray(countryData?.languageData?.languages),
    languageDataLanguagesLength: countryData?.languageData?.languages?.length,
    languagesDataLength: languagesData?.length,
    languageData: countryData?.languageData,
    languagesInLanguageData: countryData?.languageData?.languages,
    sampleLanguagesData: languagesData?.slice(0, 3)
  });

  // Check if we have language data
  if (!countryData?.languageData?.languages || !Array.isArray(countryData.languageData.languages) || !languagesData || languagesData.length === 0) {
    console.log('getRandomLanguage: Missing data', { 
      hasLanguageData: !!countryData?.languageData, 
      hasLanguagesInLanguageData: !!countryData?.languageData?.languages,
      languageDataLanguagesArray: Array.isArray(countryData?.languageData?.languages), 
      languageDataLanguagesLength: countryData?.languageData?.languages?.length,
      languagesDataLength: languagesData?.length 
    });
    return null;
  }
  
  // Get a random language from the country's languageData.languages using seeded random
  const randomIndex = Math.floor(seededRandom() * countryData.languageData.languages.length);
  const randomLanguage = countryData.languageData.languages[randomIndex];
  if (!randomLanguage?.languageCode) {
    console.log('getRandomLanguage: No language code in random language', randomLanguage);
    return null;
  }
  
  // Find the corresponding language in the languages data
  const language = languagesData.find(l => l.languageCode === randomLanguage.languageCode);
  if (!language?.names?.en) {
    console.log('getRandomLanguage: Language not found or no English name', { 
      languageCode: randomLanguage.languageCode, 
      language, 
      languagesDataLength: languagesData.length 
    });
    return null;
  }
  
  console.log('getRandomLanguage: Successfully found language', { 
    languageCode: randomLanguage.languageCode, 
    languageName: language.names.en 
  });
  return language.names.en;
}

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
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => Array.isArray(d?.borders) && d.borders.length ? `It borders ${d.borders.length} countries.` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => typeof d?.size === 'number' ? `Its area is around ${d.size} km².` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      const cityName = getRandomNonCapitalCity(answerCode, citiesData, seededRandom);
      return cityName ? `A city from this country is ${cityName}.` : null;
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      const topExport = getRandomTopExport(d, productsData, seededRandom);
      return topExport ? `One of this country's top exports is ${topExport}.` : null;
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.flagInfo?.hasStar) {
        return "This country has a star on its flag.";
      }
      return "This country does not have a star on its flag.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.flagInfo?.hasCoatOfArms){
        return "This country has a coat of arms on its flag"
      }
      return "This country does not have a coat of arms on its flag"
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.flagInfo?.hasAnimal){
        return "This country has an animal on its flag"
      }
      return "This country does not have an animal on its flag"
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => geogridData?.geographyInfo?.coastlineLength ? `Its coastline is ${geogridData.geographyInfo.coastlineLength} km long` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => geogridData?.economicInfo?.GDPPerCapita ? `This countries GDP per capita is ${geogridData.economicInfo.GDPPerCapita} US dollars.` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.politicalInfo?.hasNuclearWeapons) {
        return "This country has nuclear weapons.";
      }
      return "This country does not have Nuclear weapons.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.politicalInfo?.wasUSSR) {
        return "This country was in the USSR.";
      }
      return "This country was not in the USSR.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.sportsInfo?.hostedF1) {
        return "This country has hosted Formula 1.";
      }
      return "This country has not hosted Formula 1.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.sportsInfo?.hostedMensWorldCup) {
        return "This country has hosted the mens FIFA World Cup.";
      }
      return "This country has not hosted the mens FIFA World Cup.";
    },
  ],
  medium: [
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => typeof d?.population === 'number' ? `Population is roughly ${d.population} people.` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (!d?.currencyData) return null;
      const name = d.currencyData.name || (Array.isArray(d.currencyData.nameChoices) ? d.currencyData.nameChoices[0] : null);
      if (!name) return null;
      return `One of its currencies is ${name}.`;
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.geographyInfo?.islandNation) {
        return "This country is an island nation.";
      }
      return "This country is not an island nation.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.politicalInfo?.inEU) {
        return "This country is in the EU.";
      }
      return "This country is not in the EU.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.geographyInfo?.landlocked) {
        return "This country is landlocked"
      }
      return "This country is not landlocked"
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => geogridData?.sportsInfo?.olympicMedals ? `Has ${geogridData.sportsInfo.olympicMedals} Olympic medals.` : `It has no olympic medals`,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.politicalInfo?.isMonarchy) {
        return "This country is a monarchy.";
      }
      return "This country is not a monarchy.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.politicalInfo?.isCommonwealth) {
        return "This country is a member of the Commonwealth.";
      }
      return "This country is not a member of the Commonwealth.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.politicalInfo?.sameSexMarrigeLegal) {
        return "Same sex marrige is legal here.";
      }
      return "Same sex marrige is illegal here.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.sportsInfo?.hostedOlympics) {
        return "This country has hosted the Olympics.";
      }
      return "This country has not hosted the Olympics.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.sportsInfo?.playedMensWorldCup) {
        return "This country has played in the mens FIFA World Cup.";
      }
      return "This country has not played in the mens FIFA World Cup.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.sportsInfo?.wonMensWorldCup) {
        return "This country has won the mens FIFA World Cup.";
      }
      return "This country has not won the mens FIFA World Cup.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.factsInfo?.hasAlchoholBan) {
        return "This country has banned alchohol.";
      }
      return "This country has not banned alchohol.";
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (geogridData?.factsInfo?.top20TourismRate) {
        return "This country is in the top 20 for tourism.";
      }
      return "This country is not in the top 20 for tourism..";
    },
  ],
  easy: [   
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      if (!d?.continent) return null;
      const continentMap = {
        EU: 'Europe',
        OC: 'Oceania',
        AS: 'Asia',
        NA: 'North America',
        AF: 'Africa',
        SA: 'South America',
        AN: 'Antarctica',
      };
      const code = String(d.continent).toUpperCase();
      const fullName = continentMap[code] || d.continent;
      return `It is located in ${fullName}.`;
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => Array.isArray(d?.borders) && d.borders.length ? `It shares a border with ${getCountryNameFromCode(d.borders[0], namesSourceItems)}.` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => d?.code ? `Its ISO code starts with ${String(d.code).slice(0, 1)}.` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => d?.name ? `Its name has ${d.name.length} letters.` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      const capitalName = getCapitalCity(answerCode, citiesData, seededRandom);
      return capitalName ? `The capital city of this country is: ${capitalName}.` : null;
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => d?.latitude ? `Its latitude is: ${d.latitude}.` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => d?.longitude ? `Its longitude is: ${d.longitude}.` : null,
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      const languageName = getRandomLanguage(d, languagesData, seededRandom);
      return languageName ? `One of the languages this country speaks is ${languageName}.` : null;
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      const colours = geogridData?.flagInfo?.colorsOnFlag;
      if (!Array.isArray(colours) || colours.length === 0) return null;
      const randomIndex = Math.floor(seededRandom() * colours.length);
      const colour = colours[randomIndex];
      return `This country has ${colour} on its flag`;
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      const coastline1 = geogridData?.geographyInfo?.coastline;
      if (!Array.isArray(coastline1) || coastline1.length === 0) return null;
      const randomIndex = Math.floor(seededRandom() * coastline1.length);
      const coastline2 = coastline1[randomIndex];
      return `This country's coastline is on the ${coastline2}.`;
    },
    (d, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRandom, geogridData) => {
      const timeZones1 = geogridData?.politicalInfo?.timeZones;
      if (!Array.isArray(timeZones1) || timeZones1.length === 0) return null;
      const randomIndex = Math.floor(seededRandom() * timeZones1.length);
      const timeZones2 = timeZones1[randomIndex];
      return `One of this country's timezones is ${timeZones2}.`;
    },
  ],
};

export default function App() {
  const [allCountryNames, setAllCountryNames] = useState([]);
  const [namesSourceItems, setNamesSourceItems] = useState([]);
  const [citiesData, setCitiesData] = useState([]);
  const [productsData, setProductsData] = useState([]);
  const [languagesData, setLanguagesData] = useState([]);
  const [geogridData, setGeogridData] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [answerName, setAnswerName] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [countryData, setCountryData] = useState(null);
  const [selectedClues, setSelectedClues] = useState([]);

  const [nameHintEnabled, setNameHintEnabled] = useState(false);
  const [flagHintEnabled, setFlagHintEnabled] = useState(false);
  const [infiniteCluesEnabled, setInfiniteCluesEnabled] = useState(false);

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

  // Function to skip to next country (test mode only)
  function skipToNextCountry() {
    if (!TEST_MODE) return;
    
    // Increment virtual date to get next country
    virtualDateRef.current.setDate(virtualDateRef.current.getDate() + 1);
    
    // Reset game state
    setCurrentHint(0);
    setGuessesUsed(0);
    setPreviousGuesses([]);
    setGameOver(false);
    setResultMessage('');
    setGuessesInfo('');
    
    // Get new country
    if (namesSourceItems.length > 0) {
      const idxName = getTodayCountryIndex(namesSourceItems.length);
      const item = namesSourceItems[idxName];
      setAnswerName(item?.name || '');
      setAnswerCode(item?.code ? String(item.code).toLowerCase() : '');
    }
    
    // Reset countdown
    const newTarget = new Date(Date.now() + TEST_COUNTDOWN_SECONDS * 1000);
    setTargetTime(newTarget);
    targetTimeRef.current = newTarget;
    setCountdownText(formatTime(newTarget - new Date(), false));
  }

  // Function to skip to next clue (test mode only)
  function skipToNextClue() {
    if (!TEST_MODE) return;
    
    const nextHint = currentHint + 1;
    if (nextHint < selectedClues.length) {
      setCurrentHint(nextHint);
      setResultMessage(`Skipped to clue ${nextHint + 1}.`);
    } else {
      setResultMessage('No more clues to skip to.');
    }
  }

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

  // Load cities data for clue generation
  useEffect(() => {
    let cancelled = false;
    async function loadCities() {
      try {
        console.log('Loading cities data...');
        const res = await fetch(CITIES_SOURCE_URL);
        if (!res.ok) throw new Error('Failed to load cities data');
        const data = await res.json();
        console.log('Cities data loaded:', { 
          totalCities: data?.length, 
          sampleCities: data?.slice(0, 3).map(c => ({ 
            countryCode: c.countryCode, 
            name: c.names?.en, 
            capital: c.capital 
          }))
        });
        if (!cancelled) {
          setCitiesData(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error loading cities data:', err);
      }
    }
    loadCities();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load products data for clue generation
  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      try {
        console.log('Loading products data...');
        const res = await fetch(PRODUCTS_SOURCE_URL);
        if (!res.ok) throw new Error('Failed to load products data');
        const data = await res.json();
        console.log('Products data loaded:', { 
          totalProducts: data?.length, 
          sampleProducts: data?.slice(0, 3).map(p => ({ 
            productCode: p.productCode, 
            name: p.names?.en 
          }))
        });
        if (!cancelled) {
          setProductsData(Array.isArray(data) ? data : []);
          console.log('Products data set in state');
          
          // Test the products data structure
          if (data && data.length > 0) {
            const sampleProduct = data[0];
            console.log('Sample product structure:', {
              productCode: sampleProduct?.productCode,
              names: sampleProduct?.names,
              englishName: sampleProduct?.names?.en,
              sector: sampleProduct?.sector
            });
          }
        }
      } catch (err) {
        console.error('Error loading products data:', err);
      }
    }
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load languages data for clue generation
  useEffect(() => {
    let cancelled = false;
    async function loadLanguages() {
      try {
        console.log('🔄 Loading languages data...');
        const res = await fetch(LANGUAGES_SOURCE_URL);
        if (!res.ok) throw new Error('Failed to load languages data');
        const data = await res.json();
        console.log('✅ Languages data loaded successfully:', { 
          totalLanguages: data?.length, 
          sampleLanguages: data?.slice(0, 3).map(l => ({ 
            languageCode: l.languageCode, 
            name: l.names?.en 
          }))
        });
        if (!cancelled) {
          setLanguagesData(Array.isArray(data) ? data : []);
          console.log('💾 Languages data set in state');
        }
      } catch (err) {
        console.error('❌ Error loading languages data:', err);
      }
    }
    loadLanguages();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load geogrid data for clue generation
  useEffect(() => {
    let cancelled = false;
    async function loadGeogrid() {
      if (!answerCode) return;
      
      try {
        console.log('🔄 Loading geogrid data for country:', answerCode);
        const geogridUrl = `${GEOGRID_BASE_URL}${answerCode}.json`;
        const res = await fetch(geogridUrl);
        if (!res.ok) {
          console.log('⚠️ No geogrid data available for country:', answerCode);
          if (!cancelled) setGeogridData(null);
          return;
        }
        const data = await res.json();
        console.log('✅ Geogrid data loaded successfully:', { 
          countryCode: answerCode,
          hasFlagInfo: !!data?.flagInfo,
          hasGeographyInfo: !!data?.geographyInfo,
          hasEconomicInfo: !!data?.economicInfo,
          hasPoliticalInfo: !!data?.politicalInfo,
          hasSportsInfo: !!data?.sportsInfo,
          hasFactsInfo: !!data?.factsInfo
        });
        if (!cancelled) {
          setGeogridData(data);
          console.log('💾 Geogrid data set in state');
        }
      } catch (err) {
        console.log('⚠️ Error loading geogrid data for country:', answerCode, err.message);
        if (!cancelled) setGeogridData(null);
      }
    }
    loadGeogrid();
    return () => {
      cancelled = true;
    };
  }, [answerCode]);

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
      
      // Reset loading state when country changes
      setIsDataLoading(true);
      
      try {
        const res = await fetch(`https://cdn-assets.teuteuf.fr/data/common/countries/${answerCode}.json`);
        if (!res.ok) throw new Error('Failed to load country data');
        const data = await res.json();
        if (!cancelled) {
          setCountryData(data);
          console.log('Country data loaded:', {
            countryName: data?.name,
            countryCode: answerCode,
            hasLanguages: !!data?.languages,
            languagesStructure: data?.languages,
            languagesType: typeof data?.languages,
            languagesIsArray: Array.isArray(data?.languages),
            languagesLength: data?.languages?.length,
            sampleLanguages: data?.languages?.slice(0, 3),
            allKeys: Object.keys(data || {})
          });
        }
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
    if (!countryData || !languagesData || !productsData || !citiesData || !geogridData) {
      console.log('Clues generation skipped:', {
        hasCountryData: !!countryData,
        hasLanguagesData: !!languagesData && languagesData.length > 0,
        hasProductsData: !!productsData && productsData.length > 0,
        hasCitiesData: !!citiesData && citiesData.length > 0,
        hasGeogridData: !!geogridData
      });
      return;
    }
    
    console.log('=== CLUES GENERATION DEBUG ===');
    console.log('Country data keys:', Object.keys(countryData || {}));
    console.log('Languages data available:', !!languagesData);
    console.log('Languages data length:', languagesData?.length);
    console.log('Products data available:', !!productsData);
    console.log('Products data length:', productsData?.length);
    console.log('Cities data available:', !!citiesData);
    console.log('Cities data length:', citiesData?.length);
    console.log('Country has languageData:', !!countryData?.languageData);
    console.log('Country has languageData.languages:', !!countryData?.languageData?.languages);
    console.log('Country languageData:', countryData?.languageData);
    console.log('Country languageData.languages:', countryData?.languageData?.languages);
    console.log('Country languageData.languages type:', typeof countryData?.languageData?.languages);
    console.log('Country languageData.languages is array:', Array.isArray(countryData?.languageData?.languages));
    console.log('Geogrid data available:', !!geogridData);
    console.log('Geogrid data structure:', {
      hasFlagInfo: !!geogridData?.flagInfo,
      hasGeographyInfo: !!geogridData?.geographyInfo,
      hasEconomicInfo: !!geogridData?.economicInfo,
      hasPoliticalInfo: !!geogridData?.politicalInfo,
      hasSportsInfo: !!geogridData?.sportsInfo,
      hasFactsInfo: !!geogridData?.factsInfo,
      olympicMedals: geogridData?.sportsInfo?.olympicMedals
    });
    console.log('===============================');
    
    // Create seeded RNG for consistent daily clues
    const dateToUse = TEST_MODE ? virtualDateRef.current : new Date();
    const seedStr = dateToUse.toISOString().slice(0, 10);
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { 
      h ^= seedStr.charCodeAt(i); 
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); 
    }
    
    function seededRand() { 
      h += 0x6D2B79F5; 
      let t = Math.imul(h ^ (h >>> 15), 1 | h); 
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); 
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; 
    }
    
    // Build available concrete clues from templates
    const build = (templates) => templates
      .map((fn) => {
        try { 
          const result = typeof fn === 'function' ? fn(countryData, namesSourceItems, citiesData, answerCode, productsData, languagesData, seededRand, geogridData) : null;
          if (typeof result === 'string' && (result.includes('city') || result.includes('capital'))) {
            console.log('Generated city clue:', result);
          }
          if (typeof result === 'string' && result.includes('top exports')) {
            console.log('Generated top exports clue:', result);
          }
          if (typeof result === 'string' && result.includes('languages this country speaks')) {
            console.log('Generated language clue:', result);
          }
          if (result === null) {
            console.log('Clue function returned null');
          }
          return result;
        } catch (error) { 
          console.error('Error generating clue:', error);
          return null; 
        }
      })
      .filter((c) => (
        (typeof c === 'string' && c.trim().length > 0) ||
        (c && typeof c === 'object' && typeof c.text === 'string' && c.text.trim().length > 0)
      ));
    const hard = build(cluesByDifficulty.hard);
    const medium = build(cluesByDifficulty.medium);
    const easy = build(cluesByDifficulty.easy);

    console.log('Available clues:', { hard: hard.length, medium: medium.length, easy: easy.length });
    console.log('Medium clues generated:', medium);
    
    // Use the seeded RNG created above for consistent daily clues
    function pickN(arr, n) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(seededRand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, Math.min(n, copy.length));
    }

    const daily = [
      ...pickN(hard, 3),
      ...pickN(medium, 3),
      ...pickN(easy, 4),
    ];
    
    // If infinite clues is enabled, add all remaining clues
    if (infiniteCluesEnabled) {
      const allClues = [...hard, ...medium, ...easy];
      const remainingClues = allClues.filter(c => !daily.includes(c));
      daily.push(...remainingClues);
      console.log('Infinite clues enabled: Added all remaining clues', { 
        totalClues: daily.length, 
        remainingAdded: remainingClues.length 
      });
    } else {
      // Original behavior: try to fill up to 10 clues
      while (daily.length < 10) {
        const allClues = [...hard, ...medium, ...easy].filter(c => !daily.includes(c));
        if (!allClues.length) break;
        daily.push(allClues[0]); // just add remaining clues
      }
      console.log('Standard clues mode: Limited to 10 clues', { totalClues: daily.length });
    }
    
    setSelectedClues(daily);
    setCurrentHint(0);
    setIsDataLoading(false);
    
    console.log('✅ All clues generated successfully with complete data!');
  }, [countryData, namesSourceItems, citiesData, answerCode, productsData, languagesData, infiniteCluesEnabled, geogridData]);

  const hintLabel = useMemo(() => {
    if (infiniteCluesEnabled) {
      return `Clue ${currentHint + 1} of ${selectedClues.length}: `;
    }
    return `Clue ${currentHint + 1}: `;
  }, [currentHint, selectedClues.length, infiniteCluesEnabled]);
  const currentHintText = useMemo(() => {
    const c = selectedClues[currentHint];
    if (!c) return '';
    if (typeof c === 'string') return c;
    if (c && typeof c === 'object' && c.text) return c.text;
    return '';
  }, [selectedClues, currentHint]);

  const imageSrc = useMemo(() => {
    const flagUrl = answerCode ? `https://cdn-assets.teuteuf.fr/data/common/flags/${answerCode}.svg` : '';
    if (gameOver && flagUrl) return flagUrl;
    if (flagHintEnabled && flagUrl) return flagUrl;
    return QUESTION_MARK_IMG;
  }, [answerCode, gameOver, flagHintEnabled]);

  const currentImageClueUrl = useMemo(() => {
    const c = selectedClues[currentHint];
    if (c && typeof c === 'object' && typeof c.imageUrl === 'string' && c.imageUrl) {
      return c.imageUrl;
    }
    return null;
  }, [selectedClues, currentHint]);

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
      triggerConfetti();
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
    } else if (infiniteCluesEnabled) {
      // In infinite mode, loop back to the first clue if we've seen all
      setCurrentHint(0);
      setResultMessage('Incorrect, cycling back to the first clue.');
    } else {
      // Standard mode: end game when out of clues
      endGame(false);
    }
    if (guessInputRef.current) guessInputRef.current.value = '';
  }

  const showHintsButtonVisible = !gameOver && currentHint >= 1;

  function handleShare(success) {
    if (!countryData) return;
    const message = success
      ? `I bet you can't guess this country in less guesses than me! (${guessesUsed} guess${guessesUsed === 1 ? '' : 'es'}) https://gamewithnoname.vercel.app/`
      : `This country is impossible to guess! https://gamewithnoname.vercel.app/`;
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
        {TEST_MODE && (
          <button 
            id="skip-country-btn" 
            onClick={skipToNextCountry}
            style={{
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
            title="Skip to next country (Test Mode Only)"
          >
            ⏭️ Skip Country
          </button>
        )}
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
        {TEST_MODE && (
          <>
            <div className="toggle-container">
              <label className="toggle-label">
                <span>Infinite Clues</span>
                <span className="info-icon" title="Enables infinite clues, revealing all available clues.">ℹ️</span>
                <input
                  type="checkbox"
                  checked={infiniteCluesEnabled}
                  onChange={(e) => setInfiniteCluesEnabled(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            {infiniteCluesEnabled && selectedClues.length > 0 && (
              <div style={{ 
                marginTop: '10px', 
                padding: '8px', 
                background: '#e8f5e8', 
                borderRadius: '4px', 
                fontSize: '0.9rem',
                color: '#2d5a2d'
              }}>
                📊 <strong>Infinite Mode Active:</strong> {selectedClues.length} total clues available
              </div>
            )}
          </>
        )}
      </div>

      <div className="container">
        <h1>Cluele</h1>
        <div id="image-container">
          <img
            id="country-image"
            src={imageSrc}
            alt={gameOver ? `${displayName} Flag` : flagHintEnabled ? `${displayName} Flag (Blurred)` : 'Country Flag or Question Mark'}
            style={{ filter: imageFilter }}
          />
        </div>

        {currentImageClueUrl && (
          <div id="country-photo-container" style={{ marginTop: '10px', textAlign: 'center' }}>
            <a href={currentImageClueUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              View an image from this country
            </a>
          </div>
        )}

        {!gameOver && (
          <div id="hint-container">
            {isDataLoading ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px',
                color: '#666',
                fontStyle: 'italic'
              }}>
                🔄 Loading country data and generating clues...
              </div>
            ) : (
              <>
                <span id="hint-label">{hintLabel}</span>
                <span id="hint">{currentHintText}</span>
                {infiniteCluesEnabled && (
                  <span style={{ 
                    marginLeft: '10px', 
                    fontSize: '0.8rem', 
                    color: '#666',
                    fontStyle: 'italic'
                  }}>
                    ({selectedClues.length - currentHint - 1} more clues available)
                  </span>
                )}
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
                {TEST_MODE && (
                  <button
                    id="skip-clue-btn"
                    title="Skip to next clue (Test Mode Only)"
                    style={{ 
                      marginLeft: '10px', 
                      verticalAlign: 'middle',
                      background: '#f39c12',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                    onClick={skipToNextClue}
                  >
                    ⏭️ Skip Clue
                  </button>
                )}
                {nameHintEnabled && displayName && (
                  <div id="name-hint" style={{ marginTop: '10px', textAlign: 'center' }}>
                    <span>Country name: </span>
                    <span id="name-hint-text" style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{nameHintText}</span>
                  </div>
                )}
              </>
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
            {infiniteCluesEnabled && (
              <div style={{ 
                marginBottom: '15px', 
                padding: '8px', 
                background: '#e8f5e8', 
                borderRadius: '4px', 
                fontSize: '0.9rem',
                color: '#2d5a2d'
              }}>
                📊 <strong>Infinite Mode:</strong> {selectedClues.length} total clues available
              </div>
            )}
            <ul id="hints-list" style={{ paddingLeft: '20px' }}>
              {selectedClues.slice(0, currentHint + 1).map((h, i) => {
                const text = typeof h === 'string' ? h : (h && typeof h === 'object' && h.text) ? h.text : '';
                return (
                  <li key={i}>{`Clue ${i + 1}: ${text}`}</li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <footer className="site-footer">© 2025 Jonathan Williams. All rights reserved.</footer>
    </>
  );
}