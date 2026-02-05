import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { CategoryType } from "../../../../types";
import { CommandInput } from "../styles";

interface ManageDialogsProps {
  categories: CategoryType[];
  isAddOpen: boolean;
  isManageOpen: boolean;
  onAddClose: () => void;
  onManageClose: () => void;
  onAddCategory: (name: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onRemoveCategory: (id: string) => void;
}

export default function ManageDialogs({
  categories,
  isAddOpen,
  isManageOpen,
  onAddClose,
  onManageClose,
  onAddCategory,
  onRenameCategory,
  onRemoveCategory,
}: ManageDialogsProps) {
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCreate = () => {
    if (newCatName.trim()) {
      onAddCategory(newCatName.trim());
      setNewCatName("");
      onAddClose();
    }
  };

  const handleRename = () => {
    if (editingCat && editingCat.name.trim()) {
      onRenameCategory(editingCat.id, editingCat.name.trim());
      setEditingCat(null);
    }
  };

  return (
    <>
      <Dialog
        open={isAddOpen}
        onClose={onAddClose}
        PaperProps={{
          sx: {
            background: "#0f172a",
            color: "white",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>
          建立全新自選分類
        </DialogTitle>
        <DialogContent>
          <CommandInput
            autoFocus
            fullWidth
            label="分類名稱"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCreate()}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 1 }}>
          <Button onClick={onAddClose} sx={{ color: "rgba(255,255,255,0.5)" }}>
            取消
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            sx={{
              background: "#10b981",
              borderRadius: "12px",
              px: 4,
              "&:hover": { background: "#059669" },
            }}
          >
            建立
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isManageOpen}
        onClose={onManageClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: "#0f172a",
            color: "white",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.1)",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>自選分類管理</DialogTitle>
        <DialogContent>
          <List sx={{ mt: 1 }}>
            {categories.map((c) => (
              <ListItem
                key={c.id}
                sx={{
                  mb: 1.5,
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "16px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  pr: 7,
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => onRemoveCategory(c.id)}
                    sx={{ color: "#f43f5e" }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                {editingCat?.id === c.id ? (
                  <TextField
                    autoFocus
                    fullWidth
                    variant="standard"
                    value={editingCat.name}
                    onChange={(e) =>
                      editingCat &&
                      setEditingCat({ ...editingCat, name: e.target.value })
                    }
                    onBlur={handleRename}
                    onKeyPress={(e) => e.key === "Enter" && handleRename()}
                    InputProps={{
                      disableUnderline: true,
                      sx: { color: "white", fontWeight: 600, py: 0.5 },
                    }}
                  />
                ) : (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ flex: 1, py: 1 }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 600,
                        flex: 1,
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setEditingCat({ id: c.id, name: c.name })}
                      sx={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Stack>
                )}
              </ListItem>
            ))}
            {categories.length === 0 && (
              <Typography
                variant="body2"
                sx={{ opacity: 0.5, textAlign: "center", py: 3 }}
              >
                目前沒有任何分類
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={onManageClose}
            sx={{ color: "rgba(255,255,255,0.5)" }}
          >
            關閉
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
