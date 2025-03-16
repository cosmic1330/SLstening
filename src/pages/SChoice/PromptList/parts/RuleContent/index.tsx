import { Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { Prompts, PromptType } from "../../../../../store/Schoice.store";
import Summary from "./Summary";

export default function RuleContent({
  select,
}: {
  select: {
    id: string;
    name: string;
    value: {
      daily: Prompts;
      weekly: Prompts;
    };
    type: PromptType;
  };
}) {
  const navigate = useNavigate();

  return (
    <Stack spacing={2} alignItems="flex-start">
      <Typography variant="h4">{select && select.name}</Typography>
      <Button onClick={() => navigate("/schoice/edit/" + select?.id)}>
        修改策略條件
      </Button>
      <Summary select={select} />
    </Stack>
  );
}
