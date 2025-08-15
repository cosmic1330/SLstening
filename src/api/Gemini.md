# src/api

This directory is responsible for handling HTTP requests within the Tauri application.

## Files

- **http.ts**: Provides a `tauriFetcher` function that uses the `@tauri-apps/plugin-http` to make GET requests. It is configured to not use any caching (`cache: "no-store"`).

- **http_cache.ts**: Contains another `tauriFetcher` function that also uses the Tauri HTTP plugin. This version allows specifying the response type (either `text` or `arrayBuffer`) and uses the default caching behavior.
