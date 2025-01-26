import { Button, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { Prompts, PromptType } from "../../../../../store/Schoice.store";
import generateExpression from "../../../../../utils/generateExpression";

export default function Rule({
  select,
}: {
  select: {
    id: string;
    name: string;
    value: Prompts;
    type: PromptType;
  };
}) {
  const navigate = useNavigate();

  return (
    <Container>
      <Typography variant="h4">{select && select.name}</Typography>
      <Button onClick={() => navigate("/schoice/edit/" + select?.id)}>
        修改
      </Button>
      <Typography variant="body1">
        {select && JSON.stringify(select.value, null, 2)}
      </Typography>
      <Typography variant="body1">
        {select &&
          JSON.stringify(
            select.value.map(
              (prompt) =>
                prompt.day1 +
                prompt.indicator1 +
                prompt.operator +
                prompt.day2 +
                prompt.indicator2
            ),
            null,
            2
          )}
      </Typography>
      <Typography variant="body1">
        {select &&
          JSON.stringify(
            select.value.map((prompt) => generateExpression(prompt)),
            null,
            2
          )}
      </Typography>
    </Container>
  );
}
