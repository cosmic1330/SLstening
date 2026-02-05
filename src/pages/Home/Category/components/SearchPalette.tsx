import SearchIcon from "@mui/icons-material/Search";
import { Autocomplete, InputAdornment } from "@mui/material";
import { useRef, useState } from "react";
import { StockStoreType } from "../../../../types";
import { CommandInput, CommandSearchBox } from "../styles";

interface SearchPaletteProps {
  menu: StockStoreType[];
  onAddStock: (stockId: string) => void;
}

export default function SearchPalette({
  menu,
  onAddStock,
}: SearchPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  return (
    <CommandSearchBox>
      <Autocomplete
        options={menu}
        getOptionLabel={(option) => `${option.id} ${option.name}`}
        value={null}
        inputValue={inputValue}
        onInputChange={(_, newValue) => setInputValue(newValue)}
        blurOnSelect={false}
        onChange={(_, stock) => {
          if (stock) {
            onAddStock(stock.id);
            setInputValue(""); // Clear input text
            // Ensure focus persists
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }
        }}
        slotProps={{
          paper: {
            sx: {
              background: "#1e293b",
              color: "white",
              "& .MuiAutocomplete-option": {
                '&[aria-selected="true"]': {
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                },
                "&.Mui-focused": {
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                },
              },
            },
          },
        }}
        renderInput={(params) => (
          <CommandInput
            {...params}
            inputRef={inputRef}
            placeholder="輸入簡稱或代號加入此自選..."
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#10b981", ml: 1 }} />
                </InputAdornment>
              ),
            }}
          />
        )}
      />
    </CommandSearchBox>
  );
}
