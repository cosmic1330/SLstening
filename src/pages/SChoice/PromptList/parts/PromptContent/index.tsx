import { Container, Grid2 } from "@mui/material";
import useSchoiceStore from "../../../../../store/Schoice.store";
import RuleContent from "../RuleContent";
import Null from "./Null";
import Result from "./Result";

export default function PromptContent() {
  const { select } = useSchoiceStore();
  return select ? (
    <Container>
      <Grid2 container spacing={2}>
        <RuleContent {...{ select }} />
        <Result {...{ select }} />
      </Grid2>
    </Container>
  ) : (
    <Null />
  );
}
