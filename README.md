# Financials Projector — Static Edition

A fully client-side financial modelling app. Runs entirely in the browser.
No server, no database, no login required.

**[Live Demo](https://YOUR_USERNAME.github.io/finmodel-static/)**

---

## How it works

- The React UI runs in the browser
- The Python financial engine runs in the browser via [Pyodide](https://pyodide.org) (Python compiled to WebAssembly)
- All model data is saved in your browser's `localStorage`
- Export your models as JSON files to save them permanently

## First load

The Python runtime (~10MB) downloads on first visit, then is cached.
Expect ~15–20 seconds on first load, ~2 seconds on subsequent visits.

---

## Setup & Deployment

### Step 1 — Configure your repo name

Edit `vite.config.js` and change the `base` to match your GitHub repo name:

```js
base: '/YOUR_REPO_NAME/',
```

### Step 2 — Copy engine files

Copy the Python engine files into `public/engine/`:

```
public/
  engine/
    __init__.py
    runner.py
    models/
      __init__.py
      assumptions.py
    compute/
      __init__.py
      capex.py
      debt.py
      drivers.py
      income_statement.py
      tax.py
      balance_sheet.py
      cashflow.py
      metrics.py
```

These files come from the `finmodel/engine/` folder in the main app.

### Step 3 — Enable GitHub Pages

In your GitHub repo:
1. Settings → Pages
2. Source: **GitHub Actions**
3. Save

### Step 4 — Push to main

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

GitHub Actions will build and deploy automatically.
Your app will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

---

## Local development

```bash
npm install
npm run dev
```

---

## Data & Privacy

- All model data stays in your browser's `localStorage`
- Nothing is sent to any server
- Use Export (↓) to download your model as a JSON file
- Use Import to load a previously exported model

---

## Differences from the full app

| Feature | Full app | Static edition |
|---|---|---|
| User accounts | ✅ | ❌ (not needed) |
| Cloud save | ✅ PostgreSQL | Browser localStorage |
| Multiple devices | ✅ | Export/Import JSON |
| Excel export | ✅ | JSON export |
| First load speed | Fast | ~15s (caches after) |
| Hosting cost | ~$5–15/month | Free |
