use tauri_plugin_sql::{Migration, MigrationKind};

pub fn value() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE)",
            kind: MigrationKind::Up,
        },
    ]
}
