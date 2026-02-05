
import SpeedIcon from "@mui/icons-material/Speed";
import { Box as MuiBox, Stack, styled, Typography } from "@mui/material";

const Box = styled(MuiBox)`
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
`;

export default function CnnBox() {
  const handleClick = () => {
    window.open(
      "https://www.macromicro.me/charts/50108/cnn-fear-and-greed",
      "_blank"
    );
  };

  return (
    <Box onClick={handleClick}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <SpeedIcon />
          <Typography variant="button">CNN 恐懼貪婪指數</Typography>
        </Stack>
        <Typography variant="subtitle1" color="#fff">
          查看詳情
        </Typography>
      </Stack>
    </Box>
  );
}
