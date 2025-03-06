import {
  Box,
  Button,
  Container,
  Grid2,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import useSchoiceStore, { Prompts } from "../../../store/Schoice.store";
import ExpressionGenerator from "../parts/ExpressionGenerator";
import PromptName from "../parts/PromptName";

export default function PromptEdit() {
  const { id } = useParams();
  const { edit, select, selectObj } = useSchoiceStore();
  const [prompts, setPrompts] = useState<Prompts>(select?.value || []);
  const [name, setName] = useState(select?.name || "");
  const navigate = useNavigate();

  const handleEdit = async () => {
    if (id && select) {
      await edit(id, name, prompts, select.type);
      selectObj(id, select.type);
      navigate("/schoice");
    }
  };

  const handleRemove = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    navigate("/schoice");
  };
  if (!select)
    return (
      <Typography variant="h5" gutterBottom>
        找不到資料
      </Typography>
    );
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
            {select?.type} Name
          </Typography>
          <Typography variant="body2" gutterBottom>
            {id}
          </Typography>
          <PromptName {...{ name, setName }} />

          <ExpressionGenerator {...{ setPrompts }} />
        </Container>
      </Grid2>
      <Grid2 size={6}>
        <Container>
          <Typography variant="h5" gutterBottom my={2}>
            已加入的條件
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
                {index + 1}. {prompt.day1+prompt.indicator1+prompt.operator+prompt.day2+prompt.indicator2}{" "}
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
          <Stack direction="row" spacing={2}>
            <Button
              onClick={handleCancel}
              fullWidth
              variant="contained"
              color="error"
            >
              取消
            </Button>
            <Button
              onClick={handleEdit}
              fullWidth
              variant="contained"
              disabled={prompts.length === 0 || name === ""}
              color="success"
            >
              修改
            </Button>
          </Stack>
        </Container>
      </Grid2>
    </Grid2>
  );
}
