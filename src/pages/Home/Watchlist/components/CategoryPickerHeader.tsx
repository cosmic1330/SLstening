import CloseIcon from "@mui/icons-material/Close";
import { Box, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { semanticTokens } from "../../../../theme";

interface CategoryPickerHeaderProps {
  activeName: string;
  pending: boolean;
  onClose: () => void;
}

export default function CategoryPickerHeader({ activeName, pending, onClose }: CategoryPickerHeaderProps) {
  const { t } = useTranslation();
  return (
    <DialogTitle component="div" sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2, sm: 2.5 }, flexShrink: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box minWidth={0} flex={1}>
          <Typography component="h2" variant="h6" fontWeight={900}>{t("watchlist.chooseCategory")}</Typography>
          <Box sx={{ mt: 1.5, px: 1.5, py: 1.1, borderRadius: 1, bgcolor: semanticTokens.analysis.inset, border: `1px solid ${semanticTokens.analysis.borderSubtle}`, maxWidth: "100%" }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, whiteSpace: { xs: "normal", sm: "nowrap" }, overflowWrap: "anywhere", lineHeight: 1.4 }}>
              {t("watchlist.currentCategoryName", { name: activeName })}
            </Typography>
          </Box>
        </Box>
        <IconButton disabled={pending} aria-label={t("watchlist.close")} onClick={onClose} sx={{ minWidth: 44, minHeight: 44 }}><CloseIcon /></IconButton>
      </Stack>
    </DialogTitle>
  );
}
