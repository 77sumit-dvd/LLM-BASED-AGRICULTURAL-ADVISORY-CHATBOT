# 🌾 AgriAI – LLM-Based Agricultural Advisory Chatbot

AgriAI is a web chatbot that gives farmers simple, practical advice on crops, diseases, pests, fertilizers, irrigation and seasons. It uses **Retrieval-Augmented Generation (RAG)**: the app first finds relevant entries in an agricultural knowledge base, then passes them to a large language model (Claude) so the answer is grounded in that information instead of guessed.

Built as a mini project at BBD University, Lucknow.

## ✨ Features

- **Chat interface** – ask questions in natural language from any browser
- **RAG pipeline** – keyword search with IDF scoring over a curated knowledge base
- **Query understanding** – cleans the question, removes stop words, detects the topic and crop
- **Follow-up questions** – short follow-ups like "and for rice?" reuse the previous question's context
- **Source labels** – each answer shows which topic area it was drawn from
- **Safe advice** – the model is told never to invent pesticide or fertilizer doses and to point farmers to their local Krishi Vigyan Kendra (KVK)
- **Same-language replies** – answers in the language the farmer writes in
- **Protection built in** – rate limiting, input length limits and request size limits

## 🧠 How It Works

```
Farmer's question
      │
      ▼
1. Query processing   (services/queryProcessor.js)
   clean text, tokenize, stem, detect topic and crop
      │
      ▼
2. Knowledge retrieval (services/retriever.js)
   score knowledge-base entries, pick the top matches
      │
      ▼
3. LLM advisory        (services/llm.js)
   question + recent chat + retrieved entries → Claude
      │
      ▼
4. Response            (routes/chat.js)
   plain-language answer + the topics it came from
```

## 🛠️ Tech Stack

| Part | Technology |
|------|-----------|
| Backend | Node.js, Express |
| LLM | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Retrieval | Custom keyword scoring with IDF weighting |
| Frontend | HTML, CSS, JavaScript |
| Security | `express-rate-limit`, `dotenv` for secrets |

## 📁 Project Structure

```
agriai/
├── data/
│   └── knowledge.json        # agricultural knowledge base
├── public/                   # frontend
│   ├── index.html
│   ├── style.css
│   └── script.js
├── routes/
│   └── chat.js               # POST /api/chat
├── services/
│   ├── queryProcessor.js     # query understanding
│   ├── retriever.js          # knowledge retrieval
│   └── llm.js                # LLM call and prompt
├── server.js                 # Express app
├── .env.example              # settings template
└── package.json
```

## 🚀 Getting Started

### Requirements
- [Node.js](https://nodejs.org) 18 or newer
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/77sumit-dvd/LLM-BASED-AGRICULTURAL-ADVISORY-CHATBOT.git
cd LLM-BASED-AGRICULTURAL-ADVISORY-CHATBOT/agriai

# 2. Install dependencies
npm install

# 3. Create your settings file
cp .env.example .env        # on Windows PowerShell: copy .env.example .env
```

Open `.env` and add your API key:

```
ANTHROPIC_API_KEY=your_api_key_here
```

```bash
# 4. Start the app
npm start
```

Open **http://localhost:3000** in your browser.

### Settings (`.env`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Your API key (required) | – |
| `ANTHROPIC_MODEL` | Model used for answers | `claude-sonnet-5-5` |
| `PORT` | Port the server runs on | `3000` |
| `TOP_K` | Knowledge entries sent to the model per question | `3` |
| `MAX_QUESTION_LENGTH` | Longest question accepted (characters) | `500` |
| `RATE_LIMIT_PER_MINUTE` | Requests allowed per IP per minute | `20` |

> ⚠️ Never commit your real `.env` file. It is listed in `.gitignore`.

## 🔌 API

**`POST /api/chat`**

Request:
```json
{
  "message": "When should I sow wheat?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```

Response:
```json
{
  "reply": "Wheat is usually sown from late October to mid November...",
  "sources": ["Crop cultivation"]
}
```

**`GET /api/health`** returns `{ "status": "ok" }`.

## 📚 Knowledge Base

`data/knowledge.json` holds the farming entries the chatbot searches. Each entry has an `id`, `topic`, `title`, `crops`, `keywords` and `content`. To teach AgriAI something new, add an entry in the same format and restart the server.

Topics covered: crop cultivation, diseases, pests, fertilizers, irrigation, soil practices, and seasons and weather.

## 🔮 Future Improvements

- Embedding-based (semantic) retrieval instead of keyword scoring
- A larger, region-specific knowledge base
- Hindi and other regional-language interface
- Voice input for farmers
- Weather and market-price integration

## 👤 Author

**Sumit Dwivedi** – B.Tech Computer Science, BBD University, Lucknow
GitHub: [@77sumit-dvd](https://github.com/77sumit-dvd)

## 📄 License

MIT
