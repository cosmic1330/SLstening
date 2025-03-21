import { Box, Button, Container, Grid2, Typography } from "@mui/material";
import { nanoid } from "nanoid";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import useSchoiceStore, {
  Prompts,
  PromptType,
} from "../../../store/Schoice.store";
import ExpressionGenerator from "../parts/ExpressionGenerator";
import PromptName from "../parts/PromptName";

export default function PromptAdd() {
  const { increase, selectObj } = useSchoiceStore();
  const [prompts, setPrompts] = useState<Prompts>([]);
  const [weekPrompts, setWeekPrompts] = useState<Prompts>([]);

  const [name, setName] = useState(nanoid());
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const promptType = searchParams.get("promptType");
  const navigate = useNavigate();

  const handleCreate = async () => {
    const id = await increase(
      name,
      {
        daily: prompts,
        weekly: weekPrompts,
      },
      promptType === "bulls" ? PromptType.BULLS : PromptType.BEAR
    );
    if (id)
      selectObj(
        id,
        promptType === "bulls" ? PromptType.BULLS : PromptType.BEAR
      );
    navigate("/schoice");
  };

  const handleRemove = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const handleWeekRemove = (index: number) => {
    setWeekPrompts(weekPrompts.filter((_, i) => i !== index));
  };

  return (
    <Grid2 container>
      <Grid2 size={6}>
        <Container>
          <Typography
            variant="h5"
            gutterBottom
            mt={2}
            textTransform="uppercase"
          >
            {promptType} Name
          </Typography>
          <PromptName {...{ name, setName }} />

          <ExpressionGenerator
            {...{ promptType, setPrompts, setWeekPrompts }}
          />
        </Container>
      </Grid2>
      <Grid2 size={6}>
        <Container>
          <Typography variant="h5" gutterBottom my={2}>
            已加入的日線條件
          </Typography>
          <Box
            border="1px solid #000"
            borderRadius={1}
            p={2}
            minHeight={200}
            mb={2}
          >
            {prompts.length === 0 && (
              <Typography variant="body2" gutterBottom>
                空
              </Typography>
            )}
            {prompts.map((prompt, index) => (
              <Typography key={index} variant="body2" gutterBottom>
                {index + 1}. {Object.values(prompt).join("")}{" "}
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleRemove(index)}
                >
                  Remove
                </Button>
              </Typography>
            ))}
          </Box>

          <Typography variant="h5" gutterBottom my={2}>
            已加入的週線條件
          </Typography>
          <Box
            border="1px solid #000"
            borderRadius={1}
            p={2}
            minHeight={200}
            mb={2}
          >
            {weekPrompts.length === 0 && (
              <Typography variant="body2" gutterBottom>
                空
              </Typography>
            )}
            {weekPrompts.map((prompt, index) => (
              <Typography key={index} variant="body2" gutterBottom>
                {index + 1}. {Object.values(prompt).join("")}{" "}
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleWeekRemove(index)}
                >
                  Remove
                </Button>
              </Typography>
            ))}
          </Box>

          <Button
            onClick={handleCreate}
            fullWidth
            variant="contained"
            disabled={
              (prompts.length === 0 && weekPrompts.length === 0) || name === ""
            }
            color="success"
          >
            建立
          </Button>
        </Container>
      </Grid2>
    </Grid2>
  );
}
