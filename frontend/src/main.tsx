import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <div className="min-h-dvh w-full flex items-center justify-center bg-black">
    <div className="w-full h-dvh max-w-[430px] max-h-[932px] overflow-hidden min-[431px]:rounded-[2.5rem] min-[431px]:border-[10px] min-[431px]:border-black min-[431px]:shadow-2xl">
      <App />
    </div>
  </div>
);
