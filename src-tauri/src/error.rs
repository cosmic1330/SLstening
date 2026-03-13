use serde::{Serialize, Serializer};
use std::fmt;
use ts_rs::TS;

#[derive(Debug, TS)]
#[ts(export)]
pub enum AppError {
    Database(String),
    Io(String),
    Serialization(String),
    Tauri(String),
    Csv(String),
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    Updater(String),
    Unknown(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Database(s) => write!(f, "Database error: {}", s),
            AppError::Io(s) => write!(f, "IO error: {}", s),
            AppError::Serialization(s) => write!(f, "Serialization error: {}", s),
            AppError::Tauri(s) => write!(f, "Tauri error: {}", s),
            AppError::Csv(s) => write!(f, "CSV error: {}", s),
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            AppError::Updater(s) => write!(f, "Updater error: {}", s),
            AppError::Unknown(s) => write!(f, "Unknown error: {}", s),
        }
    }
}

impl std::error::Error for AppError {}

// Manually implement Serialize to ensure a consistent { code, message } structure for the frontend
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        #[derive(Serialize)]
        struct ErrorResponse<'a> {
            code: &'a str,
            message: String,
        }

        let (code, message) = match self {
            AppError::Database(err) => {
                log::error!("Database Error: {}", err);
                ("DATABASE_ERROR", err.clone())
            }
            AppError::Io(err) => {
                log::error!("IO Error: {}", err);
                ("IO_ERROR", err.clone())
            }
            AppError::Serialization(err) => {
                log::error!("Serialization Error: {}", err);
                ("SERIALIZATION_ERROR", err.clone())
            }
            AppError::Tauri(err) => {
                log::error!("Tauri Error: {}", err);
                ("TAURI_ERROR", err.clone())
            }
            AppError::Csv(err) => {
                log::error!("CSV Error: {}", err);
                ("CSV_ERROR", err.clone())
            }
            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            AppError::Updater(err) => {
                log::error!("Updater Error: {}", err);
                ("UPDATER_ERROR", err.clone())
            }
            AppError::Unknown(err) => {
                log::error!("Unknown Error: {}", err);
                ("UNKNOWN_ERROR", err.clone())
            }
        };

        ErrorResponse { code, message }.serialize(serializer)
    }
}

impl From<tauri::Error> for AppError {
    fn from(err: tauri::Error) -> Self {
        AppError::Tauri(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serialization(err.to_string())
    }
}

impl From<crate::csv_processor::CsvError> for AppError {
    fn from(err: crate::csv_processor::CsvError) -> Self {
        AppError::Csv(err.to_string())
    }
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
impl From<tauri_plugin_updater::Error> for AppError {
    fn from(err: tauri_plugin_updater::Error) -> Self {
        AppError::Updater(err.to_string())
    }
}
