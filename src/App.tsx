import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";
import About from "./pages/About";
import Home from "./pages/Home";
import List from "./pages/Home/List";
import Other from "./pages/Home/Other";
import Login from "./pages/Login";
import Obv from "./pages/Detail/Obv";
import Detail from "./pages/Detail";

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
        <Route path="detail/:id" element={<Detail />}>
          <Route index element={<Obv />} />
          <Route path="obv" element={<Obv />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
