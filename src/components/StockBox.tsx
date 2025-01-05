import { Box as MuiBox, styled, Typography } from "@mui/material";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import useDeals from "../hooks/useDeals";
import useMa5Deduction from "../hooks/useMa5Deduction";

const Box = styled(MuiBox)`
  background-color: #555;
  color: #fff;
  padding: 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
`;
export default function StockBox({ id }: { id: string }) {
  const { deals, name } = useDeals(id);
  const { ma5_deduction_time, ma5_deduction_value, ma5 } =
    useMa5Deduction(deals);
  const lastPrice = deals.length > 0 ? deals[deals.length - 1].c : 0;

  const openDetailWindow = async () => {
    const webview = new WebviewWindow("detail", {
      title: id+" "+name,
      url: `/detail/${id}`,
    });
    webview.once("tauri://created", function () {});
    webview.once("tauri://error", function (e) {
      console.log(e);
    });
  };

  return (
    <Box onClick={openDetailWindow}>
      <Typography variant="body2" gutterBottom>
        [{id} {name}] {lastPrice}
      </Typography>
      <Typography variant="body2" gutterBottom>
        {"[ma5] "}
        <Typography
          variant="body2"
          component="span"
          color={lastPrice < ma5 ? "error" : "#fff"}
        >
          {ma5}
        </Typography>
      </Typography>
      <Typography variant="body2" gutterBottom>
        {"[ma5 deduction] "}
        <Typography
          variant="body2"
          component="span"
          color={lastPrice < ma5_deduction_value ? "error" : "#fff"}
        >
          {ma5_deduction_value} / {ma5_deduction_time}
        </Typography>
      </Typography>
      <Typography variant="body2" gutterBottom>
        {"[pre low] "}
        <Typography
          variant="body2"
          component="span"
          color={
            deals.length > 0 && lastPrice < deals[deals.length - 2].l
              ? "error"
              : "#fff"
          }
        >
          {deals.length > 0 && deals[deals.length - 2].l}
        </Typography>
      </Typography>
    </Box>
  );
}
