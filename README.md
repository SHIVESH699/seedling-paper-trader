# Seedling — Calm Paper Trading & Long-Term Investing Simulator

A Groww-inspired paper trading web app for practising trading and long-term investing across **India (NSE, BSE)** and the **US (NYSE, NASDAQ)** without risking real money.

> **Simulator Disclaimer:** This app is an educational simulator using virtual cash. Free market prices may be delayed, and past virtual performance does not predict real-world results.

---

## Easiest Way to Put It Online (Free, Zero Terminal Commands!)

You can host both the React website and the Python market-data API together for free on **Vercel**:

1. **Unzip** `paper-trader-vercel.zip` on your device.
2. **Create a free GitHub account** at [github.com](https://github.com) and click **New Repository** (name it `seedling-paper-trader`, keep it Public or Private, click **Create repository**).
3. On the new repository page, click **"uploading an existing file"**, then drag-and-drop **all files and folders inside** the unzipped `paper-trader-vercel` folder (`api/`, `src/`, `package.json`, `requirements.txt`, `vercel.json`, `index.html`, etc.) and click **Commit changes**.
4. **Create a free Vercel account** at [vercel.com](https://vercel.com) using your GitHub login.
5. Click **Add New → Project**, select `seedling-paper-trader`, and click **Deploy**.
   - *(Optional, for live US prices)*: Before or after deploying, get a free API key at [finnhub.io](https://finnhub.io), go to **Vercel Project → Settings → Environment Variables**, add `FINNHUB_API_KEY`, and click **Redeploy**. Never hardcode keys in files!
6. Open your live `.vercel.app` link on your phone, tablet, or laptop (you can even tap **Add to Home Screen** on mobile/tablet).

---

## Honest Notes on Free Market Data & Limitations

| Data | Provider | Reality & Limits |
| :--- | :--- | :--- |
| **US Live Quotes** | Finnhub (optional free key) | **60 calls/minute** free. Near-real-time US prices during NYSE/NASDAQ hours (shown as `Live`). |
| **India Quotes (NSE `.NS`, BSE `.BO`) & US Fallback** | Yahoo Finance HTTP (`api/providers/yahoo_provider.py`) | No official free real-time NSE/BSE API exists. Quotes are typically **~15 minutes delayed** and honestly tagged `Delayed (~15m)` or `Market Closed`. |
| **Charts, Fundamentals, FX & Benchmarks** | Yahoo Finance HTTP | Supports 1D, 1W, 1M, 1Y, 5Y charts, Nifty 50 (`^NSEI`), S&P 500 (`^GSPC`), and `USDINR=X`. Heavy traffic on shared cloud IPs can occasionally trigger temporary rate limits (`429`); built-in caching minimizes requests. |
| **Swapping Providers Later** | Modular `api/providers/` | Implement a new subclass of `MarketDataProvider` in `api/providers/base.py` and plug it into `api/providers/manager.py` without touching the frontend. |
| **Stock Splits & Dividends (v1)** | Ledger ready for v2 | Ignored in v1 so accounting stays clear while learning. The transaction ledger already supports `SPLIT` and `DIVIDEND` types for v2 automation. |
| **Storage** | Browser `localStorage` + JSON Backup | Survives refreshes automatically with zero external database setup. Use **Settings → Download Backup (.json)** to transfer progress between devices. |
