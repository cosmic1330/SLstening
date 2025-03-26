import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PostAddIcon from "@mui/icons-material/PostAdd";
import { useState } from "react";
import { toast } from "react-toastify";
import useSchoiceStore from "../store/Schoice.store";

export default function InsertRuleButton() {
  const [open, setOpen] = useState(false);
  const [json, setJson] = useState("");
  const { increase } = useSchoiceStore();

  const handleInsert = () => {
    try {
      const data = JSON.parse(json);
      if (data.id && data.name && data.value && data.type) {
        increase(data.name, data.value, data.type);
        toast.success("Insert success");
        setOpen(false);
      } else {
        toast.error(
          `缺少必要欄位，請檢查是否包含 id, name, type, value.daily, value.weekly`
        );
      }
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error(`不符合JSON格式`);
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setJson("");
  };

  return (
    <Box>
      <Tooltip title="加入複製的策略" placement="right" arrow>
        <IconButton
          onClick={() => {
            setOpen(true);
          }}
        >
          <PostAddIcon />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={handleCancel}>
        <DialogTitle>
          <Typography variant="h6">Insert Rule</Typography>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            rule data need to be in JSON format
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button size="small" color="inherit" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="small" onClick={handleInsert}>
            Insert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
