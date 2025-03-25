import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "react";
import { useNavigate } from "react-router";
import useStocksStore from "../../store/Stock.store";
import { supabase } from "../../supabase";
import translateError from "../../utils/translateError";

const Content = () => {
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { alwaysOnTop } = useStocksStore();
  let navigate = useNavigate();

  const signIn = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(translateError(error.message));
      } else {
        console.log(data);
        getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
        navigate("/dashboard");
      }
    } catch (e) {
      console.error("Error signing in:", e);
    }
    setLoading(false);
  };

  const register = async () => {
    navigate("/register");
  };

  return (
    <Box component="form">
      <Typography variant="h4" align="center" gutterBottom>
        <img src="tauri.svg" alt="logo" style={{ width: "33%" }} />
      </Typography>

      <Box width="100%">
        <TextField
          fullWidth
          size="small"
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          size="small"
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          required
        />
        <Stack direction="row" spacing={2}>
          <Button
            onClick={register}
            disabled={loading}
            fullWidth
            size="small"
            color="warning"
            variant="contained"
          >
            Register
          </Button>
          <Button
            type="submit"
            onClick={signIn}
            disabled={loading || !email || !password}
            fullWidth
            size="small"
            variant="contained"
          >
            Sign In
          </Button>
        </Stack>
        <Typography color="error" align="center">
          {errorMsg}
        </Typography>
      </Box>
    </Box>
  );
};

export default Content;
