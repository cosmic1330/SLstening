# src-tauri/src

This directory contains the Rust source code for the Tauri backend.

## Files

- **main.rs**: The entry point for the Tauri application. It calls the `run` function from the `slistening_lib` library.

- **lib.rs**: This is the main library file for the Tauri application. It defines the Tauri commands, sets up the plugins, and handles the application's lifecycle. It includes the following commands:
    - `greet`: A simple command that returns a greeting.
    - `create_csv_from_json`: Creates a CSV file from a JSON string.
    - `get_db_size`: Returns the size of the SQLite database.

- **csv_processor.rs**: This file contains the logic for writing data to CSV files. It includes functions for writing `Deal` and `Skills` data to separate CSV files.

- **models.rs**: Defines the data structures used in the application, including `DataEntity`, `Deal`, and `Skills`.

- **sqlite.rs**: This file contains the database migrations for the SQLite database.
