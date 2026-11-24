/**
 * Educational Layer:
 * - Contextual plain-English tooltips for unfamiliar terms
 * - 7 beginner lessons written with concrete Indian & US examples (not generic definitions)
 * - Auto-verified in-app practical tasks tied to real simulator state
 * - Calm post-trade reflection checks (concentration, overtrading, missing exit plan, impatience)
 * - Weekly behaviour summary (win rate, avg holding period, biggest loss, 1 improvement suggestion)
 */

import { computePortfolioSummary } from './tradingEngine';

export const GLOSSARY = {
  peRatio: {
    title: 'P/E Ratio (Price-to-Earnings)',
    body:
      'How many rupees or dollars you pay for ₹1 or $1 of a company’s yearly profit. A P/E of 25 means investors pay 25 years of current earnings. Fast-growing businesses often carry higher P/Es (e.g., 35–60), while steady banks or utilities often trade lower (e.g., 12–20). Always compare a company’s P/E against competitors in the same sector, never in isolation.',
  },
  marketCap: {
    title: 'Market Cap (Market Capitalization)',
    body:
      'Total stock-market value of the entire company (Share Price × Total Shares). A ₹200 share is NOT “cheaper” than a ₹2,000 share if the ₹200 company has 100× more shares. Large-caps (like HDFC Bank or Apple) are usually steadier; small-caps swing much harder both up and down.',
  },
  week52: {
    title: '52-Week High & Low',
    body:
      'The highest and lowest price the stock traded at over the past 12 months. A stock near its 52-week low is not automatically a bargain—sometimes the business is shrinking. Use it as context for volatility, not as a buy signal by itself.',
  },
  orderType: {
    title: 'Market Order vs. Limit Order',
    body:
      'A Market order buys or sells right away at whatever price is available now—fast, but you have no price guarantee if the stock jumps. A Limit order lets you set the maximum price you will pay (for a Buy) or minimum price you will accept (for a Sell). It only fills if the market reaches your price.',
  },
  bucket: {
    title: 'Long-term vs. Trading Bucket',
    body:
      'Mixing long-term investments and short-term trades in one pile causes emotional mistakes—like panic-selling a 5-year compounder after one bad week, or turning a failed 3-day trade into an accidental "long-term hold". Separating buckets keeps your rules clear.',
  },
  brokerage: {
    title: 'Brokerage & Statutory Fees',
    body:
      'Real trades are never completely free. Even discount brokers charge flat fees, exchange charges, STT/stamp duty (India), or spreads. Keeping this setting ON teaches you why placing 20 tiny trades a week quietly eats away your returns.',
  },
  benchmark: {
    title: 'Benchmark (Nifty 50 / S&P 500)',
    body:
      'A basket of the largest companies in India (Nifty 50) or the US (S&P 500). Comparing your portfolio against a benchmark answers the most honest question in investing: "Would I have done better simply buying an index fund and doing nothing?"',
  },
};

export const LESSONS = [
  {
    id: 'what-is-a-stock',
    number: 1,
    title: 'What a Stock Actually Represents (Owning a Business, Not a Ticker)',
    readTime: '3 min read',
    summary: 'Why share price alone tells you nothing—and how business earnings drive long-term returns.',
    sections: [
      {
        heading: 'A ticker symbol is a slice of a real company',
        body:
          'When you buy 1 share of HDFC Bank or Apple, you are not buying a lottery ticket that randomly blinks green and red. You are buying a tiny legal ownership stake in every branch, loan book, iPhone sold, and rupee or dollar of profit that business generates.',
      },
      {
        heading: 'Real example: Why a ₹100 stock can be MORE expensive than a ₹3,500 stock',
        body:
          'Beginners often think "TCS at ₹3,800 is too expensive, let me buy a ₹40 stock instead." That is a trap. Suppose Company A has 1,000 crore shares trading at ₹40 (Market Cap = ₹40,000 crore) and earns ₹400 crore/year. Company B has 10 crore shares at ₹2,000 (Market Cap = ₹20,000 crore) and earns ₹1,000 crore/year. Even though Company B’s share price is 50× higher, the entire business costs HALF as much while earning 2.5× more profit!',
      },
      {
        heading: 'Short term = emotions, Long term = profits',
        body:
          'Over a single week, Infosys or Microsoft can drop 5% purely because of news headlines or interest-rate rumors. Over 5 to 10 years, stock prices almost always follow whether the company grew its revenue and profit per share. Before buying any stock here, read its business description and ask: "Will more people use this company 5 years from now?"',
      },
    ],
    taskLabel: 'Add at least 2 stocks to your Watchlist (on top of starting or total 3+)',
    checkTask: (state) => state.watchlist.length >= 4 || (state.watchlist.length >= 2 && state.orders.length > 0),
    taskHint: 'Open Explore, search for any Indian or US company you actually recognize in daily life, and click the Bookmark icon to add it to your Watchlist (aim for at least 4 stocks watched, or 2+ watched with a trade placed).',
  },
  {
    id: 'orders-explained',
    number: 2,
    title: 'Market vs. Limit Orders: Controlling the Price You Pay',
    readTime: '3 min read',
    summary: 'How orders actually match on NSE/NASDAQ—and when a Limit order protects you from overpaying.',
    sections: [
      {
        heading: 'Market Order: "Fill me now, whatever the price"',
        body:
          'A Market order prioritizes speed. During open market hours, it fills immediately at the current market price. For giant, heavily traded stocks like Reliance or Apple, the gap between buyer and seller prices (the bid-ask spread) is tiny. But if you place a Market order overnight before the market opens, and the company announces surprising news at 8:00 AM, your queued order could open 4% higher than yesterday’s close!',
      },
      {
        heading: 'Limit Order: "Only fill me at my price or better"',
        body:
          'Suppose ITC is trading at ₹480, and you decide you only want to buy it if it dips to ₹470. You place a Buy Limit order at ₹470. If the stock never drops to ₹470, your order stays safely unfilled and you keep your cash. If it dips to ₹470 (even while this website is closed—we check candle history when you return!), it fills at ₹470. And if the market gaps down to ₹465 at open, you get the better ₹465 price.',
      },
      {
        heading: 'Rule of thumb for beginners',
        body:
          'Use Limit orders whenever you are buying after hours, buying smaller/less-liquid stocks, or patiently waiting for a valuation pullback. Patience costs nothing.',
      },
    ],
    taskLabel: 'Place your first Limit order (Buy or Sell)',
    checkTask: (state) => state.orders.some((o) => o.orderType === 'LIMIT'),
    taskHint: 'Open any stock, switch Order Type from Market to Limit, set a target price (e.g., 1–2% below the current price for a Buy), and submit the order.',
  },
  {
    id: 'reading-candlesticks',
    number: 3,
    title: 'Reading a Candlestick Chart Without Getting Fooled by Noise',
    readTime: '4 min read',
    summary: 'What each green/red bar actually shows—and why zooming out to 1Y–5Y changes everything.',
    sections: [
      {
        heading: 'Four prices packed into one bar',
        body:
          'A line chart only shows closing prices. A candlestick shows four numbers for one time period (5 minutes, 1 day, or 1 week): Open, High, Low, and Close. The thick "body" spans Open to Close (green if Close > Open, red if Close < Open). The thin "wicks" sticking out the top and bottom show the highest and lowest prices reached during that period.',
      },
      {
        heading: 'Real example: The 1D panic vs. the 5Y reality',
        body:
          'Look at NVIDIA or Titan on a 1D (5-minute) chart on a random Tuesday: big red candles can look terrifying, making it feel like the company is collapsing. Now click 1Y or 5Y on the exact same stock—that scary 2% afternoon drop shrinks into an invisible speck on a multi-year climb. Zooming in magnifies noise; zooming out reveals the real trend.',
      },
      {
        heading: 'What long wicks actually tell you',
        body:
          'A candle with a very long lower wick means sellers pushed the price sharply down during the session, but buyers stepped in and drove it back up before the close. It shows disagreement between buyers and sellers—not a magic guarantee of tomorrow’s direction.',
      },
    ],
    taskLabel: 'Switch any stock chart to Candlestick view and inspect the 1Y or 5Y timeframe',
    checkTask: (state) => Boolean(state.learningEvents?.inspectedCandlestickLongRange),
    taskHint: 'Open any stock page, toggle the chart from "Line" to "Candles", and click either "1Y" or "5Y".',
  },
  {
    id: 'valuation-ratios',
    number: 4,
    title: 'P/E Ratio & Basic Valuation: Spotting Hype vs. Reasonable Price',
    readTime: '4 min read',
    summary: 'How to read P/E, Market Cap, and 52-Week ranges using real Indian & US sector comparisons.',
    sections: [
      {
        heading: 'P/E Ratio in plain English',
        body:
          'Imagine a neighborhood cafe that earns ₹10 lakh net profit every year, and the owner wants to sell it for ₹1.5 crore. You are paying 15× annual earnings—a P/E of 15. If another cafe earns the exact same ₹10 lakh, why would anyone pay ₹5 crore (P/E of 50) for it? Only if they strongly believe that second cafe is opening 10 new branches and will earn ₹50 lakh/year soon.',
      },
      {
        heading: 'Real example: Comparing across sectors is a classic mistake',
        body:
          'State Bank of India (SBIN.NS) often trades around a P/E of 9–12, while Asian Paints or Titan often trade at P/E 50–80, and Apple trades around 28–35. Banks carry credit-cycle risk and capital rules, so markets rarely pay 50× earnings for them. Consumer brands with predictable repeat demand earn higher multiples. Compare HDFC Bank with ICICI Bank, or Infosys with TCS—not a bank with a software company.',
      },
      {
        heading: 'Watch out for the "Low P/E Trap"',
        body:
          'A stock with a P/E of 6 might look cheap only because last year’s profits were unusually high (like a commodity boom) and next year’s profits are about to fall in half. Always pair P/E with the company’s business quality and multi-year chart.',
      },
    ],
    taskLabel: 'Buy at least 1 stock into your Long-term bucket',
    checkTask: (state) =>
      state.transactions.some((t) => t.txType === 'BUY' && t.bucket === 'LONG_TERM') ||
      state.orders.some((o) => o.side === 'BUY' && o.bucket === 'LONG_TERM' && o.status !== 'CANCELLED' && o.status !== 'REJECTED'),
    taskHint: 'Open a stock, check its P/E, Market Cap, and 52W High/Low, select the "Long-term" bucket, and place a Buy order.',
  },
  {
    id: 'diversification',
    number: 5,
    title: 'Diversification: Why Owning 3 Bank Stocks Is NOT Diversified',
    readTime: '3 min read',
    summary: 'How sector concentration blindsides beginners—and the sweet spot for a starter portfolio.',
    sections: [
      {
        heading: 'The hidden trap of "fake diversification"',
        body:
          'A beginner buys HDFC Bank, ICICI Bank, State Bank of India, and Bajaj Finance—four different companies—and feels safely diversified. Then the RBI raises rates or credit costs spike, and all four drop together because 100% of their money is in Financial Services.',
      },
      {
        heading: 'True diversification spreads different economic drivers',
        body:
          'Compare that to holding an Indian bank (Financial Services), an IT exporter (Information Technology), a healthcare company like Sun Pharma or J&J (Healthcare), and a consumer staple like ITC or Coca-Cola (Consumer Defensive). When IT slows down during a US slowdown, domestic healthcare or FMCG may hold steady and cushion your portfolio.',
      },
      {
        heading: 'How many stocks is enough?',
        body:
          'Research shows most single-company risk disappears once you hold 10–15 well-chosen businesses across 4–6 sectors—or even simpler, a low-cost index ETF like Nifty BeES (NIFTYBEES.NS) or VOO/SPY alongside a few companies you understand deeply.',
      },
    ],
    taskLabel: 'Hold stocks across at least 3 different sectors',
    checkTask: (state) => {
      const sectors = new Set(
        state.holdings.map((h) => h.sector).filter((s) => s && s !== 'Unknown')
      );
      return sectors.size >= 3;
    },
    taskHint: 'Build positions in 3 distinct sectors (for example: Financial Services, Technology/IT, and Healthcare or Consumer Defensive). Check your Sector Allocation chart in Portfolio.',
  },
  {
    id: 'long-term-vs-trading',
    number: 6,
    title: 'Why Long-Term Investing Usually Beats Frequent Trading',
    readTime: '4 min read',
    summary: 'The math of SEBI’s retail trader data, brokerage drag, taxes, and compounding.',
    sections: [
      {
        heading: 'What real market data shows',
        body:
          'In SEBI’s widely cited study of Indian retail traders, roughly 9 out of 10 active short-term traders lost money—and even among the small minority who broke even before costs, brokerage fees, STT, and slippage pushed many into net losses. Meanwhile, an investor who simply bought the Nifty 50 or S&P 500 and held through ups and downs compounded wealth steadily over 10+ year periods.',
      },
      {
        heading: 'Real math: How "small" fees quietly crush active trading',
        body:
          'Suppose you trade ₹25,000 back and forth 4 times a week (8 orders). At ₹20 + 0.05% per order (~₹32.50 each), you pay ₹260/week—over ₹13,500 a year in friction alone! That means you have to earn +54% on that ₹25,000 just to break even on costs, before even paying short-term capital gains tax.',
      },
      {
        heading: 'Why this app separates Long-term and Trading buckets',
        body:
          'It is completely fine to test short-term trading ideas in your Trading bucket—that is what paper trading is for! By tracking both buckets side-by-side against Nifty 50 and S&P 500, you will see with your own real numbers which approach actually works better for you.',
      },
    ],
    taskLabel: 'Keep Brokerage Fees ON and inspect the Portfolio vs. Benchmark chart',
    checkTask: (state) =>
      Boolean(state.account.brokerageEnabled && state.learningEvents?.checkedBenchmarkWithFees),
    taskHint: 'Make sure Brokerage Fees are turned ON (in Settings), then open the Portfolio tab to view the Benchmark Comparison section.',
  },
  {
    id: 'risk-management',
    number: 7,
    title: 'Risk Management: Position Sizing & Having an Exit Plan Before Buying',
    readTime: '4 min read',
    summary: 'How to survive being wrong—because even the best investors are wrong 30–40% of the time.',
    sections: [
      {
        heading: 'The asymmetric math of big losses',
        body:
          'If a stock drops 50%, you do NOT need a 50% gain to get back to even—you need a 100% gain! If you put 80% of your account into one risky stock and it falls 50%, your whole portfolio is suddenly down 40%. If instead you cap any single position at 10–15% of your capital, that exact same 50% crash only dents your total portfolio by 5–7.5%—annoying, never fatal.',
      },
      {
        heading: 'Write your thesis & exit rule BEFORE emotions kick in',
        body:
          'Before clicking Buy, write one honest sentence in the Trade Note box. For a Long-term investment: "Buying TCS for steady cash flows; will hold 3+ years unless margins structurally break." For a Trading position: "Buying bounce at ₹1,200; will exit at ₹1,140 (-5% stop loss) or ₹1,320 (+10% target)."',
      },
      {
        heading: 'Why stop losses matter for Trading (and differ for Long-term)',
        body:
          'In short-term trading, a disciplined stop-loss (deciding in advance the price where your idea is proven wrong) prevents a small 5% mistake from turning into a 40% disaster. In long-term investing, your "stop" is usually fundamental—selling when the business thesis breaks, rather than because the stock dipped 8% in a normal market correction.',
      },
    ],
    taskLabel: 'Place a trade with a written thesis / exit plan note',
    checkTask: (state) => state.orders.some((o) => o.note && o.note.trim().length >= 8),
    taskHint: 'On any stock’s Order Ticket, fill in the "Trade Thesis / Exit Plan" box (at least a short sentence explaining why you’re buying and when you’d sell) before placing the order.',
  },
];

/**
 * Generates a calm, educational post-trade reflection right after an order is placed.
 * Flags common beginner pitfalls honestly without shaming or pushing more trades.
 */
export function buildPostTradeReflection({ order, transaction, state, quotesMap, usdinr }) {
  const warnings = [];
  const positives = [];

  const summary = computePortfolioSummary(state, quotesMap, usdinr);
  const nowMs = Date.now();

  // 1. Check written thesis / exit plan
  if (!order.note || order.note.trim().length < 6) {
    warnings.push({
      title: 'No exit plan or thesis recorded',
      detail:
        'Beginners often buy without deciding in advance what would make them sell. Next time, jot down one sentence explaining why you entered and when you would exit.',
    });
  } else {
    positives.push('You wrote down your reasoning before placing the order—great discipline.');
  }

  // 2. Check single-stock concentration (on BUY)
  if (order.side === 'BUY' && summary.totalPortfolioBase > 0) {
    const stockHoldings = summary.holdings.filter((h) => h.symbol === order.symbol);
    const totalStockValueBase = stockHoldings.reduce((s, h) => s + h.currentValueBase, 0);
    const weightPct = (totalStockValueBase / summary.totalPortfolioBase) * 100;

    if (weightPct >= 35) {
      warnings.push({
        title: `Heavy concentration in ${order.symbol} (${weightPct.toFixed(1)}% of account)`,
        detail:
          'Putting more than a third of your virtual capital into a single company exposes your entire account to one bad earnings report. Many long-term investors cap single stocks at 10–20%.',
      });
    } else if (weightPct > 0 && weightPct <= 20) {
      positives.push(`Sensible position size: ${order.symbol} is ${weightPct.toFixed(1)}% of your account.`);
    }
  }

  // 3. Check overtrading (4+ orders in the last 24 hours)
  const recent24hOrders = state.orders.filter(
    (o) =>
      o.status !== 'CANCELLED' &&
      o.status !== 'REJECTED' &&
      nowMs - new Date(o.createdAt).getTime() <= 24 * 60 * 60 * 1000
  );
  if (recent24hOrders.length >= 4) {
    warnings.push({
      title: `High trading pace (${recent24hOrders.length} orders in 24 hours)`,
      detail:
        'Frequent trading racks up brokerage costs and usually reflects chasing price moves rather than calm research. Consider pausing for a day before your next order.',
    });
  }

  // 4. Check impatience: selling a Long-term holding within 7 days of buying
  if (
    order.side === 'SELL' &&
    order.bucket === 'LONG_TERM' &&
    transaction &&
    transaction.holdingDays !== null &&
    transaction.holdingDays < 7
  ) {
    warnings.push({
      title: `Sold a Long-term holding after ${transaction.holdingDays.toFixed(1)} days`,
      detail:
        'This position was tagged Long-term, yet exited in under a week. Ask yourself whether the company’s fundamentals changed—or if short-term price noise triggered an impulse.',
    });
  }

  // 5. Praise Limit Order usage
  if (order.orderType === 'LIMIT') {
    positives.push('Using a Limit order gave you full control over your execution price.');
  }

  // 6. Brokerage reminder if turned off
  if (!state.account.brokerageEnabled) {
    warnings.push({
      title: 'Brokerage fees are currently OFF',
      detail:
        'Zero-fee simulations can make frequent trading look easier than reality. Consider turning brokerage fees ON in Settings.',
    });
  }

  return {
    order,
    transaction,
    warnings,
    positives,
  };
}

/**
 * Computes the Weekly Behaviour Summary for the Learn page.
 */
export function computeWeeklyReview(state, quotesMap, usdinr) {
  const nowMs = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const weekTx = state.transactions.filter(
    (t) => nowMs - new Date(t.executedAt).getTime() <= sevenDaysMs
  );
  const allSells = state.transactions.filter((t) => t.txType === 'SELL' && t.realizedPnlNative !== null);
  const weekSells = weekTx.filter((t) => t.txType === 'SELL' && t.realizedPnlNative !== null);

  // Use last 7 days if sells exist this week, otherwise fall back to overall closed trades so beginners still see useful stats
  const sellsForStats = weekSells.length > 0 ? weekSells : allSells;
  const statsScope = weekSells.length > 0 ? 'Last 7 days' : 'All closed trades';

  const wins = sellsForStats.filter((s) => s.realizedPnlNative > 0).length;
  const winRate = sellsForStats.length > 0 ? Number(((wins / sellsForStats.length) * 100).toFixed(1)) : null;

  const holdingSamples = sellsForStats
    .map((s) => s.holdingDays)
    .filter((d) => d !== null && d !== undefined);
  const avgHoldingDays =
    holdingSamples.length > 0
      ? Number((holdingSamples.reduce((a, b) => a + b, 0) / holdingSamples.length).toFixed(1))
      : null;

  // Biggest loss (in base currency for apples-to-apples ranking, while displaying native currency too)
  let biggestLoss = null;
  for (const s of sellsForStats) {
    if (s.realizedPnlNative < 0) {
      const lossBase = s.realizedPnlNative * (s.fxRate || 1);
      if (!biggestLoss || lossBase < biggestLoss.lossBase) {
        biggestLoss = {
          symbol: s.symbol,
          amountNative: s.realizedPnlNative,
          currency: s.currency,
          lossBase,
        };
      }
    }
  }

  const totalFeesWeek = Number(
    weekTx.reduce((sum, t) => sum + Number(t.feeInBase || 0), 0).toFixed(2)
  );
  const summary = computePortfolioSummary(state, quotesMap, usdinr);
  const distinctSectors = new Set(
    summary.holdings.map((h) => h.sector).filter((s) => s && s !== 'Unknown')
  );
  const maxPositionPct =
    summary.totalPortfolioBase > 0
      ? Math.max(0, ...summary.holdings.map((h) => (h.currentValueBase / summary.totalPortfolioBase) * 100))
      : 0;
  const ordersWithoutNotes = state.orders.filter(
    (o) => (!o.note || o.note.trim().length < 6) && o.status !== 'CANCELLED'
  ).length;

  // Choose ONE clear, personalized suggestion to improve
  let suggestion =
    'Start slow: add 3–5 familiar Indian or US companies to your Watchlist, read their P/E & business overview, and place a small Long-term Limit order.';

  if (weekTx.length >= 10) {
    suggestion = `You executed ${weekTx.length} trades in the last 7 days. Try cutting your trade frequency in half next week—let your thesis play out instead of reacting to daily noise.`;
  } else if (maxPositionPct >= 35 && summary.holdings.length > 0) {
    suggestion = `Your largest single stock makes up ${maxPositionPct.toFixed(0)}% of your portfolio. Gradually spread new cash across other sectors so no single company can derail your account.`;
  } else if (summary.holdings.length >= 2 && distinctSectors.size < 3) {
    suggestion = `Your holdings currently span only ${distinctSectors.size} sector(s). Explore a different industry (e.g., Healthcare, Consumer Defensive, or an Index ETF) to reduce sector risk.`;
  } else if (avgHoldingDays !== null && avgHoldingDays < 3) {
    suggestion = `Your average closed holding period is ${avgHoldingDays} days. Try keeping your Long-term bucket untouched for at least a full month so compounding has room to work.`;
  } else if (ordersWithoutNotes >= 2) {
    suggestion = 'Several of your orders were placed without a written thesis. Next week, write a 1-sentence reason and exit rule on every order before clicking Buy.';
  } else if (!state.account.brokerageEnabled) {
    suggestion = 'Turn Brokerage Fees ON in Settings this week so your virtual returns reflect real-world trading costs.';
  } else if (state.transactions.length > 0) {
    suggestion = 'Great calm pace so far! Review your Portfolio vs. Benchmark curve once a week instead of watching intraday candles.';
  }

  return {
    tradesThisWeek: weekTx.length,
    totalTradesAllTime: state.transactions.length,
    closedSellsCount: sellsForStats.length,
    statsScope,
    winRate,
    avgHoldingDays,
    biggestLoss,
    totalFeesWeek,
    distinctSectorsCount: distinctSectors.size,
    maxPositionPct: Number(maxPositionPct.toFixed(1)),
    suggestion,
  };
}
