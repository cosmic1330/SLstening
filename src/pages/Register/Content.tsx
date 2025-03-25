import { useState } from "react";
import { TextField, Button, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
import translateError from "../../utils/translateError";

function Content() {
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  let navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const signUp = async () => {
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match!");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setErrorMsg(translateError(error.message));
    } else {
      console.log(data);
      alert("Registration Successful!");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <Box>
      <Box component="form" onSubmit={handleSubmit} width="100%">
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
          size="small"
        />
        <TextField
          fullWidth
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          required
          size="small"
        />
        <TextField
          fullWidth
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          margin="normal"
          required
          size="small"
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 2 }}
          size="small"
          disabled={loading || !email || !password || !confirmPassword}
          onClick={signUp}
        >
          Register
        </Button>
        <Typography color="error" align="center">
          {errorMsg}
        </Typography>
      </Box>
      <Typography
        textAlign="center"
        variant="body2"
        color="primary"
        mt={3}
        sx={{ cursor: "pointer", textDecoration: "underline" }}
        onClick={() => navigate("/")}
      >
        Already have an account? Sign in
      </Typography>
    </Box>
  );
}

export default Content;
