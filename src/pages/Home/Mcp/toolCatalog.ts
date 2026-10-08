export const MCP_TOOL_GROUPS = [
  {
    id: "read",
    tools: [
      "get_context",
      "list_watchlists",
      "get_quotes",
      "get_history",
      "get_technical_indicators",
      "get_chip_analysis",
      "get_analysis_snapshot",
    ],
  },
  {
    id: "manage",
    tools: [
      "add_stock",
      "remove_stock",
      "create_category",
      "rename_category",
      "delete_category",
      "set_category_members",
      "reorder_category",
      "update_indicator_settings",
      "reset_indicator_settings",
    ],
  },
] as const;
