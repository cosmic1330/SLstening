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
