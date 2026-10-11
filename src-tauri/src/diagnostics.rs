//! Production-only, privacy-minimal native diagnostics.
use chrono::Local;
use log::{LevelFilter, Log, Metadata, Record};
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, Once, OnceLock, RwLock};

const DSN: &str = "https://92d68526bd07d01956180a9ff39b4134@o4512236734578688.ingest.us.sentry.io/4512236741853184";
static INIT: Once = Once::new();
static USER_ID: OnceLock<RwLock<Option<String>>> = OnceLock::new();

fn user_id() -> &'static RwLock<Option<String>> {
    USER_ID.get_or_init(|| RwLock::new(None))
}

fn sanitize_stacktrace(stacktrace: &mut sentry::protocol::Stacktrace) {
    for frame in &mut stacktrace.frames {
        frame.abs_path = frame.filename.clone();
        frame.pre_context.clear();
        frame.context_line = None;
        frame.post_context.clear();
        frame.vars.clear();
    }
}

fn sanitize_event(
    mut event: sentry::protocol::Event<'static>,
) -> Option<sentry::protocol::Event<'static>> {
    let safe_code = event
        .tags
        .get("code")
        .cloned()
        .unwrap_or_else(|| "NATIVE_APPLICATION_ERROR".to_string());
    event
        .tags
        .retain(|key, _| matches!(key.as_str(), "operation" | "code" | "platform"));
    event.user = user_id()
        .read()
        .ok()
        .and_then(|id| id.clone())
        .map(|id| sentry::User {
            id: Some(id),
            ..Default::default()
        });
    event.request = None;
    event.server_name = None;
    event.culprit = None;
    event.transaction = None;
    event.breadcrumbs = Default::default();
    event.contexts.clear();
    event.extra.clear();
    event.modules.clear();
    event.logentry = None;
    event.message = event.message.map(|_| safe_code.clone());
    event.template = None;
    event.threads = Default::default();
    if let Some(stacktrace) = event.stacktrace.as_mut() {
        sanitize_stacktrace(stacktrace);
    }
    for exception in &mut event.exception {
        exception.value = Some(safe_code.clone());
        if let Some(stacktrace) = exception.stacktrace.as_mut() {
            sanitize_stacktrace(stacktrace);
        }
        if let Some(stacktrace) = exception.raw_stacktrace.as_mut() {
            sanitize_stacktrace(stacktrace);
        }
        if let Some(mechanism) = exception.mechanism.as_mut() {
            mechanism.description = None;
            mechanism.help_link = None;
            mechanism.data.clear();
        }
    }
    Some(event)
}

pub fn init(release: &str) {
    if cfg!(debug_assertions) {
        return;
    }
    INIT.call_once(|| {
        // The guard intentionally lives for the process lifetime so panic capture
        // remains available until Tauri exits.
        let options = sentry::ClientOptions::new()
            .release(release.to_owned())
            .environment("production")
            .before_send(sanitize_event);
        let guard = sentry::init((DSN, options));
        let _ = Box::leak(Box::new(guard));
    });
}

pub fn set_user(user_id: Option<&str>) {
    if let Ok(mut current) = self::user_id().write() {
        *current = user_id.map(str::to_owned);
    }
    if cfg!(debug_assertions) {
        return;
    }
}

pub fn capture_code(operation: &str, code: &str) {
    if cfg!(debug_assertions) {
        return;
    }
    sentry::with_scope(
        |scope| {
            scope.set_tag("operation", operation);
            scope.set_tag("code", code);
            scope.set_tag("platform", std::env::consts::OS);
        },
        || sentry::capture_message(code, sentry::Level::Error),
    );
}

pub const LOG_FILE_PREFIX: &str = "slistening";
pub const LOG_FILE_KEEP: usize = 7;
pub const LOG_FILE_MAX_BYTES: u64 = 1024 * 1024;

struct RollingFile {
    directory: PathBuf,
    prefix: String,
    max_bytes: u64,
    keep: usize,
    file: Option<File>,
    bytes_written: u64,
    collision: u32,
}

impl RollingFile {
    fn new(directory: PathBuf, prefix: &str, max_bytes: u64, keep: usize) -> io::Result<Self> {
        fs::create_dir_all(&directory)?;
        let active = directory.join(format!("{prefix}.log"));
        let bytes_written = active
            .metadata()
            .map(|metadata| metadata.len())
            .unwrap_or(0);
        let mut rolling = Self {
            directory,
            prefix: prefix.to_owned(),
            max_bytes,
            keep,
            file: None,
            bytes_written,
            collision: 0,
        };
        if rolling.bytes_written >= rolling.max_bytes {
            rolling.rotate()?;
        }
        rolling.open()?;
        prune_log_files(&rolling.directory, &rolling.prefix, rolling.keep)?;
        Ok(rolling)
    }

    fn active_path(&self) -> PathBuf {
        self.directory.join(format!("{}.log", self.prefix))
    }

    fn open(&mut self) -> io::Result<()> {
        if self.file.is_none() {
            self.file = Some(
                OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(self.active_path())?,
            );
        }
        Ok(())
    }

    fn rotated_path(&mut self) -> PathBuf {
        loop {
            let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
            let suffix = if self.collision == 0 {
                String::new()
            } else {
                format!("_{:03}", self.collision)
            };
            self.collision = self.collision.saturating_add(1);
            let candidate = self
                .directory
                .join(format!("{}_{timestamp}{suffix}.log", self.prefix));
            if !candidate.exists() {
                return candidate;
            }
        }
    }

    fn rotate(&mut self) -> io::Result<()> {
        if let Some(mut file) = self.file.take() {
            file.flush()?;
        }
        let active = self.active_path();
        if active.is_file() && active.metadata()?.len() > 0 {
            fs::rename(&active, self.rotated_path())?;
        }
        self.bytes_written = 0;
        self.open()?;
        prune_log_files(&self.directory, &self.prefix, self.keep)
    }

    fn write_line(&mut self, line: &str) -> io::Result<()> {
        // Log records are expected to be small, but cap an unexpectedly large
        // record so the documented per-file limit remains a real upper bound.
        let available = self.max_bytes.saturating_sub(1) as usize;
        let mut end = line.len().min(available);
        while !line.is_char_boundary(end) {
            end -= 1;
        }
        let line = &line[..end];
        let record_bytes = line.len() as u64 + 1;
        if self.bytes_written > 0 && self.bytes_written + record_bytes > self.max_bytes {
            self.rotate()?;
        }
        self.open()?;
        if let Some(file) = self.file.as_mut() {
            writeln!(file, "{line}")?;
            file.flush()?;
        }
        self.bytes_written += record_bytes;
        Ok(())
    }
}

struct LocalLogger {
    file: Mutex<RollingFile>,
}

impl Log for LocalLogger {
    fn enabled(&self, metadata: &Metadata<'_>) -> bool {
        metadata.level() <= log::Level::Info
    }

    fn log(&self, record: &Record<'_>) {
        if !self.enabled(record.metadata()) {
            return;
        }
        let line = format!(
            "[{}][{}][{}] {}",
            Local::now().format("%Y-%m-%d %H:%M:%S%.3f"),
            record.level(),
            record.target(),
            record.args()
        );
        // A closed or unavailable stdout must never turn diagnostic logging
        // into an application panic; the file sink remains authoritative.
        let _ = writeln!(io::stdout().lock(), "{line}");
        if let Ok(mut file) = self.file.lock() {
            let _ = file.write_line(&line);
        }
    }

    fn flush(&self) {
        if let Ok(mut state) = self.file.lock() {
            if let Some(file) = state.file.as_mut() {
                let _ = file.flush();
            }
        }
    }
}

pub fn init_local_logger(directory: PathBuf) -> Result<(), String> {
    let file = RollingFile::new(
        directory,
        LOG_FILE_PREFIX,
        LOG_FILE_MAX_BYTES,
        LOG_FILE_KEEP,
    )
    .map_err(|error| error.to_string())?;
    log::set_boxed_logger(Box::new(LocalLogger {
        file: Mutex::new(file),
    }))
    .map_err(|error| error.to_string())?;
    log::set_max_level(LevelFilter::Info);
    Ok(())
}

/// Retain only the newest regular files in the app logger naming family:
/// `slistening.log` and `slistening_YYYY-MM-DD_HH-MM-SS[_NNN].log`.
/// Legacy collision `.bak` files remain supported. Symlinks, directories, and
/// unrelated files are ignored.
pub fn prune_log_files(directory: &Path, prefix: &str, keep: usize) -> std::io::Result<()> {
    let active_name = format!("{prefix}.log");
    let active_exists = directory
        .join(&active_name)
        .symlink_metadata()
        .map(|metadata| metadata.file_type().is_file() && !metadata.file_type().is_symlink())
        .unwrap_or(false);
    let mut files = fs::read_dir(directory)?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let ty = entry.file_type().ok()?;
            if !ty.is_file() || ty.is_symlink() {
                return None;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            if !(name.starts_with(&format!("{prefix}_"))
                && (name.ends_with(".log") || name.ends_with(".log.bak")))
            {
                return None;
            }
            let modified = entry.metadata().ok()?.modified().ok();
            Some((modified, name, entry.path()))
        })
        .collect::<Vec<_>>();
    files.sort_by(|a, b| a.0.cmp(&b.0).then_with(|| a.1.cmp(&b.1)));
    // Never attempt to delete the active file (important on Windows). It counts
    // toward the retention budget, leaving the remainder for rotated files.
    let rotated_keep = keep.saturating_sub(usize::from(active_exists));
    let remove_count = files.len().saturating_sub(rotated_keep);
    for (_, _, path) in files.into_iter().take(remove_count) {
        fs::remove_file(path)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::borrow::Cow;
    #[test]
    fn prune_keeps_newest_scoped_regular_logs_only() {
        let dir = tempfile::tempdir().unwrap();
        for index in 0..9 {
            fs::write(
                dir.path()
                    .join(format!("slistening_2026-01-01_00-00-0{index}.log")),
                "x",
            )
            .unwrap();
            std::thread::sleep(std::time::Duration::from_millis(2));
        }
        fs::write(dir.path().join("other.log"), "x").unwrap();
        fs::create_dir(dir.path().join("slistening_2026-01-01_00-00-99.log")).unwrap();
        prune_log_files(dir.path(), "slistening", 7).unwrap();
        let count = fs::read_dir(dir.path())
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| {
                entry.file_type().unwrap().is_file()
                    && entry
                        .file_name()
                        .to_string_lossy()
                        .starts_with("slistening_")
            })
            .count();
        assert_eq!(count, 7);
        assert!(dir.path().join("other.log").exists());
        assert!(dir
            .path()
            .join("slistening_2026-01-01_00-00-99.log")
            .is_dir());
    }

    #[test]
    fn prune_counts_but_never_removes_the_active_log() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("slistening.log"), "active").unwrap();
        for index in 0..8 {
            fs::write(
                dir.path()
                    .join(format!("slistening_2026-01-01_00-00-0{index}.log")),
                "rotated",
            )
            .unwrap();
        }

        prune_log_files(dir.path(), "slistening", 7).unwrap();

        assert!(dir.path().join("slistening.log").exists());
        let scoped_count = fs::read_dir(dir.path())
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("slistening")
            })
            .count();
        assert_eq!(scoped_count, 7);
    }

    #[test]
    fn rolling_file_rotates_during_runtime_and_enforces_retention() {
        let dir = tempfile::tempdir().unwrap();
        let mut rolling = RollingFile::new(dir.path().to_owned(), "slistening", 128, 3).unwrap();

        for index in 0..20 {
            rolling
                .write_line(&format!("record-{index:02}-{}", "x".repeat(32)))
                .unwrap();
        }
        drop(rolling);

        let logs = fs::read_dir(dir.path())
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().unwrap().is_file())
            .collect::<Vec<_>>();
        assert_eq!(logs.len(), 3);
        assert!(logs
            .iter()
            .any(|entry| entry.file_name() == "slistening.log"));
        assert!(logs
            .iter()
            .all(|entry| entry.metadata().unwrap().len() <= 128));
    }

    #[cfg(unix)]
    #[test]
    fn prune_ignores_matching_symlinks() {
        use std::os::unix::fs::symlink;
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("outside.log"), "outside").unwrap();
        let link = dir.path().join("slistening_2026-01-01_00-00-00.log");
        symlink(dir.path().join("outside.log"), &link).unwrap();

        prune_log_files(dir.path(), "slistening", 0).unwrap();

        assert!(link.symlink_metadata().unwrap().file_type().is_symlink());
        assert!(dir.path().join("outside.log").exists());
    }

    #[test]
    fn sentry_event_keeps_uuid_and_stack_but_removes_private_payloads() {
        set_user(Some("account-uuid"));
        let mut event = sentry::protocol::Event {
            message: Some("person@example.com token=secret stock=2330".into()),
            server_name: Some(Cow::Borrowed("private-host")),
            request: Some(Default::default()),
            extra: [("watchlist".into(), serde_json::json!(["2330"]))]
                .into_iter()
                .collect(),
            tags: [
                ("operation".into(), "cloud_sync".into()),
                ("code".into(), "CLOUD_SYNC_FAILED".into()),
                ("stock".into(), "2330".into()),
            ]
            .into_iter()
            .collect(),
            ..Default::default()
        };
        event.exception.values.push(sentry::protocol::Exception {
            value: Some("category PCB for person@example.com".into()),
            stacktrace: Some(sentry::protocol::Stacktrace {
                frames: vec![sentry::protocol::Frame {
                    function: Some("sync_account".into()),
                    filename: Some("account.rs".into()),
                    abs_path: Some("/Users/private/project/account.rs".into()),
                    context_line: Some("token = secret".into()),
                    ..Default::default()
                }],
                ..Default::default()
            }),
            ..Default::default()
        });

        let sanitized = sanitize_event(event).unwrap();
        let serialized = serde_json::to_string(&sanitized).unwrap();
        assert_eq!(sanitized.user.unwrap().id.as_deref(), Some("account-uuid"));
        assert_eq!(sanitized.message.as_deref(), Some("CLOUD_SYNC_FAILED"));
        assert_eq!(sanitized.tags.len(), 2);
        let frame = &sanitized.exception.values[0]
            .stacktrace
            .as_ref()
            .unwrap()
            .frames[0];
        assert_eq!(frame.function.as_deref(), Some("sync_account"));
        assert_eq!(frame.abs_path.as_deref(), Some("account.rs"));
        assert!(frame.context_line.is_none());
        for private in [
            "person@example",
            "secret",
            "2330",
            "PCB",
            "private-host",
            "/Users/private",
        ] {
            assert!(!serialized.contains(private), "leaked {private}");
        }
    }
}
