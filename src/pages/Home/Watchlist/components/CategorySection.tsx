import { Box, List, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";
import { semanticTokens } from "../../../../theme";
import { CategoryType } from "../../../../types";
import CategoryListItem from "./CategoryListItem";

interface CategorySectionProps {
  label: string;
  items: CategoryType[];
  icon: ReactNode;
  defaultName: string;
  pending: boolean;
  activeCategoryId: string | null;
  columns: { xs: number; sm: number };
  onSelect: (id: string) => void;
}

export default function CategorySection({ label, items, icon, defaultName, pending, activeCategoryId, columns, onSelect }: CategorySectionProps) {
  if (!items.length) return null;
  return (
    <Box component="section" sx={{ mt: 3 }}>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1.5, px: 0.25, color: semanticTokens.analysis.textMuted }}>
        {icon}
        <Typography variant="subtitle2" fontWeight={900} sx={{ flex: 1 }}>{label}</Typography>
        <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>{items.length}</Typography>
      </Stack>
      <List disablePadding sx={{ display: "grid", gridTemplateColumns: { xs: `repeat(${columns.xs}, minmax(0, 1fr))`, sm: `repeat(${columns.sm}, minmax(0, 1fr))` }, columnGap: { xs: 1.5, sm: 2.5 }, rowGap: 1, minWidth: 0 }}>
        {items.map((category) => (
          <CategoryListItem key={category.id} category={category} defaultName={defaultName} icon={icon} selected={category.id === activeCategoryId} pending={pending} onSelect={onSelect} />
        ))}
      </List>
    </Box>
  );
}
