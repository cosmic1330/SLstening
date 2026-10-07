use crate::account::{
    validate_snapshot, AccountManager, AccountSnapshot, CategoryRecord, IndicatorSettings,
    StockRecord,
};
use crate::commands::chip;
use crate::market_watcher::{is_global_symbol, HistoryPoint, MarketManager, MarketTick};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};

const MAX_BODY_BYTES: usize = 1024 * 1024;
const MAX_SYMBOLS: usize = 20;
const MAX_BARS: usize = 500;
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
const ANALYSIS_DEADLINE: Duration = Duration::from_secs(25);
const AGENT_MAX_WORKERS: usize = 8;
const MCP_PROTOCOL_VERSION: &str = "2025-06-18";

#[derive(Clone)]
pub struct AgentGateway {
    pub endpoint: String,
    pub discovery_path: PathBuf,
    pub bridge_path: PathBuf,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentGatewayConfig {
    pub endpoint: String,
    pub discovery_path: String,
    pub bridge_path: String,
    pub protocol_version: String,
}

impl AgentGateway {
    pub fn config(&self) -> AgentGatewayConfig {
        AgentGatewayConfig {
            endpoint: self.endpoint.clone(),
            discovery_path: self.discovery_path.to_string_lossy().to_string(),
            bridge_path: self.bridge_path.to_string_lossy().to_string(),
            protocol_version: MCP_PROTOCOL_VERSION.to_string(),
        }
    }
}

#[derive(Clone)]
struct GatewayContext {
    token: String,
    port: u16,
    account: AccountManager,
    market: Arc<MarketManager>,
    app: AppHandle,
    rate: Arc<Mutex<RateLimit>>,
}

#[derive(Debug)]
struct RateLimit {
    window_started: Instant,
    requests: u32,
    active: u32,
}

#[derive(Clone)]
struct HistoryResult {
    data: Vec<HistoryPoint>,
    fetched_at: Option<i64>,
    freshness: &'static str,
}

#[derive(Debug, Deserialize)]
struct RpcRequest {
    jsonrpc: Option<String>,
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

pub fn start(
    app: &AppHandle,
    account: AccountManager,
    market: Arc<MarketManager>,
) -> Result<AgentGateway, String> {
    let listener =
        TcpListener::bind(("127.0.0.1", 0)).map_err(|error| format!("AGENT_BIND:{error}"))?;
    listener
        .set_nonblocking(false)
        .map_err(|error| format!("AGENT_BIND:{error}"))?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let token = random_token();
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    let discovery_path = app_data_dir.join("slstening-agent.json");
    let bridge_path = resolve_bridge_path(app);
    write_discovery(&discovery_path, port, &token, &bridge_path)?;

    let context = GatewayContext {
        token,
        port,
        account,
        market,
        app: app.clone(),
        rate: Arc::new(Mutex::new(RateLimit {
            window_started: Instant::now(),
            requests: 0,
            active: 0,
        })),
    };
    thread::Builder::new()
        .name("slstening-agent-gateway".to_string())
        .spawn(move || {
            for stream in listener.incoming() {
                match stream {
                    Ok(stream) => {
                        let context = context.clone();
                        let _ = thread::Builder::new()
                            .name("slstening-agent-request".to_string())
                            .spawn(move || {
                                let _ = handle_connection(stream, context);
                            });
                    }
                    Err(error) => log::warn!("Agent gateway accept failed: {error}"),
                }
            }
        })
        .map_err(|error| format!("AGENT_START:{error}"))?;

    Ok(AgentGateway {
        endpoint: format!("http://127.0.0.1:{port}/mcp"),
        discovery_path,
        bridge_path,
    })
}

fn resolve_bridge_path(app: &AppHandle) -> PathBuf {
    let resource = app
        .path()
        .resource_dir()
        .ok()
        .map(|path| path.join("scripts/slstening-agent-bridge.mjs"));
    if let Some(path) = resource.filter(|path| path.exists()) {
        return path;
    }
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("scripts/slstening-agent-bridge.mjs")
}

fn write_discovery(path: &Path, port: u16, token: &str, bridge_path: &Path) -> Result<(), String> {
    let value = json!({
        "endpoint": format!("http://127.0.0.1:{port}/mcp"),
        "port": port,
        "token": token,
        "bridgePath": bridge_path,
        "protocolVersion": MCP_PROTOCOL_VERSION,
    });
    let mut file = File::create(path).map_err(|error| error.to_string())?;
    file.write_all(value.to_string().as_bytes())
        .map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn handle_connection(mut stream: TcpStream, context: GatewayContext) -> Result<(), String> {
    let request_deadline = Instant::now() + ANALYSIS_DEADLINE;
    stream
        .set_read_timeout(Some(REQUEST_TIMEOUT))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(REQUEST_TIMEOUT))
        .map_err(|error| error.to_string())?;
    let request = match read_http_request(&mut stream, context.port) {
        Ok(request) => request,
        Err(error) => {
            write_http_response(&mut stream, Err((400, error)))?;
            return Ok(());
        }
    };
    let result = if request.path == "/mcp" && request.method == "POST" {
        if !constant_time_eq(
            request.authorization.as_deref().unwrap_or(""),
            &format!("Bearer {}", context.token),
        ) {
            Err((401, "UNAUTHORIZED".to_string()))
        } else if !origin_allowed(request.origin.as_deref()) {
            Err((403, "ORIGIN_FORBIDDEN".to_string()))
        } else if !enter_request(&context.rate) {
            Err((429, "RATE_LIMITED".to_string()))
        } else {
            let result = dispatch_rpc(&context, &request.body, request_deadline)
                .map(|value| (200, value.to_string()));
            leave_request(&context.rate);
            result
        }
    } else {
        Err((404, "NOT_FOUND".to_string()))
    };
    write_http_response(&mut stream, result)
}

struct HttpRequest {
    method: String,
    path: String,
    authorization: Option<String>,
    origin: Option<String>,
    body: Vec<u8>,
}

fn read_http_request(stream: &mut TcpStream, port: u16) -> Result<HttpRequest, String> {
    let mut bytes = Vec::new();
    let mut header_end = None;
    let mut chunk = [0_u8; 4096];
    while bytes.len() <= MAX_BODY_BYTES + 8192 {
        let read = stream.read(&mut chunk).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        bytes.extend_from_slice(&chunk[..read]);
        if let Some(position) = bytes.windows(4).position(|window| window == b"\r\n\r\n") {
            header_end = Some(position + 4);
            break;
        }
    }
    let header_end = header_end.ok_or_else(|| "INVALID_HTTP".to_string())?;
    let header_text =
        std::str::from_utf8(&bytes[..header_end]).map_err(|_| "INVALID_HTTP".to_string())?;
    let mut lines = header_text.split("\r\n");
    let request_line = lines.next().ok_or_else(|| "INVALID_HTTP".to_string())?;
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default().to_string();
    let target = parts.next().unwrap_or_default();
    let (path, _) = target.split_once('?').unwrap_or((target, ""));
    let mut headers = HashMap::new();
    for line in lines.filter(|line| !line.is_empty()) {
        if let Some((key, value)) = line.split_once(':') {
            headers.insert(key.trim().to_ascii_lowercase(), value.trim().to_string());
        }
    }
    let expected_host = format!("127.0.0.1:{port}");
    let host = headers
        .get("host")
        .ok_or_else(|| "HOST_REQUIRED".to_string())?;
    if host != &expected_host && host != &format!("localhost:{port}") {
        return Err("HOST_FORBIDDEN".to_string());
    }
    if headers.get("transfer-encoding").is_some() {
        return Err("CHUNKED_UNSUPPORTED".to_string());
    }
    let length = headers
        .get("content-length")
        .and_then(|value| value.parse::<usize>().ok())
        .ok_or_else(|| "CONTENT_LENGTH_REQUIRED".to_string())?;
    if length > MAX_BODY_BYTES {
        return Err("BODY_TOO_LARGE".to_string());
    }
    let mut body = bytes[header_end..].to_vec();
    while body.len() < length {
        let read = stream.read(&mut chunk).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        body.extend_from_slice(&chunk[..read]);
    }
    if body.len() < length {
        return Err("INVALID_BODY".to_string());
    }
    body.truncate(length);
    Ok(HttpRequest {
        method,
        path: path.to_string(),
        authorization: headers.get("authorization").cloned(),
        origin: headers.get("origin").cloned(),
        body,
    })
}

fn write_http_response(
    stream: &mut TcpStream,
    result: Result<(u16, String), (u16, String)>,
) -> Result<(), String> {
    let (status, body) = match result {
        Ok(value) => value,
        Err((status, code)) => (status, json!({"error": code}).to_string()),
    };
    let reason = match status {
        200 => "OK",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        429 => "Too Many Requests",
        _ => "Bad Request",
    };
    let response = format!("HTTP/1.1 {status} {reason}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
    stream
        .write_all(response.as_bytes())
        .map_err(|error| error.to_string())
}

fn dispatch_rpc(
    context: &GatewayContext,
    bytes: &[u8],
    deadline: Instant,
) -> Result<Value, (u16, String)> {
    let request: RpcRequest =
        serde_json::from_slice(bytes).map_err(|_| (400, "INVALID_JSON".to_string()))?;
    if request.jsonrpc.as_deref() != Some("2.0") {
        return Ok(rpc_error(
            request.id.unwrap_or(Value::Null),
            -32600,
            "Invalid JSON-RPC request",
        ));
    }
    let id = request.id.clone().unwrap_or(Value::Null);
    match request.method.as_str() {
        "initialize" => Ok(rpc_result(
            id,
            json!({
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {"tools": {"listChanged": false}},
                "serverInfo": {"name": "SLstening", "version": "0.0.62"}
            }),
        )),
        "notifications/initialized" | "notifications/cancelled" => Ok(Value::Null),
        "ping" => Ok(rpc_result(id, json!({}))),
        "tools/list" => Ok(rpc_result(id, json!({"tools": tool_definitions()}))),
        "tools/call" => match call_tool(context, &request.params, deadline) {
            Ok(value) => Ok(rpc_result(id, value)),
            Err((code, message)) if message.contains("REVISION_CONFLICT") => Ok(json!({
                "jsonrpc":"2.0",
                "id":id,
                "error":{
                    "code":code,
                    "message":message,
                    "data":{"reload_required":true,"retryable":true}
                }
            })),
            Err((code, message)) => Ok(rpc_error(id, code, &message)),
        },
        _ => Ok(rpc_error(id, -32601, "Method not found")),
    }
}

fn rpc_result(id: Value, result: Value) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "result": result})
}

fn rpc_error(id: Value, code: i64, message: &str) -> Value {
    json!({"jsonrpc": "2.0", "id": id, "error": {"code": code, "message": message}})
}

fn tool_definitions() -> Vec<Value> {
    vec![
        tool(
            "get_context",
            "Get the authenticated SLstening session and capability context.",
            json!({"type":"object","properties":{},"additionalProperties":false}),
        ),
        tool(
            "list_watchlists",
            "List the current account's stocks, categories, and indicator settings.",
            json!({"type":"object","properties":{},"additionalProperties":false}),
        ),
        tool(
            "get_quotes",
            "Get bounded live quotes for tracked symbols.",
            json!({"type":"object","properties":{"symbols":{"type":"array","items":{"type":"string"},"maxItems":20}},"additionalProperties":false}),
        ),
        tool(
            "get_history",
            "Get bounded OHLCV history for one symbol.",
            json!({"type":"object","properties":{"symbol":{"type":"string"},"period":{"type":"string","enum":["1m","5m","30m","60m","d","w","m"]},"bars":{"type":"integer","minimum":1,"maximum":500}},"required":["symbol"],"additionalProperties":false}),
        ),
        tool(
            "get_technical_indicators",
            "Get history-derived technical indicators using the account settings.",
            json!({"type":"object","properties":{"symbol":{"type":"string"},"period":{"type":"string"}},"required":["symbol"],"additionalProperties":false}),
        ),
        tool(
            "get_chip_analysis",
            "Get the existing Taiwan institutional and margin analysis.",
            json!({"type":"object","properties":{"symbol":{"type":"string"}},"required":["symbol"],"additionalProperties":false}),
        ),
        tool(
            "get_analysis_snapshot",
            "Get one bounded analysis snapshot for tracked stocks.",
            json!({"type":"object","properties":{"symbols":{"type":"array","items":{"type":"string"},"maxItems":20},"period":{"type":"string"},"includeHistory":{"type":"boolean"},"includeChip":{"type":"boolean"}},"additionalProperties":false}),
        ),
        tool(
            "add_stock",
            "Add a stock to the default watchlist.",
            json!({"type":"object","properties":{"stock":{"type":"object","properties":{"id":{"type":"string"},"name":{"type":"string"},"group":{"type":"string"},"type":{"type":"string"}},"required":["id","name","group","type"]}},"required":["stock"],"additionalProperties":false}),
        ),
        tool(
            "remove_stock",
            "Remove a stock from the account and all categories.",
            json!({"type":"object","properties":{"symbol":{"type":"string"}},"required":["symbol"],"additionalProperties":false}),
        ),
        tool(
            "create_category",
            "Create an account category.",
            json!({"type":"object","properties":{"name":{"type":"string"}},"required":["name"],"additionalProperties":false}),
        ),
        tool(
            "rename_category",
            "Rename an account category.",
            json!({"type":"object","properties":{"categoryId":{"type":"string"},"name":{"type":"string"}},"required":["categoryId","name"],"additionalProperties":false}),
        ),
        tool(
            "delete_category",
            "Delete an account category.",
            json!({"type":"object","properties":{"categoryId":{"type":"string"}},"required":["categoryId"],"additionalProperties":false}),
        ),
        tool(
            "set_category_members",
            "Replace a category's stock membership.",
            json!({"type":"object","properties":{"categoryId":{"type":"string"},"stockIds":{"type":"array","items":{"type":"string"},"maxItems":300}},"required":["categoryId","stockIds"],"additionalProperties":false}),
        ),
        tool(
            "reorder_category",
            "Set the complete order of one category.",
            json!({"type":"object","properties":{"categoryId":{"type":"string"},"stockIds":{"type":"array","items":{"type":"string"},"maxItems":300}},"required":["categoryId","stockIds"],"additionalProperties":false}),
        ),
        tool(
            "update_indicator_settings",
            "Update one or more account indicator settings.",
            json!({"type":"object","properties":{"settings":{"type":"object"}},"required":["settings"],"additionalProperties":false}),
        ),
        tool(
            "reset_indicator_settings",
            "Reset account indicator settings to SLstening defaults.",
            json!({"type":"object","properties":{},"additionalProperties":false}),
        ),
    ]
}

fn tool(name: &str, description: &str, input_schema: Value) -> Value {
    json!({"name":name,"description":description,"inputSchema":input_schema})
}

fn call_tool(
    context: &GatewayContext,
    params: &Value,
    deadline: Instant,
) -> Result<Value, (i64, String)> {
    let name = params
        .get("name")
        .and_then(Value::as_str)
        .ok_or((-32602, "Tool name is required".to_string()))?;
    let args = params
        .get("arguments")
        .cloned()
        .unwrap_or_else(|| json!({}));
    let (_content, structured) = execute_tool(context, name, &args, deadline)?;
    Ok(json!({
        "content":[{"type":"text","text":serde_json::to_string(&structured).unwrap_or_else(|_| "{}".to_string())}],
        "structuredContent":structured,
        "isError":false,
        "_meta":{"configuration_revision": structured.get("configuration_revision").cloned().unwrap_or(Value::Null)}
    }))
}

fn execute_tool(
    context: &GatewayContext,
    name: &str,
    args: &Value,
    deadline: Instant,
) -> Result<(Vec<Value>, Value), (i64, String)> {
    let session = context
        .account
        .current_session()
        .map_err(internal_error)?
        .ok_or((-32001, "APP_UNAVAILABLE:SESSION_REQUIRED".to_string()))?;
    let session = context
        .account
        .active_session(session.epoch)
        .map_err(internal_error)?;
    let result = match name {
        "get_context" => Ok((vec![], {
            let state = block_on_state(context, session.epoch, deadline).map_err(internal_error)?;
            envelope(
                state.revision,
                json!({"context":{"account":{"id":session.user_id},"epoch":session.epoch,"capabilities":{"read":true,"write":true,"market":true,"chip_analysis":true},"app":{"open":true,"authenticated":true}}}),
            )
        })),
        "list_watchlists" => {
            let state = block_on_state(context, session.epoch, deadline).map_err(internal_error)?;
            let data = account_snapshot_or_empty(&state).map_err(internal_error)?;
            Ok((vec![], envelope(state.revision, json!({"watchlists":data}))))
        }
        "get_quotes" => {
            let state = block_on_state(context, session.epoch, deadline).map_err(internal_error)?;
            let configuration_revision = state.revision;
            let symbols = requested_symbols(args, &state).map_err(internal_error)?;
            let mut warnings = Vec::new();
            let quote_results = parallel_quotes(context, &symbols, deadline);
            let quotes = symbols
                .iter()
                .enumerate()
                .map(|(index, symbol)| match quote_results.get(index).and_then(|result| result.as_ref()) {
                    Some(Ok(value)) => value.clone(),
                    Some(Err((code, message))) => {
                        warnings.push(
                            json!({"symbol":symbol,"code":stable_market_error_code(&message, "QUOTE_PROVIDER_UNAVAILABLE"),"message":message,"retryable":true,"provider_code":code}),
                        );
                        quote_error_value(symbol, "error")
                    }
                    None => {
                        warnings.push(json!({"symbol":symbol,"code":"DEADLINE_EXCEEDED","message":"quote deadline exceeded","retryable":true}));
                        quote_error_value(symbol, "partial")
                    }
                })
                .collect::<Vec<_>>();
            Ok((
                vec![],
                envelope_with_warnings(
                    configuration_revision,
                    json!({"quotes":quotes}),
                    Value::Array(warnings),
                ),
            ))
        }
        "get_history" => {
            let symbol = string_arg(args, "symbol")?;
            let period = args.get("period").and_then(Value::as_str).unwrap_or("d");
            let bars = bounded_bars(args.get("bars"));
            let configuration_revision = block_on_state(context, session.epoch, deadline)
                .map_err(internal_error)?
                .revision;
            match get_history(context, symbol, period, deadline) {
                Ok(history_result) => {
                    let history = trim_history(history_result.data, bars);
                    let observed_at = history.last().map(|bar| bar.t);
                    Ok((
                        vec![],
                        envelope(
                            configuration_revision,
                            json!({"symbol":symbol,"provider_symbol":provider_symbol(symbol),"market":market_name(symbol),"period":period,"interval":period,"bars":history,"source":"SLstening via MarketManager","observed_at":observed_at,"fetched_at":history_result.fetched_at,"freshness":history_result.freshness,"state":"available","currency":if is_global_symbol(symbol) { "USD" } else { "TWD" },"units":{"price":"currency_per_share","volume":"shares"},"timezone":Value::Null,"adjustment":"unknown","unfinished_bar":Value::Null}),
                        ),
                    ))
                }
                Err((code, message)) => Ok((
                    vec![],
                    envelope_with_warnings(
                        configuration_revision,
                        json!({"symbol":symbol,"provider_symbol":provider_symbol(symbol),"market":market_name(symbol),"period":period,"interval":period,"bars":Value::Null,"source":"SLstening via MarketManager","observed_at":Value::Null,"state":"error","freshness":"unknown","fetched_at":Value::Null,"currency":if is_global_symbol(symbol) { "USD" } else { "TWD" },"units":{"price":"currency_per_share","volume":"shares"},"timezone":Value::Null,"adjustment":"unknown","unfinished_bar":Value::Null}),
                        json!([{"symbol":symbol,"code":stable_market_error_code(&message, "HISTORY_PROVIDER_UNAVAILABLE"),"message":message,"retryable":true,"provider_code":code}]),
                    ),
                )),
            }
        }
        "get_technical_indicators" => {
            let symbol = string_arg(args, "symbol")?;
            let period = args.get("period").and_then(Value::as_str).unwrap_or("d");
            let state = block_on_state(context, session.epoch, deadline).map_err(internal_error)?;
            let data = account_snapshot_or_empty(&state).map_err(internal_error)?;
            match get_history(context, symbol, period, deadline) {
                Ok(history_result) => {
                    let indicators =
                        calculate_indicators(&history_result.data, &data.indicator_settings);
                    Ok((
                        vec![],
                        envelope(
                            state.revision,
                            json!({"symbol":symbol,"provider_symbol":provider_symbol(symbol),"market":market_name(symbol),"period":period,"settings":data.indicator_settings,"indicators":indicators,"technical_metadata":{"algorithm":"SLstening app indicator surface","algorithm_version":"app-canonical-v1","sample_size":history_result.data.len(),"warmup_policy":"seed_first_observation","rounding":"periods_rounded"},"source":"SLstening native history","freshness":history_result.freshness,"fetched_at":history_result.fetched_at,"state":"available","currency":if is_global_symbol(symbol) { "USD" } else { "TWD" },"units":{"price":"currency_per_share","volume":"shares"},"timezone":Value::Null,"adjustment":"unknown","unfinished_bar":Value::Null}),
                        ),
                    ))
                }
                Err((code, message)) => Ok((
                    vec![],
                    envelope_with_warnings(
                        state.revision,
                        json!({"symbol":symbol,"provider_symbol":provider_symbol(symbol),"market":market_name(symbol),"period":period,"interval":period,"indicators":Value::Null,"technical_metadata":Value::Null,"source":"SLstening via MarketManager","state":"error","freshness":"unknown","fetched_at":Value::Null,"observed_at":Value::Null,"currency":if is_global_symbol(symbol) { "USD" } else { "TWD" },"units":{"price":"currency_per_share","volume":"shares"},"timezone":Value::Null,"adjustment":"unknown","unfinished_bar":Value::Null}),
                        json!([{"symbol":symbol,"code":stable_market_error_code(&message, "HISTORY_PROVIDER_UNAVAILABLE"),"message":message,"retryable":true,"provider_code":code}]),
                    ),
                )),
            }
        }
        "get_chip_analysis" => {
            let symbol = string_arg(args, "symbol")?;
            let configuration_revision = block_on_state(context, session.epoch, deadline)
                .map_err(internal_error)?
                .revision;
            let (provider_symbol, market) = normalize_market_symbol(symbol)?;
            if market != "TW"
                || !provider_symbol
                    .chars()
                    .all(|character| character.is_ascii_digit())
            {
                return Ok((
                    vec![],
                    envelope_with_warnings(
                        configuration_revision,
                        json!({"symbol":symbol,"state":"unsupported","data":Value::Null}),
                        json!([{"symbol":symbol,"code":"CHIP_DATA_TW_ONLY","message":"chip analysis is available for Taiwan stock symbols","retryable":false}]),
                    ),
                ));
            }
            let chip_result = remaining_time(deadline)
                .map_err(|_| "DEADLINE_EXCEEDED".to_string())
                .and_then(|remaining| {
                    tauri::async_runtime::block_on(async {
                        tokio::time::timeout(remaining, chip::get_chip_data(provider_symbol))
                            .await
                            .map_err(|_| "DEADLINE_EXCEEDED".to_string())
                            .and_then(|result| result)
                    })
                });
            match chip_result {
                Ok(data) => Ok((
                    vec![],
                    envelope(
                        configuration_revision,
                        serde_json::to_value(data)
                            .map_err(|_| (-32010, "CHIP_SERIALIZE_FAILED".to_string()))?,
                    ),
                )),
                Err(message) => Ok((
                    vec![],
                    envelope_with_warnings(
                        configuration_revision,
                        json!({"symbol":symbol,"state":"error","data":Value::Null}),
                        json!([{"symbol":symbol,"code":"CHIP_PROVIDER_UNAVAILABLE","message":message,"retryable":true}]),
                    ),
                )),
            }
        }
        "get_analysis_snapshot" => {
            let state = block_on_state(context, session.epoch, deadline).map_err(internal_error)?;
            let data = account_snapshot_or_empty(&state).map_err(internal_error)?;
            let symbols = requested_symbols(args, &state).map_err(internal_error)?;
            let period = args.get("period").and_then(Value::as_str).unwrap_or("d");
            let include_history = args
                .get("includeHistory")
                .and_then(Value::as_bool)
                .unwrap_or(true);
            let include_chip = args
                .get("includeChip")
                .and_then(Value::as_bool)
                .unwrap_or(false);
            let mut items = Vec::new();
            let mut warnings = Vec::new();
            let analysis_results = parallel_analysis(
                context,
                &symbols,
                period,
                include_history,
                include_chip,
                data.indicator_settings.clone(),
                deadline,
            );
            for (index, symbol) in symbols.iter().enumerate() {
                if let Some(Some((item, item_warnings))) = analysis_results.get(index) {
                    items.push(item.clone());
                    warnings.extend(item_warnings.iter().cloned());
                } else {
                    items.push(json!({"symbol":symbol,"state":"partial","quote":quote_error_value(symbol, "partial"),"history":Value::Null,"technical_indicators":Value::Null,"chip_analysis":Value::Null}));
                    warnings.push(json!({"symbol":symbol,"code":"DEADLINE_EXCEEDED","message":"analysis deadline exceeded","retryable":true}));
                }
            }
            if has_mixed_fetch_timestamps(&items) {
                warnings.push(json!({"code":"MIXED_FETCH_TIMESTAMPS","message":"analysis items were fetched at different wall-clock times","retryable":false}));
            }
            Ok((
                vec![],
                envelope_with_warnings(
                    state.revision,
                    json!({"items":items,"period":period,"settings":data.indicator_settings}),
                    Value::Array(warnings),
                ),
            ))
        }
        "add_stock" => {
            let stock_value = args
                .get("stock")
                .cloned()
                .ok_or((-32602, "stock is required".to_string()))?;
            let stock: StockRecord = serde_json::from_value(stock_value)
                .map_err(|_| (-32602, "invalid stock".to_string()))?;
            mutate(context, session.epoch, deadline, |data| {
                if !data.stocks.iter().any(|item| item.id == stock.id) {
                    data.stocks.insert(0, stock.clone());
                }
                let default = data
                    .categories
                    .iter_mut()
                    .find(|category| category.id == "default-watchlist")
                    .ok_or("DEFAULT_CATEGORY_REQUIRED")?;
                if !default.stock_ids.contains(&stock.id) {
                    default.stock_ids.insert(0, stock.id.clone());
                }
                Ok(())
            })
        }
        "remove_stock" => {
            let symbol = string_arg(args, "symbol")?.to_string();
            mutate(context, session.epoch, deadline, |data| {
                data.stocks.retain(|stock| stock.id != symbol);
                for category in &mut data.categories {
                    category.stock_ids.retain(|id| id != &symbol);
                }
                Ok(())
            })
        }
        "create_category" => {
            let name = trimmed_category_name(string_arg(args, "name")?)
                .map_err(|error| (-32602, error))?;
            mutate(context, session.epoch, deadline, |data| {
                if data.categories.iter().any(|category| {
                    category.id != "default-watchlist"
                        && category.name.trim().eq_ignore_ascii_case(&name)
                }) {
                    return Err("DUPLICATE_CATEGORY_NAME".to_string());
                }
                data.categories.push(CategoryRecord {
                    id: random_identifier("category"),
                    name,
                    stock_ids: vec![],
                    is_default: None,
                });
                Ok(())
            })
        }
        "rename_category" => {
            let id = string_arg(args, "categoryId")?.to_string();
            let name = trimmed_category_name(string_arg(args, "name")?)
                .map_err(|error| (-32602, error))?;
            mutate(context, session.epoch, deadline, |data| {
                if id == "default-watchlist" {
                    return Err("DEFAULT_CATEGORY_IMMUTABLE".to_string());
                }
                if data.categories.iter().any(|category| {
                    category.id != id
                        && category.id != "default-watchlist"
                        && category.name.trim().eq_ignore_ascii_case(&name)
                }) {
                    return Err("DUPLICATE_CATEGORY_NAME".to_string());
                }
                data.categories
                    .iter_mut()
                    .find(|category| category.id == id)
                    .ok_or("CATEGORY_NOT_FOUND")?
                    .name = name;
                Ok(())
            })
        }
        "delete_category" => {
            let id = string_arg(args, "categoryId")?.to_string();
            mutate(context, session.epoch, deadline, |data| {
                if id == "default-watchlist" {
                    return Err("DEFAULT_CATEGORY_IMMUTABLE".to_string());
                }
                data.categories.retain(|category| category.id != id);
                data.pinned_category_ids.retain(|value| value != &id);
                data.recent_category_ids.retain(|value| value != &id);
                if data.active_category_id == id {
                    data.active_category_id = "default-watchlist".to_string();
                }
                let memberships: std::collections::HashSet<String> = data
                    .categories
                    .iter()
                    .flat_map(|category| category.stock_ids.iter().cloned())
                    .collect();
                data.stocks.retain(|stock| memberships.contains(&stock.id));
                Ok(())
            })
        }
        "set_category_members" | "reorder_category" => {
            let id = string_arg(args, "categoryId")?.to_string();
            let ids = args
                .get("stockIds")
                .and_then(Value::as_array)
                .ok_or((-32602, "stockIds must be an array".to_string()))?
                .iter()
                .map(|value| {
                    value
                        .as_str()
                        .map(ToOwned::to_owned)
                        .ok_or((-32602, "stockIds must be strings".to_string()))
                })
                .collect::<Result<Vec<_>, _>>()?;
            mutate(context, session.epoch, deadline, |data| {
                let known: std::collections::HashSet<String> =
                    data.stocks.iter().map(|stock| stock.id.clone()).collect();
                if ids.iter().any(|id| !known.contains(id)) || {
                    let mut set = std::collections::HashSet::new();
                    ids.iter().any(|id| !set.insert(id))
                } {
                    return Err("INVALID_CATEGORY_MEMBERSHIP".to_string());
                }
                {
                    let category = data
                        .categories
                        .iter_mut()
                        .find(|category| category.id == id)
                        .ok_or("CATEGORY_NOT_FOUND")?;
                    if name == "reorder_category" && ids.len() != category.stock_ids.len() {
                        return Err("INVALID_CATEGORY_ORDER".to_string());
                    }
                    category.stock_ids = ids.clone();
                }
                // Match the frontend's category semantics: a stock that is
                // no longer a member of any category is removed from the
                // tracked stock projection as part of the same mutation.
                let memberships: std::collections::HashSet<String> = data
                    .categories
                    .iter()
                    .flat_map(|category| category.stock_ids.iter().cloned())
                    .collect();
                data.stocks.retain(|stock| memberships.contains(&stock.id));
                Ok(())
            })
        }
        "update_indicator_settings" => {
            let settings = args
                .get("settings")
                .and_then(Value::as_object)
                .ok_or((-32602, "settings must be an object".to_string()))?
                .clone();
            mutate(context, session.epoch, deadline, |data| {
                let mut current = serde_json::to_value(&data.indicator_settings)
                    .map_err(|_| "INVALID_INDICATOR_SETTINGS".to_string())?;
                let target = current
                    .as_object_mut()
                    .ok_or("INVALID_INDICATOR_SETTINGS")?;
                for (key, value) in settings {
                    target.insert(key, value);
                }
                data.indicator_settings = serde_json::from_value(current)
                    .map_err(|_| "INVALID_INDICATOR_SETTINGS".to_string())?;
                Ok(())
            })
        }
        "reset_indicator_settings" => mutate(context, session.epoch, deadline, |data| {
            data.indicator_settings = default_indicator_settings();
            Ok(())
        }),
        _ => Err((-32601, format!("Unknown tool: {name}"))),
    };
    // Every tool may await market or cloud work. Re-check the native session
    // before publishing a response so a logout/account switch cannot leak a
    // previous account's result through the gateway.
    context
        .account
        .active_session(session.epoch)
        .map_err(internal_error)?;
    result
}

fn mutate<F>(
    context: &GatewayContext,
    epoch: u64,
    deadline: Instant,
    operation: F,
) -> Result<(Vec<Value>, Value), (i64, String)>
where
    F: FnOnce(&mut AccountSnapshot) -> Result<(), String>,
{
    let state = block_on_state(context, epoch, deadline).map_err(internal_error)?;
    let mut data = account_snapshot_or_empty(&state).map_err(internal_error)?;
    operation(&mut data).map_err(|error| (-32602, error))?;
    validate_snapshot(&data).map_err(internal_error)?;
    let result = block_on_write(context, epoch, state.revision, data.clone(), deadline)
        .map_err(internal_error)?;
    let _ = context.app.emit(
        "account-state-updated",
        json!({"userId":result.user_id,"epoch":result.epoch,"revision":result.revision}),
    );
    Ok((
        vec![],
        envelope(
            result.revision,
            json!({"data":data,"revision":result.revision}),
        ),
    ))
}

fn block_on_state(
    context: &GatewayContext,
    epoch: u64,
    deadline: Instant,
) -> Result<crate::account::AccountStateResult, String> {
    let remaining = remaining_time(deadline)?;
    tauri::async_runtime::block_on(async move {
        tokio::time::timeout(remaining, context.account.get_state(epoch))
            .await
            .map_err(|_| "DEADLINE_EXCEEDED".to_string())?
    })
}

fn block_on_write(
    context: &GatewayContext,
    epoch: u64,
    revision: u64,
    data: AccountSnapshot,
    deadline: Instant,
) -> Result<crate::account::AccountWriteResult, String> {
    let remaining = remaining_time(deadline)?;
    tauri::async_runtime::block_on(async move {
        tokio::time::timeout(
            remaining,
            context
                .account
                .update_state(epoch, revision, data, random_identifier("operation")),
        )
        .await
        .map_err(|_| "DEADLINE_EXCEEDED".to_string())?
    })
}

fn remaining_time(deadline: Instant) -> Result<Duration, String> {
    deadline
        .checked_duration_since(Instant::now())
        .filter(|remaining| !remaining.is_zero())
        .ok_or_else(|| "DEADLINE_EXCEEDED".to_string())
}

fn internal_error(error: String) -> (i64, String) {
    (-32000, error)
}

fn envelope(revision: u64, value: Value) -> Value {
    envelope_with_warnings(revision, value, Value::Array(Vec::new()))
}

fn envelope_with_warnings(revision: u64, value: Value, warnings: Value) -> Value {
    json!({"schema_version":1,"snapshot_id":format!("snapshot-{revision}"),"generated_at":unix_millis(),"configuration_revision":revision,"data":value,"warnings":warnings})
}

fn empty_account_snapshot() -> AccountSnapshot {
    AccountSnapshot {
        stocks: Vec::new(),
        categories: vec![CategoryRecord {
            id: "default-watchlist".to_string(),
            name: String::new(),
            stock_ids: Vec::new(),
            is_default: Some(true),
        }],
        active_category_id: "default-watchlist".to_string(),
        pinned_category_ids: Vec::new(),
        recent_category_ids: Vec::new(),
        indicator_settings: default_indicator_settings(),
    }
}

fn account_snapshot_or_empty(
    state: &crate::account::AccountStateResult,
) -> Result<AccountSnapshot, String> {
    match (&state.data, state.revision) {
        (Some(data), _) => Ok(data.clone()),
        (None, 0) => Ok(empty_account_snapshot()),
        (None, _) => Err("CORRUPT_CLOUD_RESPONSE".to_string()),
    }
}

fn requested_symbols(
    args: &Value,
    state: &crate::account::AccountStateResult,
) -> Result<Vec<String>, String> {
    if let Some(value) = args.get("symbols") {
        let list = value
            .as_array()
            .ok_or_else(|| "symbols must be an array".to_string())?;
        let mut symbols = Vec::new();
        for value in list {
            let symbol = value
                .as_str()
                .map(str::trim)
                .filter(|value| !value.is_empty() && value.len() <= 20)
                .ok_or_else(|| "invalid symbol".to_string())?;
            if !symbols.iter().any(|item| item == symbol) {
                symbols.push(symbol.to_string());
            }
        }
        if symbols.len() > MAX_SYMBOLS {
            return Err("symbols exceeds 20".to_string());
        }
        return Ok(symbols);
    }
    Ok(state
        .data
        .as_ref()
        .map(|data| {
            data.stocks
                .iter()
                .map(|stock| {
                    // Persisted stock records may come from older app
                    // versions without a market field. Numeric symbols are
                    // Taiwan by convention; alphabetic symbols are US. An
                    // explicit group still wins when the record has one.
                    let group = stock.group.to_ascii_lowercase();
                    let is_us = group.contains("us")
                        || group.contains("nasdaq")
                        || group.contains("nyse")
                        || is_global_symbol(&stock.id);
                    if is_us && !stock.id.contains(':') {
                        format!("US:{}", stock.id)
                    } else {
                        stock.id.clone()
                    }
                })
                .take(MAX_SYMBOLS)
                .collect()
        })
        .unwrap_or_default())
}

fn bounded_bars(value: Option<&Value>) -> usize {
    value
        .and_then(Value::as_u64)
        .unwrap_or(200)
        .clamp(1, MAX_BARS as u64) as usize
}

fn trimmed_category_name(value: &str) -> Result<String, String> {
    let name = value.trim();
    if name.is_empty() {
        Err("name is required".to_string())
    } else {
        Ok(name.to_string())
    }
}

fn normalize_market_symbol(raw: &str) -> Result<(String, &'static str), (i64, String)> {
    let trimmed = raw.trim();
    let (market, symbol) = match trimmed.split_once(':') {
        Some((prefix, value)) if prefix.eq_ignore_ascii_case("tw") => ("TW", value.trim()),
        Some((prefix, value)) if prefix.eq_ignore_ascii_case("us") => ("US", value.trim()),
        Some(_) => return Err((-32602, "INVALID_MARKET_PREFIX".to_string())),
        None => ("AUTO", trimmed),
    };
    if symbol.is_empty() || symbol.len() > 20 {
        return Err((-32602, "invalid symbol".to_string()));
    }
    if (market == "TW" && is_global_symbol(symbol)) || (market == "US" && !is_global_symbol(symbol))
    {
        return Err((-32602, "MARKET_SYMBOL_MISMATCH".to_string()));
    }
    let resolved = if market == "AUTO" {
        if is_global_symbol(symbol) {
            "US"
        } else {
            "TW"
        }
    } else {
        market
    };
    Ok((symbol.to_string(), resolved))
}

fn provider_symbol(raw: &str) -> String {
    raw.split_once(':')
        .map(|(_, symbol)| symbol.trim())
        .unwrap_or_else(|| raw.trim())
        .to_string()
}

fn market_name(raw: &str) -> &'static str {
    if raw
        .split_once(':')
        .map(|(market, _)| market.eq_ignore_ascii_case("us"))
        .unwrap_or_else(|| is_global_symbol(raw))
    {
        "US"
    } else {
        "TW"
    }
}

fn stable_market_error_code(message: &str, fallback: &'static str) -> &'static str {
    if message.contains("DEADLINE_EXCEEDED") {
        "DEADLINE_EXCEEDED"
    } else if message.contains("API_BLOCKED") {
        "MARKET_API_BLOCKED"
    } else if message.contains("REQUEST_IN_FLIGHT") {
        "MARKET_REQUEST_IN_FLIGHT"
    } else if message.contains("SESSION_") {
        "SESSION_CHANGED"
    } else {
        fallback
    }
}

/// Fetch bounded quote requests concurrently and stop collecting at the
/// overall deadline. Each request still goes through MarketManager's global
/// provider gate, while the MCP call can return a partial result instead of
/// waiting on a long tail of symbols.
fn parallel_quotes(
    context: &GatewayContext,
    symbols: &[String],
    deadline: Instant,
) -> Vec<Option<Result<Value, (i64, String)>>> {
    let (sender, receiver) = std::sync::mpsc::channel();
    let mut batched_taiwan = Vec::new();
    let mut batched_indices = std::collections::HashSet::new();
    for (index, symbol) in symbols.iter().enumerate() {
        if let Ok((provider_symbol, "TW")) = normalize_market_symbol(symbol) {
            if context
                .market
                .get_from_cache_with_fetched_at(&provider_symbol)
                .is_none()
            {
                batched_taiwan.push((index, symbol.clone(), provider_symbol));
                batched_indices.insert(index);
            }
        }
    }
    if !batched_taiwan.is_empty() {
        let sender = sender.clone();
        let context = context.clone();
        thread::spawn(move || {
            if Instant::now() >= deadline {
                for (index, _, _) in batched_taiwan {
                    let _ = sender.send((index, Err((-32000, "DEADLINE_EXCEEDED".to_string()))));
                }
                return;
            }
            let provider_symbols: Vec<String> = batched_taiwan
                .iter()
                .map(|(_, _, provider_symbol)| provider_symbol.clone())
                .collect();
            let result = tauri::async_runtime::block_on(async {
                tokio::time::timeout(
                    remaining_time(deadline).unwrap_or_default(),
                    context
                        .market
                        .fetch_ticks_gated_with_meta(&provider_symbols),
                )
                .await
                .map_err(|_| (-32000, "DEADLINE_EXCEEDED".to_string()))?
                .map_err(|error| (-32000, error.to_string()))
            });
            match result {
                Ok((ticks, fetched)) => {
                    for (index, original, provider_symbol) in batched_taiwan {
                        let value = ticks
                            .iter()
                            .find(|tick| tick.id == provider_symbol)
                            .cloned()
                            .ok_or((-32000, "NO_QUOTE".to_string()))
                            .map(|tick| {
                                let fetched_at = context
                                    .market
                                    .get_from_cache_with_fetched_at(&provider_symbol)
                                    .map(|(_, fetched_at)| fetched_at);
                                quote_value(
                                    &original,
                                    &provider_symbol,
                                    "TW",
                                    tick,
                                    fetched_at,
                                    if fetched { "live" } else { "cached" },
                                )
                            });
                        let _ = sender.send((index, value));
                    }
                }
                Err(error) => {
                    for (index, _, _) in batched_taiwan {
                        let _ = sender.send((index, Err(error.clone())));
                    }
                }
            }
        });
    }
    let jobs = Arc::new(Mutex::new(
        symbols
            .iter()
            .cloned()
            .enumerate()
            .filter(|(index, _)| !batched_indices.contains(index))
            .collect::<Vec<_>>(),
    ));
    let worker_count = jobs
        .lock()
        .map(|jobs| jobs.len().min(AGENT_MAX_WORKERS))
        .unwrap_or(0);
    for _ in 0..worker_count {
        let sender = sender.clone();
        let context = context.clone();
        let jobs = jobs.clone();
        thread::spawn(move || loop {
            if Instant::now() >= deadline {
                break;
            }
            let job = jobs.lock().ok().and_then(|mut jobs| jobs.pop());
            let Some((index, symbol)) = job else { break };
            let _ = sender.send((index, get_quote(&context, &symbol, deadline)));
        });
    }
    drop(sender);
    let mut results = vec![None; symbols.len()];
    while let Some(remaining) = deadline.checked_duration_since(Instant::now()) {
        if remaining.is_zero() {
            break;
        }
        match receiver.recv_timeout(remaining) {
            Ok((index, result)) if index < results.len() => results[index] = Some(result),
            Ok(_) => {}
            Err(std::sync::mpsc::RecvTimeoutError::Timeout)
            | Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
        }
        if results.iter().all(Option::is_some) {
            break;
        }
    }
    results
}

fn quote_value(
    symbol: &str,
    provider_symbol: &str,
    market: &str,
    tick: MarketTick,
    fetched_at: Option<i64>,
    freshness: &'static str,
) -> Value {
    let price_missing = !tick.price.is_finite() || tick.price <= 0.0;
    let previous_close_missing = !tick.previous_close.is_finite() || tick.previous_close <= 0.0;
    let change_percent_missing =
        !tick.change_percent.is_finite() || price_missing || previous_close_missing;
    let observed_at = (tick.refreshed_ts > 0).then_some(tick.refreshed_ts);
    let mut data = serde_json::to_value(&tick).unwrap_or(Value::Null);
    if let Some(object) = data.as_object_mut() {
        if price_missing {
            object.insert("price".to_string(), Value::Null);
        }
        if previous_close_missing {
            object.insert("previous_close".to_string(), Value::Null);
        }
        if change_percent_missing {
            object.insert("change_percent".to_string(), Value::Null);
        }
        if observed_at.is_none() {
            object.insert("refreshed_ts".to_string(), Value::Null);
        }
    }
    let mut missing_fields = Vec::new();
    if price_missing {
        missing_fields.push("price");
    }
    if previous_close_missing {
        missing_fields.push("previous_close");
    }
    if change_percent_missing {
        missing_fields.push("change_percent");
    }
    if observed_at.is_none() {
        missing_fields.push("refreshed_ts");
    }
    if tick.volume.is_none() {
        missing_fields.push("volume");
    }
    let state = if missing_fields.is_empty() {
        "available"
    } else {
        "partial"
    };
    json!({
        "symbol":symbol,
        "provider_symbol":provider_symbol,
        "market":market,
        "source":"Yahoo Finance via MarketManager",
        "observed_at":observed_at,
        "fetched_at":fetched_at,
        "freshness":freshness,
        "state":state,
        "missing_fields":missing_fields,
        "currency":if market == "TW" { "TWD" } else { "USD" },
        "units":{"price":"currency_per_share","volume":"shares"},
        "period":Value::Null,
        "interval":Value::Null,
        "timezone":Value::Null,
        "adjustment":"unknown",
        "unfinished_bar":Value::Null,
        "data":data
    })
}

fn quote_error_value(symbol: &str, state: &str) -> Value {
    let (provider_symbol, market) =
        normalize_market_symbol(symbol).unwrap_or_else(|_| (symbol.trim().to_string(), "TW"));
    json!({
        "symbol":symbol,
        "provider_symbol":provider_symbol,
        "market":market,
        "source":"Yahoo Finance via MarketManager",
        "observed_at":Value::Null,
        "fetched_at":Value::Null,
        "freshness":"unknown",
        "state":state,
        "currency":if market == "TW" { "TWD" } else { "USD" },
        "units":{"price":"currency_per_share","volume":"shares"},
        "period":Value::Null,
        "interval":Value::Null,
        "timezone":Value::Null,
        "adjustment":"unknown",
        "unfinished_bar":Value::Null,
        "data":Value::Null
    })
}

fn has_mixed_fetch_timestamps(items: &[Value]) -> bool {
    let mut timestamps = Vec::new();
    for item in items {
        for path in [["quote", "fetched_at"], ["history", "fetched_at"]] {
            if let Some(timestamp) = item
                .get(path[0])
                .and_then(|value| value.get(path[1]))
                .and_then(Value::as_i64)
            {
                if !timestamps.contains(&timestamp) {
                    timestamps.push(timestamp);
                }
            }
        }
    }
    timestamps.len() > 1
}

fn parallel_analysis(
    context: &GatewayContext,
    symbols: &[String],
    period: &str,
    include_history: bool,
    include_chip: bool,
    settings: IndicatorSettings,
    deadline: Instant,
) -> Vec<Option<(Value, Vec<Value>)>> {
    let (sender, receiver) = std::sync::mpsc::channel();
    let jobs = Arc::new(Mutex::new(
        symbols.iter().cloned().enumerate().collect::<Vec<_>>(),
    ));
    let worker_count = jobs
        .lock()
        .map(|jobs| jobs.len().min(AGENT_MAX_WORKERS))
        .unwrap_or(0);
    for _ in 0..worker_count {
        let sender = sender.clone();
        let context = context.clone();
        let period = period.to_string();
        let settings = settings.clone();
        let jobs = jobs.clone();
        thread::spawn(move || loop {
            if Instant::now() >= deadline {
                break;
            }
            let job = jobs.lock().ok().and_then(|mut jobs| jobs.pop());
            let Some((index, symbol)) = job else { break };
            let result = analysis_item(
                &context,
                &symbol,
                &period,
                include_history,
                include_chip,
                &settings,
                deadline,
            );
            let _ = sender.send((index, result));
        });
    }
    drop(sender);
    let mut results = vec![None; symbols.len()];
    while let Some(remaining) = deadline.checked_duration_since(Instant::now()) {
        if remaining.is_zero() {
            break;
        }
        match receiver.recv_timeout(remaining) {
            Ok((index, result)) if index < results.len() => results[index] = Some(result),
            Ok(_) => {}
            Err(std::sync::mpsc::RecvTimeoutError::Timeout)
            | Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
        }
        if results.iter().all(Option::is_some) {
            break;
        }
    }
    results
}

fn analysis_item(
    context: &GatewayContext,
    symbol: &str,
    period: &str,
    include_history: bool,
    include_chip: bool,
    settings: &IndicatorSettings,
    deadline: Instant,
) -> (Value, Vec<Value>) {
    let mut warnings = Vec::new();
    let quote = match get_quote(context, symbol, deadline) {
        Ok(value) => value,
        Err((code, message)) => {
            warnings.push(json!({
                "symbol":symbol,
                "code":stable_market_error_code(&message, "QUOTE_PROVIDER_UNAVAILABLE"),
                "message":message,
                "retryable":true,
                "provider_code":code
            }));
            quote_error_value(symbol, "error")
        }
    };
    let history_result = if include_history {
        match get_history(context, symbol, period, deadline) {
            Ok(value) => Some(value),
            Err((code, message)) => {
                warnings.push(json!({
                    "symbol":symbol,
                    "code":stable_market_error_code(&message, "HISTORY_PROVIDER_UNAVAILABLE"),
                    "message":message,
                    "retryable":true,
                    "provider_code":code
                }));
                None
            }
        }
    } else {
        None
    };
    let indicators = history_result
        .as_ref()
        .map(|value| calculate_indicators(&value.data, settings));
    let history = history_result.as_ref().map(|value| {
        let bars = trim_history(value.data.clone(), 120);
        let observed_at = bars.last().map(|bar| bar.t);
        json!({
            "symbol": symbol,
            "provider_symbol": provider_symbol(symbol),
            "market": market_name(symbol),
            "bars": bars,
            "period": period,
            "source": "SLstening via MarketManager",
            "observed_at": observed_at,
            "fetched_at": value.fetched_at,
            "freshness": value.freshness,
            "state": "available",
            "currency": if is_global_symbol(symbol) { "USD" } else { "TWD" },
            "units": {"price":"currency_per_share","volume":"shares"},
            "timezone": Value::Null,
            "adjustment": "unknown",
            "unfinished_bar": Value::Null
        })
    });
    let chip = if include_chip {
        match normalize_market_symbol(symbol) {
            Ok((provider_symbol, "TW"))
                if provider_symbol
                    .chars()
                    .all(|character| character.is_ascii_digit()) =>
            {
                let chip_result = remaining_time(deadline)
                    .map_err(|_| "DEADLINE_EXCEEDED".to_string())
                    .and_then(|remaining| {
                        tauri::async_runtime::block_on(async {
                            tokio::time::timeout(
                                remaining,
                                chip::get_chip_data(provider_symbol.clone()),
                            )
                            .await
                            .map_err(|_| "DEADLINE_EXCEEDED".to_string())
                            .and_then(|result| result)
                        })
                    });
                match chip_result {
                    Ok(value) => serde_json::to_value(value).ok(),
                    Err(message) => {
                        warnings.push(json!({"symbol":symbol,"code":stable_market_error_code(&message, "CHIP_PROVIDER_UNAVAILABLE"),"message":message,"retryable":true}));
                        None
                    }
                }
            }
            _ => {
                warnings.push(json!({"symbol":symbol,"code":"CHIP_DATA_TW_ONLY","message":"chip analysis is available for Taiwan stock symbols","retryable":false}));
                None
            }
        }
    } else {
        None
    };
    (
        json!({
            "symbol":symbol,
            "quote":quote,
            "history":history,
            "technical_indicators":indicators,
            "technical_metadata":history_result.as_ref().map(|value| json!({"algorithm":"SLstening app indicator surface","algorithm_version":"app-canonical-v1","sample_size":value.data.len(),"warmup_policy":"seed_first_observation","rounding":"periods_rounded"})),
            "chip_analysis":chip
        }),
        warnings,
    )
}

fn get_quote(
    context: &GatewayContext,
    symbol: &str,
    deadline: Instant,
) -> Result<Value, (i64, String)> {
    let (provider_symbol, market) = normalize_market_symbol(symbol)?;
    let remaining = remaining_time(deadline).map_err(internal_error)?;
    let value = tauri::async_runtime::block_on(async {
        if let Some((tick, fetched_at)) = context
            .market
            .get_from_cache_with_fetched_at(&provider_symbol)
        {
            return Ok::<(MarketTick, Option<i64>, &'static str), String>((
                tick,
                Some(fetched_at),
                "cached",
            ));
        }
        let (ticks, fetched) = tokio::time::timeout(
            remaining,
            context
                .market
                .fetch_ticks_gated_with_meta(std::slice::from_ref(&provider_symbol)),
        )
        .await
        .map_err(|_| "DEADLINE_EXCEEDED".to_string())?
        .map_err(|error| error.to_string())?;
        let tick = ticks
            .into_iter()
            .next()
            .ok_or_else(|| "NO_QUOTE".to_string())?;
        let fetched_at = context
            .market
            .get_from_cache_with_fetched_at(&provider_symbol)
            .map(|(_, fetched_at)| fetched_at);
        Ok((tick, fetched_at, if fetched { "live" } else { "cached" }))
    })
    .map_err(internal_error)?;
    let (tick, fetched_at, freshness) = value;
    Ok(quote_value(
        symbol,
        &provider_symbol,
        market,
        tick,
        fetched_at,
        freshness,
    ))
}

fn get_history(
    context: &GatewayContext,
    symbol: &str,
    period: &str,
    deadline: Instant,
) -> Result<HistoryResult, (i64, String)> {
    let (provider_symbol, _) = normalize_market_symbol(symbol)?;
    if !["1m", "5m", "30m", "60m", "d", "w", "m"].contains(&period) {
        return Err((-32602, "invalid history query".to_string()));
    }
    let remaining = remaining_time(deadline).map_err(internal_error)?;
    let value = tauri::async_runtime::block_on(async {
        if let Some((history, fetched_at)) = context
            .market
            .get_history_from_cache_with_fetched_at(&provider_symbol, period)
        {
            return Ok::<HistoryResult, String>(HistoryResult {
                data: history.data,
                fetched_at: Some(fetched_at),
                freshness: "cached",
            });
        }
        let (history, fetched) = tokio::time::timeout(
            remaining,
            context
                .market
                .fetch_history_gated_with_meta(&provider_symbol, period),
        )
        .await
        .map_err(|_| "DEADLINE_EXCEEDED".to_string())?
        .map_err(|error| error.to_string())?;
        let fetched_at = context
            .market
            .get_history_from_cache_with_fetched_at(&provider_symbol, period)
            .map(|(_, fetched_at)| fetched_at);
        Ok(HistoryResult {
            data: history.data,
            fetched_at,
            freshness: if fetched { "live" } else { "cached" },
        })
    })
    .map_err(internal_error)?;
    Ok(value)
}

fn trim_history(mut history: Vec<HistoryPoint>, bars: usize) -> Vec<HistoryPoint> {
    if history.len() > bars {
        history.drain(0..history.len() - bars);
    }
    history
}

fn calculate_indicators(history: &[HistoryPoint], settings: &IndicatorSettings) -> Value {
    let closes: Vec<f64> = history.iter().map(|point| point.c).collect();
    let highs: Vec<f64> = history.iter().map(|point| point.h).collect();
    let lows: Vec<f64> = history.iter().map(|point| point.l).collect();
    let volumes: Vec<f64> = history.iter().map(|point| point.v).collect();
    let period = |value: f64| value.max(1.0).round() as usize;
    let ma5 = moving_average(&closes, period(settings.ma5));
    let ma10 = moving_average(&closes, period(settings.ma10));
    let ma20 = moving_average(&closes, period(settings.ma20));
    let ma60 = moving_average(&closes, period(settings.ma60));
    let ma120 = moving_average(&closes, period(settings.ma120));
    let ma240 = moving_average(&closes, period(settings.ma240));
    let boll_period = period(settings.boll);
    let boll_ma = moving_average(&closes, boll_period);
    let boll = bollinger(&closes, boll_period);
    let (k, d, j) = stochastic(&highs, &lows, &closes, period(settings.kd));
    let ema_short_period = period(settings.ema_short);
    let ema_long_period = period(settings.ema_long);
    let ema_short = ema_series(&closes, ema_short_period)
        .last()
        .copied()
        .flatten();
    let ema_long = ema_series(&closes, ema_long_period)
        .last()
        .copied()
        .flatten();
    let (dif, osc) = macd(history);
    let obv_series = obv(&closes, &volumes);
    let obv = obv_series.last().copied();
    let obv_ema = ema_series(&obv_series, 10).last().copied().flatten();
    let obv_ma20 = moving_average(&obv_series, 20);
    let (supertrend, atr) = supertrend(history, period(settings.atr_len), settings.atr_mult);
    let (donchian_ub, donchian_lb, donchian_ma) =
        donchian(&highs, &lows, period(settings.donchian));
    let cci = cci(&highs, &lows, &closes, period(settings.cci));
    let mfi = money_flow_index(&highs, &lows, &closes, &volumes, period(settings.mfi));
    let cmf_period = period(settings.cmf);
    let cmf_series = chaikin_money_flow_series(&highs, &lows, &closes, &volumes, cmf_period);
    // @ch20026103/anysis initializes CMF and its EMA to zero during warm-up;
    // keep that explicit state instead of exposing a misleading null.
    let cmf = Some(cmf_series.last().copied().unwrap_or(0.0));
    let cmf_ema = Some(
        ema_series(&cmf_series, period(settings.cmf_ema))
            .last()
            .copied()
            .flatten()
            .unwrap_or(0.0),
    );
    let ema30 = ema_series(&closes, 30).last().copied().flatten();
    let ema200 = ema_series(&closes, 200).last().copied().flatten();
    let vma20 = moving_average(&volumes, 20);
    json!({
        "latest":closes.last().copied(),
        "ma5":ma5,
        "ma10":ma10,
        "ma20":ma20,
        "ma60":ma60,
        "ma120":ma120,
        "ma240":ma240,
        "ema30":ema30,
        "ema200":ema200,
        "emaShort":ema_short,
        "emaLong":ema_long,
        "ema_short":ema_short,
        "ema_long":ema_long,
        "vma20":vma20,
        "bollMa":boll_ma,
        "bollUb":boll.map(|value| value.0),
        "bollLb":boll.map(|value| value.1),
        "bandWidth":boll.and_then(|(upper, lower)| boll_ma.filter(|middle| *middle != 0.0).map(|middle| (upper - lower) / middle)),
        "k":k,
        "d":d,
        "j":j,
        "rsi":relative_strength_index(&closes, period(settings.rsi)),
        "mfi":mfi,
        "obv":obv,
        "obvEma":obv_ema,
        "obvMa20":obv_ma20,
        "cmf":cmf,
        "cmfEma":cmf_ema,
        "cmf_ema":cmf_ema,
        "osc":osc,
        "dif":dif,
        "atr":atr,
        "supertrend":supertrend,
        "donchianUb":donchian_ub,
        "donchianLb":donchian_lb,
        "donchianMa":donchian_ma,
        "cci":cci,
        "bars":closes.len()
    })
}

fn moving_average(values: &[f64], period: usize) -> Option<f64> {
    if period == 0 || values.len() < period {
        return None;
    }
    Some(round_two(
        values[values.len() - period..].iter().sum::<f64>() / period as f64,
    ))
}

fn ema_series(values: &[f64], period: usize) -> Vec<Option<f64>> {
    if values.is_empty() || period == 0 {
        return Vec::new();
    }
    let mut result = vec![None; values.len()];
    if values.len() < period {
        return result;
    }
    let mut previous = values[..period].iter().sum::<f64>() / period as f64;
    result[period - 1] = Some(previous);
    for (index, value) in values.iter().enumerate().skip(period) {
        previous = (*value * 2.0 + (period - 1) as f64 * previous) / (period + 1) as f64;
        result[index] = Some(previous);
    }
    result
}

fn bollinger(values: &[f64], period: usize) -> Option<(f64, f64)> {
    if period == 0 || values.len() < period {
        return None;
    }
    let window = &values[values.len() - period..];
    let mean = round_two(window.iter().sum::<f64>() / period as f64);
    let variance = window
        .iter()
        .map(|value| (value - mean).powi(2))
        .sum::<f64>()
        / period as f64;
    let deviation = round_two(variance.sqrt()) * 2.0;
    Some((mean + deviation, mean - deviation))
}

fn stochastic(
    highs: &[f64],
    lows: &[f64],
    closes: &[f64],
    period: usize,
) -> (Option<f64>, Option<f64>, Option<f64>) {
    if period == 0 || closes.len() < period || highs.len() < period || lows.len() < period {
        return (None, None, None);
    }
    let mut k = 0.0;
    let mut d = 0.0;
    let mut j = 0.0;
    let mut computed = false;
    for index in 0..closes.len() {
        if index + 1 < period {
            continue;
        }
        let begin = index + 1 - period;
        let high = highs[begin..=index]
            .iter()
            .copied()
            .fold(f64::NEG_INFINITY, f64::max);
        let low = lows[begin..=index]
            .iter()
            .copied()
            .fold(f64::INFINITY, f64::min);
        if !high.is_finite() || !low.is_finite() || high == low {
            return (None, None, None);
        }
        let rsv = round_two((closes[index] - low) / (high - low) * 100.0);
        let next_k = (2.0 / 3.0) * if k != 0.0 { k } else { 50.0 } + (1.0 / 3.0) * rsv;
        let next_d = (2.0 / 3.0) * if d != 0.0 { d } else { 50.0 } + (1.0 / 3.0) * next_k;
        k = round_two(next_k);
        d = round_two(next_d);
        j = round_two(3.0 * next_k - 2.0 * next_d);
        computed = true;
    }
    if computed {
        (Some(k), Some(d), Some(j))
    } else {
        (None, None, None)
    }
}

fn relative_strength_index(values: &[f64], period: usize) -> Option<f64> {
    if period == 0 || values.len() <= period {
        return None;
    }
    let mut gain = 0.0;
    let mut loss = 0.0;
    for pair in values[..=period].windows(2) {
        let change = pair[1] - pair[0];
        gain += change.max(0.0);
        loss += (-change).max(0.0);
    }
    gain /= period as f64;
    loss /= period as f64;
    for pair in values[period..].windows(2) {
        let change = pair[1] - pair[0];
        gain = (gain * (period - 1) as f64 + change.max(0.0)) / period as f64;
        loss = (loss * (period - 1) as f64 + (-change).max(0.0)) / period as f64;
    }
    if loss == 0.0 {
        return (gain > 0.0).then_some(100.0);
    }
    Some(100.0 - 100.0 / (1.0 + gain / loss))
}

fn money_flow_index(
    highs: &[f64],
    lows: &[f64],
    closes: &[f64],
    volumes: &[f64],
    period: usize,
) -> Option<f64> {
    if period == 0
        || closes.len() <= period
        || highs.len() != closes.len()
        || lows.len() != closes.len()
        || volumes.len() != closes.len()
    {
        return None;
    }
    let start = closes.len() - period - 1;
    let typical: Vec<f64> = (start..closes.len())
        .map(|index| (highs[index] + lows[index] + closes[index]) / 3.0)
        .collect();
    let mut positive = 0.0;
    let mut negative = 0.0;
    for index in 1..typical.len() {
        let flow = typical[index] * volumes[start + index];
        if typical[index] > typical[index - 1] {
            positive += flow;
        } else {
            negative += flow;
        }
    }
    Some(if negative == 0.0 {
        100.0
    } else {
        100.0 - 100.0 / (1.0 + positive / negative)
    })
}

fn obv(closes: &[f64], volumes: &[f64]) -> Vec<f64> {
    let mut result = Vec::with_capacity(closes.len());
    let mut total = volumes.first().copied().unwrap_or(0.0);
    for index in 0..closes.len() {
        if index > 0 {
            if closes[index] > closes[index - 1] {
                total += volumes[index];
            } else if closes[index] < closes[index - 1] {
                total -= volumes[index];
            }
        }
        result.push(total);
    }
    result
}

fn chaikin_money_flow(
    highs: &[f64],
    lows: &[f64],
    closes: &[f64],
    volumes: &[f64],
    period: usize,
) -> Option<f64> {
    if period == 0
        || closes.len() < period
        || highs.len() != closes.len()
        || lows.len() != closes.len()
        || volumes.len() != closes.len()
    {
        return None;
    }
    let start = closes.len() - period;
    let mut money_flow = 0.0;
    let mut volume = 0.0;
    for index in start..closes.len() {
        let range = highs[index] - lows[index];
        if range != 0.0 {
            money_flow +=
                ((2.0 * closes[index] - lows[index] - highs[index]) / range) * volumes[index];
        }
        volume += volumes[index];
    }
    if volume == 0.0 {
        None
    } else {
        Some(money_flow / volume)
    }
}

fn chaikin_money_flow_series(
    highs: &[f64],
    lows: &[f64],
    closes: &[f64],
    volumes: &[f64],
    period: usize,
) -> Vec<f64> {
    if period == 0 || closes.len() < period {
        return Vec::new();
    }
    (period..=closes.len())
        .filter_map(|end| {
            chaikin_money_flow(
                &highs[..end],
                &lows[..end],
                &closes[..end],
                &volumes[..end],
                period,
            )
        })
        .collect()
}

fn macd(history: &[HistoryPoint]) -> (Option<f64>, Option<f64>) {
    let mut ema12 = 0.0;
    let mut ema26 = 0.0;
    let mut diffs = Vec::new();
    let mut signal = 0.0;
    let mut osc = None;
    for (index, point) in history.iter().enumerate() {
        let di = (point.h + point.l + 2.0 * point.c) / 4.0;
        let length = index + 1;
        if length == 12 {
            ema12 = history[..=index]
                .iter()
                .map(|item| (item.h + item.l + 2.0 * item.c) / 4.0)
                .sum::<f64>()
                / 12.0;
            ema12 = round_two((ema12 * 11.0 + di * 2.0) / 13.0);
        } else if length > 12 && ema12 != 0.0 {
            ema12 = round_two((ema12 * 11.0 + di * 2.0) / 13.0);
        }
        if length == 26 {
            ema26 = history[..=index]
                .iter()
                .map(|item| (item.h + item.l + 2.0 * item.c) / 4.0)
                .sum::<f64>()
                / 26.0;
            ema26 = round_two((ema26 * 25.0 + di * 2.0) / 27.0);
        } else if length > 26 && ema26 != 0.0 {
            ema26 = round_two((ema26 * 25.0 + di * 2.0) / 27.0);
        }
        if ema12 != 0.0 && ema26 != 0.0 {
            let dif = round_two(ema12 - ema26);
            diffs.push(dif);
            if diffs.len() == 9 {
                signal = diffs.iter().sum::<f64>();
                for item in &diffs {
                    signal = round_two(signal + (item - signal) * 2.0 / 10.0);
                    osc = Some(round_two(item - signal));
                }
            } else if diffs.len() > 9 {
                signal = round_two(signal + (dif - signal) * 2.0 / 10.0);
                osc = Some(round_two(dif - signal));
                diffs.remove(0);
            }
        }
    }
    let dif = if ema12 != 0.0 && ema26 != 0.0 {
        diffs.last().copied()
    } else {
        None
    };
    (dif, osc)
}

fn donchian(highs: &[f64], lows: &[f64], period: usize) -> (Option<f64>, Option<f64>, Option<f64>) {
    if period == 0 || highs.len() < period || lows.len() < period {
        return (None, None, None);
    }
    let start = highs.len() - period;
    let upper = highs[start..]
        .iter()
        .copied()
        .fold(f64::NEG_INFINITY, f64::max);
    let lower = lows[start..].iter().copied().fold(f64::INFINITY, f64::min);
    if !upper.is_finite() || !lower.is_finite() {
        return (None, None, None);
    }
    (Some(upper), Some(lower), Some((upper + lower) / 2.0))
}

fn cci(highs: &[f64], lows: &[f64], closes: &[f64], period: usize) -> Option<f64> {
    if period == 0 || closes.len() < period {
        return None;
    }
    let start = closes.len() - period;
    let typical: Vec<f64> = (start..closes.len())
        .map(|index| (highs[index] + lows[index] + closes[index]) / 3.0)
        .collect();
    let mean = typical.iter().sum::<f64>() / period as f64;
    let deviation = typical
        .iter()
        .map(|value| (value - mean).abs())
        .sum::<f64>()
        / period as f64;
    Some(if deviation == 0.0 {
        0.0
    } else {
        (typical[period - 1] - mean) / (0.015 * deviation)
    })
}

fn supertrend(
    history: &[HistoryPoint],
    period: usize,
    multiplier: f64,
) -> (Option<f64>, Option<f64>) {
    if history.is_empty() || period == 0 {
        return (None, None);
    }
    let mut previous_atr = 0.0;
    let mut previous_upper = 0.0;
    let mut previous_lower = 0.0;
    let mut previous_supertrend = None;
    let mut direction = 1.0;
    let mut latest_atr = None;
    let mut latest_value = None;
    for (index, deal) in history.iter().enumerate() {
        let previous_close = index.checked_sub(1).map(|value| history[value].c);
        let mut true_range = deal.h - deal.l;
        if let Some(previous_close) = previous_close {
            true_range = true_range
                .max((deal.h - previous_close).abs())
                .max((deal.l - previous_close).abs());
        }
        let atr = if index == 0 {
            true_range
        } else if index < period {
            (previous_atr * index as f64 + true_range) / (index + 1) as f64
        } else {
            (previous_atr * (period - 1) as f64 + true_range) / period as f64
        };
        let source = (deal.h + deal.l) / 2.0;
        let basic_upper = source + multiplier * atr;
        let basic_lower = source - multiplier * atr;
        let upper = if index > 0
            && previous_close.is_some()
            && (basic_upper < previous_upper || previous_close.unwrap() > previous_upper)
        {
            basic_upper
        } else if index > 0 {
            previous_upper
        } else {
            basic_upper
        };
        let lower = if index > 0
            && previous_close.is_some()
            && (basic_lower > previous_lower || previous_close.unwrap() < previous_lower)
        {
            basic_lower
        } else if index > 0 {
            previous_lower
        } else {
            basic_lower
        };
        if index > 0 {
            direction =
                if previous_supertrend.is_none() || previous_supertrend == Some(previous_upper) {
                    if deal.c > upper {
                        -1.0
                    } else {
                        1.0
                    }
                } else if deal.c < lower {
                    1.0
                } else {
                    -1.0
                };
        }
        let value = if direction < 0.0 { lower } else { upper };
        previous_atr = atr;
        previous_upper = upper;
        previous_lower = lower;
        previous_supertrend = Some(value);
        latest_atr = Some(atr);
        latest_value = (value > 0.0).then_some(value);
    }
    (latest_value, latest_atr)
}

fn string_arg<'a>(args: &'a Value, key: &str) -> Result<&'a str, (i64, String)> {
    args.get(key)
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or((-32602, format!("{key} is required")))
}

fn default_indicator_settings() -> IndicatorSettings {
    IndicatorSettings {
        ma5: 5.0,
        ma10: 10.0,
        ma20: 30.0,
        ma60: 60.0,
        boll: 30.0,
        kd: 9.0,
        mfi: 14.0,
        rsi: 14.0,
        ma120: 120.0,
        ma240: 240.0,
        ema_short: 5.0,
        ema_long: 10.0,
        cmf: 21.0,
        cmf_ema: 5.0,
        atr_len: 10.0,
        atr_mult: 3.0,
        donchian: 20.0,
        cci: 26.0,
    }
}

fn enter_request(rate: &Arc<Mutex<RateLimit>>) -> bool {
    let Ok(mut value) = rate.lock() else {
        return false;
    };
    if value.window_started.elapsed() >= Duration::from_secs(60) {
        value.window_started = Instant::now();
        value.requests = 0;
    }
    if value.requests >= 60 {
        return false;
    }
    if value.active >= 8 {
        return false;
    }
    value.requests += 1;
    value.active += 1;
    true
}

fn leave_request(rate: &Arc<Mutex<RateLimit>>) {
    if let Ok(mut value) = rate.lock() {
        value.active = value.active.saturating_sub(1);
    }
}

fn origin_allowed(origin: Option<&str>) -> bool {
    matches!(
        origin,
        None | Some("null") | Some("tauri://localhost") | Some("http://localhost")
    )
}

fn constant_time_eq(left: &str, right: &str) -> bool {
    let mut result = left.len() ^ right.len();
    for (a, b) in left.bytes().zip(right.bytes()) {
        result |= usize::from(a ^ b);
    }
    result == 0
}

fn random_token() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn random_identifier(prefix: &str) -> String {
    let mut bytes = [0_u8; 16];
    OsRng.fill_bytes(&mut bytes);
    let value: String = bytes.iter().map(|byte| format!("{byte:02x}")).collect();
    format!("{prefix}-{value}")
}

fn unix_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn round_two(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::net::TcpListener;

    fn parse_loopback_request(builder: impl FnOnce(u16) -> String) -> Result<HttpRequest, String> {
        let listener = TcpListener::bind("127.0.0.1:0").expect("loopback listener");
        let address = listener.local_addr().expect("address");
        let request = builder(address.port());
        let sender = thread::spawn(move || {
            let mut stream = std::net::TcpStream::connect(address).expect("connect");
            stream.write_all(request.as_bytes()).expect("request");
        });
        let (mut stream, _) = listener.accept().expect("accept");
        let result = read_http_request(&mut stream, address.port());
        sender.join().expect("sender");
        result
    }

    #[test]
    fn origin_and_token_checks_are_strict() {
        assert!(origin_allowed(None));
        assert!(origin_allowed(Some("tauri://localhost")));
        assert!(!origin_allowed(Some("https://evil.example")));
        assert!(constant_time_eq("Bearer token", "Bearer token"));
        assert!(!constant_time_eq("Bearer token", "Bearer other"));
    }

    #[test]
    fn loopback_parser_enforces_host_and_body_bounds() {
        let valid = parse_loopback_request(|port| {
            format!("POST /mcp HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Length: 2\r\n\r\n{{}}")
        });
        assert!(valid.is_ok());
        let wrong_host = parse_loopback_request(|port| {
            format!(
                "POST /mcp HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nContent-Length: 0\r\n\r\n",
                port + 1
            )
        });
        assert!(wrong_host.is_err());
        let too_large = parse_loopback_request(|port| {
            format!(
                "POST /mcp HTTP/1.1\r\nHost: 127.0.0.1:{}\r\nContent-Length: {}\r\n\r\n",
                port,
                MAX_BODY_BYTES + 1
            )
        });
        assert!(too_large.is_err());
    }

    #[test]
    fn rate_limit_bounds_requests() {
        let rate = Arc::new(Mutex::new(RateLimit {
            window_started: Instant::now(),
            requests: 0,
            active: 0,
        }));
        for _ in 0..60 {
            assert!(enter_request(&rate));
            leave_request(&rate);
        }
        assert!(!enter_request(&rate));
    }

    #[test]
    fn technical_snapshot_exposes_the_app_indicator_surface() {
        let history: Vec<HistoryPoint> = (0..80)
            .map(|index| {
                let close = 100.0 + index as f64;
                HistoryPoint {
                    t: index,
                    o: close - 1.0,
                    h: close + 2.0,
                    l: close - 2.0,
                    c: close,
                    v: 1_000.0 + index as f64,
                }
            })
            .collect();
        let settings = IndicatorSettings {
            ma5: 5.0,
            ma10: 10.0,
            ma20: 30.0,
            ma60: 60.0,
            boll: 30.0,
            kd: 9.0,
            mfi: 14.0,
            rsi: 14.0,
            ma120: 120.0,
            ma240: 240.0,
            ema_short: 5.0,
            ema_long: 10.0,
            cmf: 21.0,
            cmf_ema: 5.0,
            atr_len: 10.0,
            atr_mult: 3.0,
            donchian: 20.0,
            cci: 26.0,
        };
        let result = calculate_indicators(&history, &settings);
        for key in [
            "ma5",
            "ma20",
            "bollUb",
            "k",
            "rsi",
            "mfi",
            "obv",
            "cmf",
            "dif",
            "atr",
            "supertrend",
            "donchianUb",
            "cci",
        ] {
            assert!(result.get(key).is_some(), "missing {key}");
        }
        assert_eq!(result["bars"], 80);
        assert!(result["ma5"].as_f64().is_some());
    }

    #[test]
    fn indicator_golden_fixture_uses_account_ema_periods_and_cmf_ema() {
        let closes = [10.0, 12.0, 11.0, 15.0, 14.0, 18.0, 17.0, 20.0];
        let highs = [11.0, 14.0, 13.0, 17.0, 15.0, 20.0, 19.0, 22.0];
        let lows = [9.0, 10.0, 9.0, 13.0, 12.0, 15.0, 14.0, 18.0];
        let volumes = [100.0, 120.0, 80.0, 150.0, 130.0, 160.0, 110.0, 180.0];
        let history: Vec<HistoryPoint> = (0..closes.len())
            .map(|index| HistoryPoint {
                t: index as i64,
                o: closes[index],
                h: highs[index],
                l: lows[index],
                c: closes[index],
                v: volumes[index],
            })
            .collect();
        let mut settings = default_indicator_settings();
        settings.ema_short = 3.0;
        settings.ema_long = 5.0;
        settings.cmf = 3.0;
        settings.cmf_ema = 2.0;
        let result = calculate_indicators(&history, &settings);
        assert!((result["emaShort"].as_f64().unwrap() - 18.1875).abs() < 1e-10);
        assert!((result["emaLong"].as_f64().unwrap() - 16.785185185185185).abs() < 1e-10);
        assert!((result["cmfEma"].as_f64().unwrap() - 0.1497285613334996).abs() < 1e-10);
    }

    #[test]
    fn history_bars_follow_the_tool_schema_bounds() {
        assert_eq!(bounded_bars(Some(&json!(0))), 1);
        assert_eq!(bounded_bars(Some(&json!(1))), 1);
        assert_eq!(bounded_bars(Some(&json!(500))), 500);
        assert_eq!(bounded_bars(Some(&json!(501))), 500);
        assert_eq!(bounded_bars(None), 200);
    }

    #[test]
    fn category_names_trim_and_reject_whitespace_only_values() {
        assert_eq!(
            trimmed_category_name("  Semiconductor  ").unwrap(),
            "Semiconductor"
        );
        assert_eq!(
            trimmed_category_name(" \t\n "),
            Err("name is required".to_string())
        );
    }

    #[test]
    fn qualified_market_symbols_preserve_provider_mapping() {
        assert_eq!(
            normalize_market_symbol("US:AAPL").unwrap(),
            ("AAPL".to_string(), "US")
        );
        assert_eq!(
            normalize_market_symbol("TW:2330").unwrap(),
            ("2330".to_string(), "TW")
        );
        assert!(matches!(
            normalize_market_symbol("US:2330"),
            Err((-32602, message)) if message == "MARKET_SYMBOL_MISMATCH"
        ));
        assert!(matches!(
            normalize_market_symbol("TW:AAPL"),
            Err((-32602, message)) if message == "MARKET_SYMBOL_MISMATCH"
        ));
        assert!(matches!(
            normalize_market_symbol("HK:2330"),
            Err((-32602, message)) if message == "INVALID_MARKET_PREFIX"
        ));
    }

    #[test]
    fn quote_payload_marks_missing_market_values_as_partial() {
        let tick = MarketTick {
            id: "2330".to_string(),
            name: Some("TSMC".to_string()),
            price: 100.0,
            change_percent: 0.0,
            refreshed_ts: 0,
            closes: vec![],
            avg_prices: vec![],
            previous_close: 0.0,
            timestamps: vec![],
            volume: None,
        };
        let value = quote_value("2330", "2330.TW", "TW", tick, Some(1), "live");

        assert_eq!(value["state"], "partial");
        assert!(value["data"]["previous_close"].is_null());
        assert!(value["data"]["change_percent"].is_null());
        assert!(value["data"]["refreshed_ts"].is_null());
        assert!(value["missing_fields"]
            .as_array()
            .expect("missing fields")
            .contains(&json!("change_percent")));
    }

    #[test]
    fn revision_zero_without_payload_is_a_valid_empty_account_snapshot() {
        let state = crate::account::AccountStateResult {
            user_id: "user-a".to_string(),
            epoch: 1,
            revision: 0,
            schema_version: 1,
            data: None,
            updated_at: None,
        };
        let snapshot = account_snapshot_or_empty(&state).expect("empty account");
        assert!(snapshot.stocks.is_empty());
        assert_eq!(snapshot.categories[0].id, "default-watchlist");
        assert_eq!(snapshot.indicator_settings, default_indicator_settings());
        assert!(requested_symbols(&json!({}), &state)
            .expect("empty requested symbols")
            .is_empty());

        let corrupt = crate::account::AccountStateResult {
            revision: 2,
            ..state
        };
        assert_eq!(
            account_snapshot_or_empty(&corrupt),
            Err("CORRUPT_CLOUD_RESPONSE".to_string())
        );
    }

    #[test]
    fn canonical_app_indicator_fixture_matches_all_agent_indicators() {
        let history: Vec<HistoryPoint> = (0..80)
            .map(|index| {
                let close = 100.0 + (index as f64 / 3.0).sin() * 7.0 + index as f64 * 0.35;
                HistoryPoint {
                    t: index as i64 + 1,
                    o: close - 0.8,
                    h: close + 2.2 + (index % 4) as f64 * 0.15,
                    l: close - 2.4 - (index % 3) as f64 * 0.2,
                    c: close,
                    v: 1000.0 + index as f64 * 37.0 + (index % 5) as f64 * 11.0,
                }
            })
            .collect();
        let result = calculate_indicators(&history, &default_indicator_settings());
        let expected = [
            ("latest", 134.17577433390815),
            ("ma5", 130.13),
            ("ma10", 124.84),
            ("ma20", 121.94),
            ("ma60", 117.6),
            ("ema30", 122.57131235281649),
            ("emaShort", 130.31451801325775),
            ("emaLong", 127.25986128299564),
            ("vma20", 3593.5),
            ("bollMa", 121.94),
            ("bollUb", 134.62),
            ("bollLb", 109.25999999999999),
            ("bandWidth", 0.20797113334426778),
            ("k", 81.18),
            ("d", 70.08),
            ("j", 103.39),
            ("rsi", 75.48392844504248),
            ("mfi", 66.9781352011632),
            ("obv", 35722.0),
            ("obvEma", 22933.91384749985),
            ("obvMa20", 18597.0),
            ("cmf", 0.03252388395343906),
            ("cmfEma", 0.03420665256365215),
            ("osc", 1.08),
            ("dif", 3.22),
            ("atr", 5.0573070881789315),
            ("supertrend", 119.02885306937137),
            ("donchianUb", 136.82577433390813),
            ("donchianLb", 115.0821260870131),
            ("donchianMa", 125.95395021046062),
            ("cci", 160.75349050921702),
        ];
        for (key, expected) in expected {
            let actual = result[key].as_f64().unwrap_or(f64::NAN);
            assert!(
                (actual - expected).abs() < 1e-9,
                "{key}: {actual} != {expected}"
            );
        }
        for key in ["ema200", "ma120", "ma240"] {
            assert!(result[key].is_null(), "{key} should remain in warm-up");
        }

        let warmups: &[(usize, &[(&str, Option<f64>)])] = &[
            (
                0,
                &[
                    ("ma5", None),
                    ("ema30", None),
                    ("k", None),
                    ("rsi", None),
                    ("mfi", None),
                    ("obv", Some(1000.0)),
                    ("cmf", Some(0.0)),
                    ("cmfEma", Some(0.0)),
                    ("osc", None),
                ],
            ),
            (
                4,
                &[
                    ("ma5", Some(104.56)),
                    ("ema30", None),
                    ("k", None),
                    ("rsi", None),
                    ("mfi", None),
                    ("obv", Some(5480.0)),
                    ("cmf", Some(0.0)),
                    ("cmfEma", Some(0.0)),
                    ("osc", None),
                ],
            ),
            (
                9,
                &[
                    ("ma5", Some(106.97)),
                    ("ema30", None),
                    ("k", Some(48.47)),
                    ("rsi", None),
                    ("mfi", None),
                    ("obv", Some(1445.0)),
                    ("cmf", Some(0.0)),
                    ("cmfEma", Some(0.0)),
                    ("osc", None),
                ],
            ),
            (
                19,
                &[
                    ("ma5", Some(102.34)),
                    ("ema30", None),
                    ("k", Some(61.61)),
                    ("rsi", Some(65.59363708200894)),
                    ("mfi", Some(39.713468607091556)),
                    ("obv", Some(2370.0)),
                    ("cmf", Some(0.0)),
                    ("cmfEma", Some(0.0)),
                    ("osc", None),
                ],
            ),
            (
                29,
                &[
                    ("ma5", Some(112.02)),
                    ("ema30", Some(106.41387715943544)),
                    ("k", Some(48.6)),
                    ("rsi", Some(54.1364256144487)),
                    ("mfi", Some(60.48983111425408)),
                    ("obv", Some(1445.0)),
                    ("cmf", Some(0.03653491483740586)),
                    ("cmfEma", Some(0.03555234469680186)),
                    ("osc", None),
                ],
            ),
            (
                33,
                &[
                    ("ma5", Some(105.92)),
                    ("ema30", Some(106.13613057568881)),
                    ("k", Some(23.88)),
                    ("rsi", Some(44.72659349104723)),
                    ("mfi", Some(41.268467353434744)),
                    ("obv", Some(-7283.0)),
                    ("cmf", Some(0.03571039124512102)),
                    ("cmfEma", Some(0.03542058675704345)),
                    ("osc", Some(-3.78)),
                ],
            ),
            (
                59,
                &[
                    ("ma5", Some(120.89)),
                    ("ema30", Some(115.07617726271101)),
                    ("k", Some(76.6)),
                    ("rsi", Some(73.446329519325)),
                    ("mfi", Some(53.280356766931995)),
                    ("obv", Some(19594.0)),
                    ("cmf", Some(0.032896728505845296)),
                    ("cmfEma", Some(0.03427957840397013)),
                    ("osc", Some(0.78)),
                ],
            ),
        ];
        for (end, fields) in warmups {
            let prefix = calculate_indicators(&history[..=*end], &default_indicator_settings());
            for &(key, expected) in fields.iter() {
                match expected {
                    Some(value) => {
                        let actual = prefix[key].as_f64().unwrap_or(f64::NAN);
                        assert!(
                            (actual - value).abs() < 1e-9,
                            "prefix {end} {key}: {actual} != {value}"
                        );
                    }
                    None => assert!(prefix[key].is_null(), "prefix {end} {key} should be null"),
                }
            }
        }
    }
}
