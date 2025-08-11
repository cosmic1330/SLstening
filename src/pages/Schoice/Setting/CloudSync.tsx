import CloudIcon from '@mui/icons-material/Cloud';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import useDatabase from "../../../hooks/useDatabase";

const CloudSync: React.FC = () => {
  const [updateAt, setUpdateAt] = useState("N/A");
  const db = useDatabase();

  const handleSync = async () => {};

  return (
    <Grid size={12}>
      <Card sx={{ height: "100%" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
            <CloudIcon sx={{ color: "white" }} />
            <Typography variant="h6" fontWeight="bold">
              雲端同步
            </Typography>
          </Stack>

          <Stack
            direction="row"
            alignItems="flex-end"
            justifyContent="space-between"
            spacing={1}
            mt={2}
          >
            <Box>
              <Typography variant="body2" gutterBottom>上次更新時間 {updateAt}</Typography>
              <Button variant="contained" color="primary" onClick={handleSync}>
                同步本地資料到雲端
              </Button>
            </Box>
            <Box>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setUpdateAt(new Date().toLocaleString())}
              >
                雲端鏡像到本地
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default CloudSync;
