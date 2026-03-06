# RoboGrafts — Follicle Detection System

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add your API key
cp .env.example .env.local
# Then edit .env.local and add your Anthropic API key

# 3. Run the app
npm run dev

# 4. Open in browser
# http://localhost:3000
```

---

## Project Structure

```
robografts/
├── app/
│   ├── api/
│   │   └── analyse/
│   │       └── route.ts        ← API route (calls Anthropic server-side)
│   ├── layout.tsx
│   └── page.tsx                ← Main detection UI
├── .env.example
├── .env.local                  ← Your API key goes here (never commit this)
├── package.json
└── tsconfig.json
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
