use tauri_plugin_sql::Migration;

pub static Handle: &[Migration] = &[
    // Define your migrations here
    Migration {
        version: 1,
        description: "create_initial_tables",
        sql: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);",
        kind: MigrationKind::Up,
    }
];