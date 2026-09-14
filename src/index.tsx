import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initClarity } from "./lib/clarity";

initClarity();

createRoot(document.getElementById("root")!).render(<App />);

// Fade out the HTML boot splash once React has painted its first frame.
// Two animation frames so the fade starts after the first commit.
const splash = document.getElementById("boot-splash");
if (splash) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      splash.classList.add("is-done");
      window.setTimeout(() => splash.remove(), 450);
    })
  );
}
