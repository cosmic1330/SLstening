import { Container, Grid2 } from "@mui/material";
import useSchoiceStore from "../../../../../store/Schoice.store";
import Null from "./Null";
import Result from "./Result";
import Rule from "./Rule";

export default function PromptContent() {
  const { select } = useSchoiceStore();
  return select ? (
    <Container>
      <Grid2 container>
        <Grid2 size={6}>
          <Rule {...{ select }} />
        </Grid2>
        <Grid2 size={6}>
          <Result {...{ select }} />
        </Grid2>
      </Grid2>
    </Container>
  ) : (
    <Null />
  );
}
