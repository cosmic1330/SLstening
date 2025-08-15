# src/store

This directory contains the Zustand stores for managing the application's global state.

## Stores

- **Stock.store.ts**: This store manages the list of tracked stocks and the list of all available stocks.
    - `stocks`: An array of the stocks that the user is currently tracking.
    - `menu`: An array of all available stocks.
    - `increase`: An action for adding a new stock to the tracked list.
    - `remove`: An action for removing a stock from the tracked list.
    - `reload`: An action for reloading the stock and menu lists from the store.
    - `clear`: An action for clearing the tracked stock list.
    - `update_menu`: An action for updating the list of all available stocks.
    - `factory_reset`: An action for clearing all data from the store.
