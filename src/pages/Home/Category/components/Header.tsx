import { Add as AddIcon, Settings as SettingsIcon } from "@mui/icons-material";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { CategoryType } from "../../../../types";
import { CategoryPill, PremiumHeader } from "../styles";

interface HeaderProps {
  categories: CategoryType[];
  activeId: string | null;
  count: number;
  activeName: string;
  onSelect: (id: string) => void;
  onAddClick: () => void;
  onManageClick: () => void;
}

export default function Header({
  categories,
  activeId,
  count,
  activeName,
  onSelect,
  onAddClick,
  onManageClick,
}: HeaderProps) {
  return (
    <PremiumHeader>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-end"
        mb={4}
      >
        <Box>
          <Typography
            variant="h3"
            fontWeight="900"
            sx={{ letterSpacing: "-1px", color: "#fff" }}
          >
            自選分類
          </Typography>
          <Typography
            variant="body1"
            sx={{ opacity: 0.5, fontWeight: 500, mt: 0.5 }}
          >
            {activeId
              ? `${activeName} · ${count} 檔標的`
              : "選擇分類開始管理您的自選名單"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <IconButton
            onClick={onAddClick}
            sx={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              "&:hover": { background: "rgba(255,255,255,0.08)" },
            }}
          >
            <AddIcon sx={{ color: "white", fontSize: "1.4rem" }} />
          </IconButton>
          <IconButton
            onClick={onManageClick}
            sx={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              "&:hover": { background: "rgba(255,255,255,0.08)" },
            }}
          >
            <SettingsIcon sx={{ color: "white", fontSize: "1.4rem" }} />
          </IconButton>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          overflowX: "auto",
          pb: 1,
          "::-webkit-scrollbar": { display: "none" },
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {categories.map((c) => (
          <CategoryPill
            key={c.id}
            label={c.name}
            active={activeId === c.id}
            onClick={() => onSelect(c.id)}
          />
        ))}
        {categories.length === 0 && (
          <Typography
            variant="body2"
            sx={{ opacity: 0.3, fontStyle: "italic", py: 1 }}
          >
            尚未建立分類，請點擊右方按鈕新增
          </Typography>
        )}
      </Stack>
    </PremiumHeader>
  );
}
