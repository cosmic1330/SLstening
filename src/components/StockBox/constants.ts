import { semanticTokens } from "../../theme";

export const STOCK_BOX_HEIGHT = 308;

export const stockBoxTokens = {
  up: semanticTokens.market.gain,
  down: semanticTokens.market.loss,
  neutral: semanticTokens.market.neutral,
  surface: semanticTokens.analysis.surface,
  border: semanticTokens.analysis.border,
  text: semanticTokens.analysis.text,
  textMuted: semanticTokens.analysis.textMuted,
  focus: semanticTokens.analysis.focus,
} as const;

/**
 * Radius shared by StockBox surfaces and the Watchlist route that hosts them.
 *
 * Keep this as an explicit CSS value instead of a MUI numeric radius so the
 * compact Watchlist surface is not coupled to the global theme multiplier.
 */
export const WATCHLIST_RADIUS = "8px" as const;
