# src/utils

This directory contains a collection of utility functions that are used throughout the application.

## Data Analysis and Processing

- **analyzeIndicatorsData.ts**: Parses the JSON response from the Yahoo Finance API and transforms it into a more usable format.
- **analyzeTaData.ts**: Extracts the technical analysis data from a JSON string.
- **calcVolumeChangePercent.ts**: Calculates the percentage change in volume between two values.
- **detectKdDivergence.ts**: Detects bullish and bearish divergences between the stock price and the KD indicator.
- **detectMaCrossDivergence.ts**: Detects golden and death crosses of the moving averages.
- **detectObvDivergence.ts**: Detects bullish and bearish divergences between the stock price and the OBV indicator.
- **estimateTWSEVolume.ts**: Estimates the total trading volume for the day based on the current volume and time.
- **estimateVolume.ts**: A more advanced version of `estimateTWSEVolume.ts` that takes into account historical trading patterns.

## Formatting and URL Generation

- **formatDateTime.ts**: Formats a timestamp into a `YYYYMMDDHHMI` number.
- **formatTWSEVolume.ts**: Formats a volume number into a more readable format (e.g., "1,234.56").
- **generateDealDataDownloadUrl.ts**: Generates the URL for downloading deal data from the Yahoo Finance API.

## UI and Miscellaneous

- **checkTimeRange.ts**: Checks if the current time is within the trading hours of the Taiwan Stock Exchange.
- **getInverseColor.ts**: Calculates the inverse of a given color.
- **getRandomColor.ts**: Generates a random RGB color.
- **getTimeProgressPercent.ts**: Calculates the percentage of time that has passed in the current trading day.
- **shuffleArray.ts**: Shuffles the elements of an array.
- **translateError.ts**: Translates common error messages into Traditional Chinese.
- **updater.ts**: Checks for and installs application updates.
