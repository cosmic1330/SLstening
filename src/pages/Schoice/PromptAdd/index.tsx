import { Box, Button, Container, Grid2, Typography } from "@mui/material";
import { nanoid } from "nanoid";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import useSchoiceStore from "../../../store/Schoice.store";
import { Prompts, PromptType } from "../../../types";
import ExpressionGenerator from "../parts/ExpressionGenerator";
import PromptName from "../parts/PromptName";

export default function PromptAdd() {
  const { increase, selectObj } = useSchoiceStore();
  const [fundamentalPrompts, setFundamentalPrompts] = useState<Prompts>([]);
  const [hourlyPrompts, setHourlyPrompts] = useState<Prompts>([]);
  const [dailyPrompts, setDailyPrompts] = useState<Prompts>([]);
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
        fundamental: fundamentalPrompts,
        hourly: hourlyPrompts,
        daily: dailyPrompts,
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

  const handleRemove = (type: "fundamental" | "hourly" | "daily" | "weekly", index: number) => {
    switch (type) {
      case "fundamental":
        setFundamentalPrompts(fundamentalPrompts.filter((_, i) => i !== index));
        break;
      case "hourly":
        setHourlyPrompts(hourlyPrompts.filter((_, i) => i !== index));
        break;
      case "daily":
        setDailyPrompts(dailyPrompts.filter((_, i) => i !== index));
        break;
      case "weekly":
        setWeekPrompts(weekPrompts.filter((_, i) => i !== index));
        break;
    }
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
            {...{
              promptType,
              setFundamentalPrompts,
              setHourlyPrompts,
              setDailyPrompts,
              setWeekPrompts,
            }}
          />
        </Container>
      </Grid2>
      <Grid2 size={6}>
        <Container>
        <Typography variant="h5" gutterBottom my={2}>
            已加入的基本面
          </Typography>
          <Box
            border="1px solid #000"
            borderRadius={1}
            p={2}
            mb={2}
          >
            {fundamentalPrompts.length === 0 && (
              <Typography variant="body2" gutterBottom>
                空
              </Typography>
            )}
            {fundamentalPrompts.map((prompt, index) => (
              <Typography key={index} variant="body2" gutterBottom>
                {index + 1}. {Object.values(prompt).join("")}{" "}
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleRemove("fundamental", index)}
                >
                  Remove
                </Button>
              </Typography>
            ))}
          </Box>
          <Typography variant="h5" gutterBottom my={2}>
            已加入的小時線條件
          </Typography>
          <Box
            border="1px solid #000"
            borderRadius={1}
            p={2}
            mb={2}
          >
            {hourlyPrompts.length === 0 && (
              <Typography variant="body2" gutterBottom>
                空
              </Typography>
            )}
            {hourlyPrompts.map((prompt, index) => (
              <Typography key={index} variant="body2" gutterBottom>
                {index + 1}. {Object.values(prompt).join("")}{" "}
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleRemove("hourly", index)}
                >
                  Remove
                </Button>
              </Typography>
            ))}
          </Box>

          <Typography variant="h5" gutterBottom my={2}>
            已加入的日線條件
          </Typography>
          <Box
            border="1px solid #000"
            borderRadius={1}
            p={2}
            mb={2}
          >
            {dailyPrompts.length === 0 && (
              <Typography variant="body2" gutterBottom>
                空
              </Typography>
            )}
            {dailyPrompts.map((prompt, index) => (
              <Typography key={index} variant="body2" gutterBottom>
                {index + 1}. {Object.values(prompt).join("")}{" "}
                <Button
                  size="small"
                  color="error"
                  onClick={() => handleRemove("daily", index)}
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
                  onClick={() => handleRemove("weekly", index)}
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
              (
                fundamentalPrompts.length === 0 &&
                hourlyPrompts.length === 0 &&
                dailyPrompts.length === 0 &&
                weekPrompts.length === 0) ||
              name === ""
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
