# src/hooks

This directory contains a collection of custom React hooks that encapsulate reusable logic for data fetching, state management, and other side effects.

## Window Management Hooks

- **useAddWebviewWindow.ts**: A hook for opening a new webview window for adding a stock.
- **useDetailWebviewWindow.ts**: A hook for opening a detail view of a stock in a separate webview window.

## Data Fetching and Management Hooks

- **useDatabase.ts**: Initializes and provides access to the SQLite database.
- **useDatabaseDates.ts**: Fetches and provides a list of all unique dates from the `daily_deal` table.
- **useDatabaseQuery.ts**: A generic hook for executing SQL queries against the database.
- **useDeals.ts**: Fetches and processes tick and daily deal data for a specific stock from the Yahoo Finance API.
- **useDownloadStocks.ts**: Downloads a list of all available stocks from the Taiwan Stock Exchange (TWSE) and updates the local database.
- **useFindStocksByPrompt.ts**: A powerful hook that constructs and executes SQL queries to find stocks based on user-defined prompts. It uses the query builder classes to generate the SQL.
- **useHighConcurrencyDeals.ts**: A complex hook for downloading and processing a large amount of stock data with high concurrency. It uses `p-limit` to control the number of concurrent requests and includes a retry mechanism for failed requests. It also handles caching and data validation.
- **useTwseDeals.ts**: Fetches and processes tick and hourly data for the Taiwan Stock Exchange Weighted Index (TWSE).
- **useWtxDeals.ts**: Fetches and processes daily data for the Taiwan Stock Exchange Futures (WTX).

## UI and Logic Hooks

- **useMaDeduction.ts**: Calculates and provides moving average (MA) deduction values.
- **useMarketAnalysis.ts**: Analyzes market trends and momentum based on technical analysis data.
- **useScroll.ts**: Tracks the user's scroll position and determines which chart is currently in view.
