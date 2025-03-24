import { useState } from "react";
import { supabase } from "../../supabase";

// 錯誤訊息翻譯
const translateError = (error: string) => {
  if (error.includes("invalid email")) return "電子郵件格式不正確";
  if (error.includes("email already in use")) return "該電子郵件已被註冊";
  if (error.includes("weak password"))
    return "密碼強度不足，請使用更複雜的密碼";
  if (error.includes("invalid login credentials")) return "電子郵件或密碼錯誤";
  return error;
};

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 註冊
  const signUp = async () => {
    setErrorMsg("");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) setErrorMsg(translateError(error.message));
    setUser(data?.user);
    setLoading(false);
  };

  // 登入
  const signIn = async () => {
    setErrorMsg("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setErrorMsg(translateError(error.message));
    setUser(data?.user);
    setLoading(false);
  };

  // 登出
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div>
      {user ? (
        <div>
          <h2>Welcome {user.email}</h2>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <input
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={signUp} disabled={loading}>
            Sign Up
          </button>
          <button onClick={signIn} disabled={loading}>
            Sign In
          </button>
          {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
        </div>
      )}
    </div>
  );
}
