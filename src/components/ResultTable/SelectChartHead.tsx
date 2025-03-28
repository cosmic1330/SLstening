import { Box, Menu, MenuItem, Typography } from "@mui/material";
import useSchoiceStore, { ChartType } from "../../store/Schoice.store";
import { useState } from "react";

export default function SelectChartHead() {
  const { chartType, changeChartType } = useSchoiceStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlehandleMenuItemClick = (value: ChartType) => {
    handleClose();
    changeChartType(value);
  };
  return (
    <Box>
      <Typography component="span" onClick={handleClick}>
        {chartType}🔽
      </Typography>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        {Object.entries(ChartType).map(([key, value]) => (
          <MenuItem
            key={key}
            disabled={chartType === key}
            selected={chartType === key}
            onClick={() => handlehandleMenuItemClick(value)}
          >
            {value}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
