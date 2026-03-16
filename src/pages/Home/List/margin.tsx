import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Button,
  Box as MuiBox,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";

const Box = styled(MuiBox)`
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
  transition: all 0.2s ease-in-out;
`;

export default function MarginBox() {
  const handleClick = async () => {
    await openUrl("https://www.macromicro.me/charts/53117/taiwan-taiex-maintenance-margin");
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <TrendingUpIcon />
          <Typography variant="button">台股 融資維持率</Typography>
        </Stack>
        <Button variant="text" color="inherit" onClick={handleClick}>
          查看詳情
        </Button>
      </Stack>
    </Box>
  );
}
