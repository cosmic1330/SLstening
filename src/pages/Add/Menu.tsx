import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { Control, Controller, FieldErrors } from "react-hook-form";
import type FormData from "./type";
import { Box, Typography, styled, alpha } from "@mui/material";
import useStocksStore from "../../store/Stock.store";
import { t } from "i18next";

// Custom Styled TextField (Shared style)
const CustomTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: alpha(theme.palette.common.white, 0.03),
    transition: "all 0.2s ease",
    "& fieldset": {
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.palette.primary.main,
      borderWidth: "1px",
    },
    "&.Mui-focused": {
      backgroundColor: alpha(theme.palette.common.white, 0.05),
      transform: "translateY(-1px)",
    },
  },
  "& .MuiInputLabel-root": {
    color: alpha(theme.palette.common.white, 0.6),
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: theme.palette.primary.main,
  },
  "& input": {
    color: theme.palette.common.white,
  },
  // Ensure autocomplete popup icon is white
  "& .MuiSvgIcon-root": {
      color: "rgba(255,255,255,0.7)",
  }
}));

export default function Menu({
  control,
  errors,
}: {
  control: Control<FormData, any>;
  errors: FieldErrors<FormData>;
}) {
  const { menu } = useStocksStore();

  return (
    <Box width="100%">
      <Controller
        name="stock"
        control={control}
        defaultValue={null}
        rules={{
          required: t("Pages.Add.required"),
          pattern: {
            value: /^\d{4}$/,
            message: t("Pages.Add.pattern"),
          },
        }}
        render={({ field }) => (
          <Autocomplete
            {...field}
            disablePortal
            options={menu}
            getOptionLabel={(option) => `${option.id} ${option.name}`}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                {option.name} ({option.id})
              </li>
            )}
            defaultValue={null}
            value={field.value || null}
            onChange={(_, newValue) => {
              field.onChange(newValue);
            }}
            fullWidth
            renderInput={(params) => <CustomTextField {...params} label= {t("Pages.Add.selectStock")} variant="outlined" />}
          />
        )}
      />
      <Typography variant="caption" color="error">
        {errors.stock && errors.stock?.message}
      </Typography>
    </Box>
  );
}
