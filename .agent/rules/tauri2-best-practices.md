---
trigger: always_on
---

# Tauri 2.0 Professional Architecture & Decoupling Specifications

**1. Data Management & Synchronization Guidelines**

* **Offline-First Strategy**: All UI components must read data from local SQLite first to ensure instant responsiveness. Data updates must be performed asynchronously by the Rust backend; upon completion, emit a Tauri event to notify the frontend to re-fetch.
* **Synchronization Rules**: Watchlist and settings require bidirectional sync with Supabase on user login, app startup, and manual trigger (latest timestamp wins). Stock trade data is stored only in local SQLite as cache and must never be synced to the cloud.
* **Database Migration**: Every SQLite schema change must be implemented via migration files in `src-tauri/migrations/*.sql`. Direct schema modification without a migration is strictly prohibited. Use connection pooling (e.g., `sqlx::SqlitePool`) in Tauri state.
* **Consistency Guarantee**: All multi-table write operations must use database transactions to ensure atomicity.

**2. Frontend Development & UI Optimization Guidelines** (React + TS + TanStack Query + MUI)

* **State Management Separation**: Use **TanStack Query (React Query)** strictly for asynchronous data fetching, caching, and syncing with Tauri IPC. Use **Zustand** ONLY for pure frontend global UI state (e.g., theme, sidebar toggle).
* **Type Validation Boundaries**:
* **Trust IPC**: For data returning from Tauri Rust backend, strictly rely on `ts-rs` generated TypeScript interfaces. Do not re-validate with Zod.
* **Validate Inputs**: Use Zod schemas (`z.object({...})`) strictly for user form inputs or direct external API calls.


* **Single Responsibility & IPC Encapsulation**: **Never call `invoke` directly inside UI components.** All Tauri IPC calls must be encapsulated in a dedicated API service layer (`src/api/*.ts`) and wrapped with custom hooks (`useFeature.ts`).
* **Component Complexity**: Keep components lightweight. If a component exceeds 200 lines, immediately extract complex business logic or local state into custom hooks rather than blindly fragmenting the UI structure.
* **MUI Desktop Optimization**: Use `createTheme` + `CssBaseline`. Globally disable ripple. Dialogs use `disableScrollLock: true`.
* **Cross-Platform Consistency**: Use `data-tauri-drag-region`, `user-select: none` (except inputs), system font stack first, and listen to `window.onThemeChanged`.

**3. Rust Backend Commands & Error Handling Guidelines**

* **Command Rules**: Every `#[tauri::command]` must be `async fn` and return `Result<T, AppError>`. Never return raw strings (`String`) for errors.
* **Custom AppError**: Implement a custom `AppError` enum that implements `serde::Serialize` to return structured errors (code, message) to the frontend. Never use `unwrap()` or `expect()` in production code.
* **Unified Logging**: Frontend must route all important logs through Rust to `logs/` folder (Info/Warn/Error). Never log sensitive user data.
* **Error Propagation**: Frontend must wrap all API service calls in `try...catch` + ErrorBoundary on major pages.

**4. Performance Optimization Guidelines**

* **IPC Payload Limitation**: Data arrays transferred from Rust to Frontend (e.g., historical trade data) MUST be paginated or downsampled. Avoid transferring massive JSON payloads in a single IPC call to prevent UI thread blocking.
* **Chart Rendering**: Recharts limit to 300–500 data points per render. Use Sliding Window or Virtual Rendering for larger sets.
* **Computation Offloading**: Technical indicators use `useMemo`. Complex or CPU-heavy logic MUST be offloaded to the Rust backend.
* **Debounce & Throttle**: All high-frequency events (window resize, search input, slider) must be debounced/throttled.

**5. Testing & Type Consistency Guidelines**

* **Test-Driven Maintenance (CRITICAL)**: Whenever you modify existing business logic, UI components, or Rust commands, **you MUST synchronously update the corresponding unit tests in the same response**. Never leave tests broken. Maintain or increase the current test coverage.
* **Frontend Unit Tests**: Use `@tauri-apps/api/mocks` in Vitest. Every new feature/component must include unit tests (happy path + 1–2 edge cases).
* **Rust Unit Tests**: All complex/high-risk commands must have `#[test]` covering both `Ok` and `Err` branches.
* **Strict Type Synchronization**: Rust structs and TypeScript interfaces must stay perfectly in sync using `ts-rs` (`#[derive(TS)]`).

**6. AI Delivery & Verification Checklist (CRITICAL)**

When generating or modifying any feature, you MUST append a concise Markdown checklist at the end of your response to confirm you have followed the rules. Format exactly as follows:

```markdown
### ✅ Compliance Checklist
- [ ] IPC calls are encapsulated in API Service / custom hooks.
- [ ] Rust commands use `AppError` and proper logging.
- [ ] Unit tests (Vitest/Rust) are updated to maintain coverage.
- [ ] Type synchronization (`ts-rs` or Zod) is correctly applied.
- [ ] Performance/IPC payload limits are considered.
- [ ] SQLite migration SQL + sync hook provided (if data changed).

```

---

### Appendix 1: API Service Layer Implementation Reference

When building frontend data fetching, follow this architecture pattern using Tauri IPC + `ts-rs` + TanStack Query:

```typescript
// 1. Types (Generated by ts-rs from Rust backend)
// File: src/types/bindings/StockData.ts (Auto-generated, do not edit manually)
export interface StockData {
  symbol: string;
  price: number;
  timestamp: string;
}

// 2. API Service Layer (Pure IPC encapsulation)
// File: src/api/stockApi.ts
import { invoke } from '@tauri-apps/api/core';
import type { StockData } from '@/types/bindings/StockData';

export const stockApi = {
  getHistoricalData: async (symbol: string, limit: number): Promise<StockData[]> => {
    // try-catch is handled by React Query, keep API pure
    return await invoke<StockData[]>('get_historical_data', { symbol, limit });
  },
};

// 3. Custom Hook Layer (TanStack Query integration)
// File: src/hooks/useStockData.ts
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '@/api/stockApi';

export const useHistoricalData = (symbol: string, limit: number = 100) => {
  return useQuery({
    queryKey: ['stockData', symbol, limit],
    queryFn: () => stockApi.getHistoricalData(symbol, limit),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });
};

// 4. UI Component (Clean and declarative)
// File: src/components/StockChart.tsx
import { useHistoricalData } from '@/hooks/useStockData';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

export const StockChart = ({ symbol }: { symbol: string }) => {
  const { data, isLoading, error } = useHistoricalData(symbol, 300);

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Failed to load data.</Alert>;

  return (
    <div>
      <p>Loaded {data?.length} records for {symbol}</p>
    </div>
  );
};

```

---

### Appendix 2: Rust Backend Error Handling & Command Reference

When implementing Rust commands, strictly follow this `AppError` pattern to ensure safe, structured, and consistent error propagation to the frontend.

**1. Unified Error Definition (`src-tauri/src/error.rs`)**

```rust
use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error occurred: {0}")]
    Database(#[from] sqlx::Error),

    #[error("IO error occurred: {0}")]
    Io(#[from] std::io::Error),

    #[error("Validation failed: {0}")]
    Validation(String),

    #[error("Resource not found: {0}")]
    NotFound(String),
}

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
                tracing::error!("Database Error: {:?}", err); // Log internally
                ("DATABASE_ERROR", "A database error occurred.".to_string())
            }
            AppError::Io(err) => {
                tracing::error!("IO Error: {:?}", err);
                ("IO_ERROR", "A file system error occurred.".to_string())
            }
            AppError::Validation(msg) => ("VALIDATION_ERROR", msg.clone()),
            AppError::NotFound(msg) => ("NOT_FOUND", msg.clone()),
        };

        ErrorResponse { code, message }.serialize(serializer)
    }
}

```

**2. Standard Tauri Command Implementation (`src-tauri/src/commands.rs`)**

```rust
use crate::error::AppError;
use tauri::State;
use sqlx::SqlitePool;

#[derive(serde::Serialize, ts_rs::TS)]
#[ts(export)]
pub struct UserProfile {
    id: i64,
    name: String,
}

#[tauri::command]
pub async fn get_user_profile(
    user_id: i64,
    db: State<'_, SqlitePool>,
) -> Result<UserProfile, AppError> {
    // The '?' operator automatically converts sqlx::Error into AppError::Database
    let user = sqlx::query_as!(
        UserProfile,
        "SELECT id, name FROM users WHERE id = ?",
        user_id
    )
    .fetch_optional(&*db)
    .await?;

    match user {
        Some(profile) => Ok(profile),
        None => Err(AppError::NotFound(format!("User {} not found", user_id))),
    }
}

```

**3. Frontend Error Handling Interface**

```typescript
// File: src/types/error.ts
export interface AppErrorResponse {
  code: 'DATABASE_ERROR' | 'IO_ERROR' | 'VALIDATION_ERROR' | 'NOT_FOUND';
  message: string;
}

```

