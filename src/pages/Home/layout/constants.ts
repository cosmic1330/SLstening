export const BOTTOM_BAR_HEIGHT = 60;
export const BOTTOM_BAR_EDGE_GAP = 12;
export const BOTTOM_BAR_FAB_OVERHANG = 20;
export const BOTTOM_BAR_CONTENT_GAP = 8;

const SAFE_AREA_BOTTOM = "env(safe-area-inset-bottom, 0px)";

export const BOTTOM_BAR_BOTTOM = `calc(${BOTTOM_BAR_EDGE_GAP}px + ${SAFE_AREA_BOTTOM})`;

export const BOTTOM_BAR_CONTENT_CLEARANCE = `calc(${
  BOTTOM_BAR_HEIGHT +
  BOTTOM_BAR_EDGE_GAP +
  BOTTOM_BAR_FAB_OVERHANG +
  BOTTOM_BAR_CONTENT_GAP
}px + ${SAFE_AREA_BOTTOM})`;
