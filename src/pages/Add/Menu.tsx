import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { Control, Controller, FieldErrors } from "react-hook-form";
import type FormData from "./type";
import { Box, Typography } from "@mui/material";
import useStocksStore from "../../store/Stock.store";

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
          required: "股票代號是必填項目",
          pattern: {
            value: /^\d{4}$/,
            message: "股票代號格式不正確",
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
            renderInput={(params) => <TextField {...params} label="Stock" />}
          />
        )}
      />
      <Typography variant="caption" color="error">
        {errors.stock && errors.stock?.message}
      </Typography>
    </Box>
  );
}
