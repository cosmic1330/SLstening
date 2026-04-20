import SearchIcon from "@mui/icons-material/Search";
import { Autocomplete, InputAdornment } from "@mui/material";
import { useRef, useState } from "react";
import { StockStoreType } from "../../../../types";
import { CommandInput, CommandSearchBox } from "../styles";

interface SearchPaletteProps {
  menu: StockStoreType[];
  onAddStock: (stockId: string) => void;
}

import useUIStore from "../../../../store/UI.store";

export default function SearchPalette({
  menu,
  onAddStock,
}: SearchPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const { setBottomBarVisible } = useUIStore();

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
        ListboxProps={{
          sx: {
            maxHeight: "260px", // Safety limit to avoid covering BottomBar
            "& .MuiAutocomplete-option": {
              color: "#5D4037",
              fontWeight: 700,
              padding: "10px 16px",
              '&[aria-selected="true"]': {
                backgroundColor: "rgba(61, 90, 69, 0.1) !important",
              },
              "&.Mui-focused": {
                backgroundColor: "rgba(61, 90, 69, 0.05)",
              },
            },
          }
        }}
        slotProps={{
          paper: {
            sx: {
              background: "#FCF9F5",
              borderRadius: "12px",
              border: "2px solid #D2B48C",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              mt: 1,
            },
          },
        }}
        renderInput={(params) => (
          <CommandInput
            {...params}
            inputRef={inputRef}
            onFocus={() => setBottomBarVisible(false)}
            onBlur={() => setBottomBarVisible(true)}
            placeholder="輸入簡稱或代號加入此自選..."
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#3D5A45", ml: 1 }} />
                </InputAdornment>
              ),
            }}
          />
        )}
      />
    </CommandSearchBox>
  );
}
