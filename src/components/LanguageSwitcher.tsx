import { IconButton } from "@mui/material";
import { useTranslation } from "react-i18next";
import TranslateIcon from "@mui/icons-material/Translate";
import { normalizeLanguage } from "../i18n";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const nextLanguage = currentLanguage === "en" ? "zh-TW" : "en";

  const handleLanguageChange = async () => {
    try {
      await i18n.changeLanguage(nextLanguage);
    } catch (error) {
      console.error("Unable to change application language", error);
    }
  };

  return (
    <IconButton
      size="small"
      onClick={handleLanguageChange}
      aria-label={t("a11y.switchLanguage", { language: t(`language.${nextLanguage}`) })}
      title={t("a11y.switchLanguage", { language: t(`language.${nextLanguage}`) })}
      sx={{ minWidth: 44, minHeight: 44 }}
    >
      <TranslateIcon color={currentLanguage === "en" ? "primary" : "inherit"} />
    </IconButton>
  );
}
