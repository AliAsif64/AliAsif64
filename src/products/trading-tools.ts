import type { ProductModule } from "./types.js";

export const botBazaar: ProductModule = {
  slug: "botbazaar",
  title: "BotBazaar",
  category: "trading-tools",
  tagline: "Marketplace + runtime for algorithmic trading bots",
  pricePkr: 70000,
  featureName: "Sandboxed backtester",
  featureDescription:
    "Runs a candidate bot strategy against historical price series in an isolated sandbox before it's allowed to trade live capital or be listed on the marketplace.",
  core({ strategyId, symbol }: { strategyId: string; symbol: string }) {
    return {
      strategyId,
      symbol,
      status: "deployed",
      runtime: "sandboxed-worker",
      startedAt: new Date().toISOString(),
    };
  },
  uniqueFeature({
    prices,
    buyThreshold,
    sellThreshold,
  }: {
    prices: number[];
    buyThreshold: number;
    sellThreshold: number;
  }) {
    let position = 0;
    let cash = 10_000;
    let wins = 0;
    let trades = 0;
    let entryPrice = 0;
    for (const price of prices) {
      if (position === 0 && price <= buyThreshold) {
        position = cash / price;
        entryPrice = price;
        cash = 0;
      } else if (position > 0 && price >= sellThreshold) {
        cash = position * price;
        trades += 1;
        if (price > entryPrice) wins += 1;
        position = 0;
      }
    }
    const finalEquity = cash + position * (prices.at(-1) ?? 0);
    return {
      trades,
      winRate: trades ? +(wins / trades).toFixed(2) : 0,
      finalEquity: +finalEquity.toFixed(2),
      pnlPct: +(((finalEquity - 10_000) / 10_000) * 100).toFixed(2),
    };
  },
};

export const psxScreener: ProductModule = {
  slug: "psx-screener",
  title: "PSX Screener",
  category: "trading-tools",
  tagline: "Real-time PSX stock screener with 40+ filters",
  pricePkr: 7500,
  featureName: "Saved screen combos",
  featureDescription:
    "Lets a user save a named combination of filters (e.g. 'value-picks': P/E < 8 and dividend yield > 6%) and re-apply it in one call instead of rebuilding filters every session.",
  core({
    stocks,
    minPE,
    maxPE,
    minDividendYield,
  }: {
    stocks: { symbol: string; pe: number; dividendYield: number }[];
    minPE?: number;
    maxPE?: number;
    minDividendYield?: number;
  }) {
    return stocks.filter(
      (s) =>
        (minPE === undefined || s.pe >= minPE) &&
        (maxPE === undefined || s.pe <= maxPE) &&
        (minDividendYield === undefined || s.dividendYield >= minDividendYield)
    );
  },
  uniqueFeature({
    savedScreens,
    screenName,
    stocks,
  }: {
    savedScreens: Record<string, { minPE?: number; maxPE?: number; minDividendYield?: number }>;
    screenName: string;
    stocks: { symbol: string; pe: number; dividendYield: number }[];
  }) {
    const filter = savedScreens[screenName];
    if (!filter) return { error: `No saved screen named '${screenName}'` };
    const matches = stocks.filter(
      (s) =>
        (filter.minPE === undefined || s.pe >= filter.minPE) &&
        (filter.maxPE === undefined || s.pe <= filter.maxPE) &&
        (filter.minDividendYield === undefined || s.dividendYield >= filter.minDividendYield)
    );
    return { screenName, filter, matchCount: matches.length, matches };
  },
};

export const cryptoPortfolioTracker: ProductModule = {
  slug: "crypto-portfolio-tracker",
  title: "Crypto Portfolio Tracker",
  category: "trading-tools",
  tagline: "Track P&L across Binance, Bybit, and Pakistani P2P",
  pricePkr: 4500,
  featureName: "Cross-exchange transfer reconciliation",
  featureDescription:
    "Detects internal transfers between a user's own exchange accounts and excludes them from P&L/volume, preventing double-counting that inflates apparent trading activity.",
  core({
    holdings,
  }: {
    holdings: { exchange: string; asset: string; qty: number; avgCost: number; price: number }[];
  }) {
    const rows = holdings.map((h) => ({
      ...h,
      marketValue: +(h.qty * h.price).toFixed(2),
      unrealizedPnl: +(h.qty * (h.price - h.avgCost)).toFixed(2),
    }));
    return { rows, totalValue: +rows.reduce((s, r) => s + r.marketValue, 0).toFixed(2) };
  },
  uniqueFeature({
    transactions,
  }: {
    transactions: {
      id: string;
      type: "deposit" | "withdrawal" | "trade";
      asset: string;
      qty: number;
      timestamp: string;
    }[];
  }) {
    const withdrawals = transactions.filter((t) => t.type === "withdrawal");
    const deposits = transactions.filter((t) => t.type === "deposit");
    const internalTransfers: { withdrawal: string; deposit: string }[] = [];
    for (const w of withdrawals) {
      const match = deposits.find(
        (d) =>
          d.asset === w.asset &&
          Math.abs(d.qty - w.qty) < 1e-6 &&
          !internalTransfers.some((t) => t.deposit === d.id)
      );
      if (match) internalTransfers.push({ withdrawal: w.id, deposit: match.id });
    }
    return {
      internalTransfersFound: internalTransfers.length,
      internalTransfers,
      note: "These pairs are excluded from realized volume and P&L calculations.",
    };
  },
};

export const tradingViewAlertBot: ProductModule = {
  slug: "tradingview-alert-bot",
  title: "TradingView Alert Bot",
  category: "trading-tools",
  tagline: "Forward TradingView alerts to Telegram/WhatsApp with position sizing",
  pricePkr: 6000,
  featureName: "Risk-based position sizing",
  featureDescription:
    "Every forwarded alert is annotated with a suggested position size derived from the user's account equity and a fixed risk-per-trade percentage, not just the raw signal.",
  core({ symbol, action, price }: { symbol: string; action: "buy" | "sell"; price: number }) {
    return {
      forwardedTo: ["telegram", "whatsapp"],
      symbol,
      action,
      price,
      forwardedAt: new Date().toISOString(),
    };
  },
  uniqueFeature({
    accountEquity,
    riskPct,
    entryPrice,
    stopLossPrice,
  }: {
    accountEquity: number;
    riskPct: number;
    entryPrice: number;
    stopLossPrice: number;
  }) {
    const riskAmount = accountEquity * (riskPct / 100);
    const perUnitRisk = Math.abs(entryPrice - stopLossPrice);
    const positionSize = perUnitRisk > 0 ? +(riskAmount / perUnitRisk).toFixed(4) : 0;
    return {
      riskAmount: +riskAmount.toFixed(2),
      perUnitRisk: +perUnitRisk.toFixed(4),
      positionSize,
      positionValue: +(positionSize * entryPrice).toFixed(2),
    };
  },
};

export const forexJournal: ProductModule = {
  slug: "forex-journal",
  title: "Forex Journal",
  category: "trading-tools",
  tagline: "Trade journal with equity curve, R-multiples, and screenshot log",
  pricePkr: 3500,
  featureName: "Equity curve & R-multiple calculator",
  featureDescription:
    "Converts a raw list of trades into a running equity curve and per-trade R-multiples so a trader can see consistency of edge, not just win/loss counts.",
  core({
    trade,
  }: {
    trade: { pair: string; entry: number; exit: number; direction: "long" | "short"; risk: number };
  }) {
    const raw = trade.direction === "long" ? trade.exit - trade.entry : trade.entry - trade.exit;
    return { ...trade, pnl: +raw.toFixed(4), rMultiple: trade.risk ? +(raw / trade.risk).toFixed(2) : 0 };
  },
  uniqueFeature({
    trades,
    startingEquity,
  }: {
    trades: { direction: "long" | "short"; entry: number; exit: number; risk: number }[];
    startingEquity: number;
  }) {
    let equity = startingEquity;
    const curve = trades.map((t) => {
      const raw = t.direction === "long" ? t.exit - t.entry : t.entry - t.exit;
      const rMultiple = t.risk ? +(raw / t.risk).toFixed(2) : 0;
      equity += raw;
      return { equity: +equity.toFixed(2), rMultiple };
    });
    const avgR = curve.length
      ? +(curve.reduce((s, c) => s + c.rMultiple, 0) / curve.length).toFixed(2)
      : 0;
    return { equityCurve: curve, endingEquity: +equity.toFixed(2), averageRMultiple: avgR };
  },
};

export const tradingToolsProducts: ProductModule[] = [
  botBazaar,
  psxScreener,
  cryptoPortfolioTracker,
  tradingViewAlertBot,
  forexJournal,
];
