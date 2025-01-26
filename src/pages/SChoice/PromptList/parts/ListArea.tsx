import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import { Box, Button, Stack, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router";
import useSchoiceStore, { PromptType } from "../../../../store/Schoice.store";
import ListItem from "./ListItem";

export default function ListArea() {
  const [value, setValue] = useState(0);
  const { bulls, bears } = useSchoiceStore();
  const navigate = useNavigate();
  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Stack px={1} boxShadow={"2px 0px 4px rgba(0, 0, 0, 0.25)"} spacing={2}>
      <Tabs value={value} onChange={handleChange} variant="fullWidth">
        <Tab label="BULLS" icon={<TrendingUpRoundedIcon />} />
        <Tab label="BEAR" icon={<TrendingDownRoundedIcon />} />
      </Tabs>
      <Box width={300}>
        {value === 0
          ? Object.keys(bulls).map((id, index) => (
              <ListItem
                key={index}
                index={index}
                id={id}
                name={bulls[id].name}
                promptType={PromptType.BULLS}
              />
            ))
          : Object.keys(bears).map((id, index) => (
              <ListItem
                key={index}
                index={index}
                id={id}
                name={bears[id].name}
                promptType={PromptType.BEAR}
              />
            ))}
      </Box>
      <Button
        fullWidth
        variant="contained"
        onClick={() => {
          navigate(
            "/schoice/add?promptType=" +
              (value === 0 ? PromptType.BULLS : PromptType.BEAR)
          );
        }}
      >
        Add Filter
      </Button>
    </Stack>
  );
}
