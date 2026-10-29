/**
 * Knowledge retrieval module (the "R" in RAG).
 * Loads the agricultural knowledge base and finds the entries that best match
 * a processed question, using weighted keyword scoring with IDF.
 */

const fs = require('fs');
const path = require('path');
const { tokenize } = require('./queryProcessor');

const DEFAULT_FILE = path.join(__dirname, '..', 'data', 'knowledge.json');

// Friendly labels shown under an answer ("Drawn from ...")
const TOPIC_LABELS = {
  crop_cultivation: 'Crop cultivation',
  disease: 'Crop diseases',
  pest: 'Pests',
  fertilizer: 'Fertilizers',
  irrigation: 'Irrigation',
  soil_practices: 'Soil and farming practices',
  weather_season: 'Seasons and weather',
};

// How much a match in each field is worth
const WEIGHTS = { keywords: 3, title: 2, content: 1 };
const CROP_BONUS = 2;
const TOPIC_BONUS = 0.75;
const MIN_SCORE = 2;

let docs = [];
let idf = new Map();

function loadKnowledge(file = DEFAULT_FILE) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));

  docs = raw.map((entry) => ({
    id: entry.id,
    topic: entry.topic,
    label: TOPIC_LABELS[entry.topic] || 'Farming practices',
    title: entry.title,
    content: entry.content,
    crops: new Set((entry.crops || []).flatMap(tokenize)),
    fields: {
      keywords: new Set((entry.keywords || []).flatMap(tokenize)),
      title: new Set(tokenize(entry.title)),
      content: new Set(tokenize(entry.content)),
    },
  }));

  // Inverse document frequency: rarer words count for more
  const docFreq = new Map();
  for (const d of docs) {
    const all = new Set([...d.fields.keywords, ...d.fields.title, ...d.fields.content]);
    for (const token of all) docFreq.set(token, (docFreq.get(token) || 0) + 1);
  }
  idf = new Map();
  for (const [token, n] of docFreq) {
    idf.set(token, Math.log(1 + (docs.length - n + 0.5) / (n + 0.5)));
  }

  return docs.length;
}

function scoreDoc(doc, query) {
  let score = 0;

  for (const token of query.tokens) {
    const weight = idf.get(token);
    if (!weight) continue; // word not found anywhere in the knowledge base

    let fieldScore = 0;
    if (doc.fields.keywords.has(token)) fieldScore += WEIGHTS.keywords;
    if (doc.fields.title.has(token)) fieldScore += WEIGHTS.title;
    if (doc.fields.content.has(token)) fieldScore += WEIGHTS.content;
    score += weight * fieldScore;
  }

  // Only boost entries that already matched on words
  if (score > 0) {
    if (query.crops.some((c) => doc.crops.has(c))) score += CROP_BONUS;
    if (query.topics.includes(doc.topic)) score += TOPIC_BONUS;
  }

  return score;
}

function retrieve(query, k = 3) {
  return docs
    .map((doc) => ({ doc, score: scoreDoc(doc, query) }))
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ doc, score }) => ({
      id: doc.id,
      topic: doc.topic,
      label: doc.label,
      title: doc.title,
      content: doc.content,
      score: Number(score.toFixed(2)),
    }));
}

module.exports = { loadKnowledge, retrieve };
