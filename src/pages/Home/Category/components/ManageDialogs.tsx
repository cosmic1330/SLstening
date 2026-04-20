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

  const paperStyles = {
    background: "#FAF3E0", // 古紙色
    color: "#5D4037", // 深木棕
    borderRadius: "24px",
    border: "2px solid #5D4037",
    boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
    backgroundImage: "none",
  };

  return (
    <>
      <Dialog
        open={isAddOpen}
        onClose={onAddClose}
        PaperProps={{ sx: paperStyles }}
      >
        <DialogTitle sx={{ fontWeight: 900, pt: 4, color: "#5D4037" }}>
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
          <Button 
            onClick={onAddClose} 
            sx={{ 
              color: "#8B7355", 
              fontWeight: 800,
              textDecoration: "underline",
              "&:hover": { background: "transparent", color: "#5D4037" }
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            sx={{
              background: "#3D5A45", // 森林綠
              color: "#F1E5AC",
              borderRadius: "12px",
              px: 4,
              fontWeight: 900,
              border: "2px solid #2D4A35",
              boxShadow: "0 4px 0 #2D4A35",
              "&:hover": { 
                background: "#3D5A45",
                transform: "translateY(2px)",
                boxShadow: "0 2px 0 #2D4A35",
              },
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
        PaperProps={{ sx: paperStyles }}
      >
        <DialogTitle sx={{ fontWeight: 900, pt: 4, color: "#5D4037" }}>
          自選分類管理
        </DialogTitle>
        <DialogContent>
          <List sx={{ mt: 1 }}>
            {categories.map((c) => (
              <ListItem
                key={c.id}
                sx={{
                  mb: 1.5,
                  background: "rgba(93, 64, 55, 0.05)",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(93, 64, 55, 0.1)",
                  pr: 7,
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => onRemoveCategory(c.id)}
                    sx={{ color: "#D2691E" }}
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
                      sx: { color: "#5D4037", fontWeight: 800, py: 0.5 },
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
                        fontWeight: 800,
                        flex: 1,
                        color: "#5D4037",
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
                      sx={{ color: "#8B7355" }}
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
                sx={{ color: "#8B7355", textAlign: "center", py: 3, fontWeight: 700, fontStyle: "italic" }}
              >
                目前沒有任何分類
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 4, pt: 1 }}>
          <Button
            onClick={onManageClose}
            sx={{ 
              color: "#5D4037", 
              fontWeight: 900,
              border: "2px solid #5D4037",
              borderRadius: "10px",
              px: 3,
              "&:hover": { background: "rgba(93, 64, 55, 0.05)" }
            }}
          >
            關閉
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
