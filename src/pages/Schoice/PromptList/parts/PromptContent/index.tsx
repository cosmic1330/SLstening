import { Container, Grid2 } from "@mui/material";
import useSchoiceStore from "../../../../../store/Schoice.store";
import RuleContent from "../RuleContent";
import Null from "./Null";
import Result from "./Result";
import UnSelect from "./UnSelect";

export default function PromptContent() {
  const { select, dataCount } = useSchoiceStore();
  return dataCount === 0 ? (
    <Null />
  ) : select ? (
    <Container>
      <Grid2 container spacing={2}>
        <RuleContent {...{ select }} />
        <Result {...{ select }} />
      </Grid2>
    </Container>
  ) : (
    <UnSelect />
  );
}
