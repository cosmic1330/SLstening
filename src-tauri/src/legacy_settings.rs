use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

const OLD_SETTINGS_FILE: &str = "settings.json";
const ACCOUNT_STATE_FILE: &str = "account-state.json";
const DISPOSITION_KEY: &str = "legacy-settings-disposition";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacySettingsStatus {
    pub present: bool,
    pub disposition: Option<String>,
    pub path: String,
}

#[derive(Clone)]
pub struct LegacySettingsManager {
    app: AppHandle,
}

impl LegacySettingsManager {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }

    fn path(&self) -> Result<PathBuf, String> {
        self.app
            .path()
            .app_data_dir()
            .map(|dir| dir.join(OLD_SETTINGS_FILE))
            .map_err(|_| "LEGACY_SETTINGS_PATH_UNAVAILABLE".to_string())
    }

    fn disposition(&self) -> Result<Option<String>, String> {
        let store = self
            .app
            .store(ACCOUNT_STATE_FILE)
            .map_err(|_| "ACCOUNT_STATE_UNAVAILABLE".to_string())?;
        Ok(store
            .get(DISPOSITION_KEY)
            .and_then(|value| value.as_str().map(ToOwned::to_owned)))
    }

    pub fn status(&self) -> Result<LegacySettingsStatus, String> {
        let path = self.path()?;
        let disposition = self.disposition()?;
        // Metadata only: the obsolete file is never parsed or loaded as a
        // Store. A symlink is not treated as an eligible app-data file.
        let present = disposition.is_none()
            && fs::symlink_metadata(&path)
                .map(|metadata| metadata.file_type().is_file())
                .unwrap_or(false);
        Ok(LegacySettingsStatus {
            present,
            disposition,
            path: path.to_string_lossy().to_string(),
        })
    }

    pub fn keep(&self) -> Result<LegacySettingsStatus, String> {
        self.persist("keep")?;
        self.status()
    }

    pub fn delete(&self) -> Result<LegacySettingsStatus, String> {
        let path = self.path()?;
        if fs::symlink_metadata(&path)
            .map(|metadata| metadata.file_type().is_symlink())
            .unwrap_or(false)
        {
            return Err("LEGACY_SETTINGS_DELETE_FAILED".to_string());
        }
        match fs::remove_file(&path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => return Err("LEGACY_SETTINGS_DELETE_FAILED".to_string()),
        }
        self.persist("delete")?;
        self.status()
    }

    fn persist(&self, value: &str) -> Result<(), String> {
        let store = self
            .app
            .store(ACCOUNT_STATE_FILE)
            .map_err(|_| "ACCOUNT_STATE_UNAVAILABLE".to_string())?;
        store.set(DISPOSITION_KEY, value.to_string());
        store
            .save()
            .map_err(|_| "ACCOUNT_STATE_WRITE_FAILED".to_string())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn disposition_names_are_stable() {
        assert_eq!(super::DISPOSITION_KEY, "legacy-settings-disposition");
        assert_eq!(super::OLD_SETTINGS_FILE, "settings.json");
    }
}
