import SpeedIcon from "@mui/icons-material/Speed";
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

export default function CnnBox() {
  const handleClick = async () => {
    await openUrl("https://www.macromicro.me/charts/50108/cnn-fear-and-greed");
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <SpeedIcon />
          <Typography variant="button">CNN 恐懼貪婪指數</Typography>
        </Stack>
        <Button variant="text" color="inherit" onClick={handleClick}>
          查看詳情
        </Button>
      </Stack>
    </Box>
  );
}
