import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router";
import Home from "./pages/Home";
import About from "./pages/about";
import List from "./pages/Home/list";
import Other from "./pages/Home/other";
import Login from "./pages/login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Login />} />
        <Route path="about" element={<About />} />
        <Route path="dashboard" element={<Home />}>
          <Route index element={<List />} />
          <Route path="other" element={<Other />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
