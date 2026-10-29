/**
 * Query processing module.
 * Cleans the farmer's question, breaks it into searchable words, and works out
 * which agricultural topics and crops it is about.
 */

const STOPWORDS = new Set(
  (
    'a an the and or but if then so of to in on at by for with from into about as is are was were be been ' +
    'am do does did done have has had having i me my mine we our you your it its this that these those ' +
    'what which who whom when where why how can could should would will shall may might must ' +
    'please tell give show want need know get got any some there here very much many more most ' +
    'also just only than too not no yes ok okay hi hello hey help'
  ).split(' ')
);

// Light stemming so "leaves" matches "leaf-like" forms, "irrigating" matches "irrigation" roots, etc.
function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && /(ches|shes|xes|sses)$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

function normalize(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cleaned, stop-word-free, stemmed words
function tokenize(text) {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

// Topic detection (the "intent and agricultural context" step)
const TOPIC_WORDS = {
  crop_cultivation: 'sow sowing plant planting grow growing variety seed harvest crop cultivate cultivation nursery transplant yield',
  disease: 'disease blight rust mildew fungus fungal virus viral spot rot wilt infection infected curl curling mold mould yellowing',
  pest: 'pest insect aphid whitefly borer hopper bug worm caterpillar mite locust spray neem',
  fertilizer: 'fertilizer fertiliser manure compost urea dap npk nutrient deficiency nitrogen phosphorus potash potassium zinc',
  irrigation: 'irrigate irrigation water watering drip sprinkler moisture drought flood waterlogging waterlogged',
  soil_practices: 'soil sandy clay loam loamy mulch mulching rotation organic ph stubble',
  weather_season: 'weather rain rainfall monsoon frost heat temperature season kharif rabi zaid winter summer hailstorm',
};

const TOPICS = Object.fromEntries(
  Object.entries(TOPIC_WORDS).map(([topic, words]) => [topic, new Set(words.split(' ').map(stem))])
);

const CROP_WORDS =
  'wheat rice paddy sugarcane tomato potato mustard maize corn cotton groundnut peanut gram chickpea pea onion millet bajra soybean watermelon carrot cowpea brinjal chilli';

const CROPS = new Set(CROP_WORDS.split(' ').map(stem));

// Short greetings should not trigger a knowledge-base search
const GREETING = /^(hi|hii|hello|hey|namaste|namaskar|good (morning|afternoon|evening)|thanks|thank you)\b/;

function processQuery(text) {
  const original = String(text).trim();
  const cleaned = normalize(original);
  const tokens = tokenize(original);

  const topics = Object.keys(TOPICS).filter((t) => tokens.some((tok) => TOPICS[t].has(tok)));
  const crops = [...new Set(tokens.filter((tok) => CROPS.has(tok)))];

  return {
    original,
    cleaned,
    tokens,
    topics,
    crops,
    isGreeting: GREETING.test(cleaned) && tokens.length <= 2,
  };
}

module.exports = { processQuery, tokenize, stem };
