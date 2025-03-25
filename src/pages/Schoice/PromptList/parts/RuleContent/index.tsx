import ContentPasteGoRoundedIcon from "@mui/icons-material/ContentPasteGoRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useNavigate } from "react-router";
import { Prompts, PromptType } from "../../../../../store/Schoice.store";
import Summary from "./Summary";

export default function RuleContent({
  select,
}: {
  select: {
    id: string;
    name: string;
    value: {
      daily: Prompts;
      weekly: Prompts;
    };
    type: PromptType;
  };
}) {
  const navigate = useNavigate();

  const handleCopy = async () => {
    try {
      await writeText(JSON.stringify(select));
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
      if (permissionGranted) {
        sendNotification({ title: "ClipBoard", body: "Copy Success!" });
      }
    } catch (err) {
      console.error("複製失敗:", err);
    }
  };

  return (
    <Stack spacing={2} alignItems="flex-start">
      <Typography variant="h4">{select && select.name}</Typography>
      <Stack direction="row" spacing={2}>
        <Tooltip title="修改策略條件">
          <IconButton onClick={() => navigate("/schoice/edit/" + select?.id)}>
            <EditRoundedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="複製策略條件">
          <IconButton onClick={handleCopy}>
            <ContentPasteGoRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      
      <Summary select={select} />
    </Stack>
  );
}
