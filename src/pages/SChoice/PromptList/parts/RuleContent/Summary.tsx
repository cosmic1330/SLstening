import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Typography from "@mui/material/Typography";
import { Prompts, PromptType } from "../../../../../store/Schoice.store";

export default function Summary({
  select,
}: {
  select: {
    id: string;
    name: string;
    value: Prompts;
    type: PromptType;
  };
}) {
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1-content"
        id="panel1-header"
      >
        <Typography component="span">策略內容</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {select.value.map((prompt, index) => (
          <Typography key={index} variant="body1">
            {index + 1}.
            {prompt.day1 +
              prompt.indicator1 +
              prompt.operator +
              prompt.day2 +
              prompt.indicator2}
          </Typography>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
