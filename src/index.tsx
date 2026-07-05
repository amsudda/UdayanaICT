import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initClarity } from "./lib/clarity";

initClarity();

createRoot(document.getElementById("root")!).render(<App />);
