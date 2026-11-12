import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { CreateTaskPage } from "./pages/CreateTaskPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TaskDetailsPage } from "./pages/TaskDetailsPage";

export function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/create" element={<CreateTaskPage />} />
            <Route path="/tasks/:id" element={<TaskDetailsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-900/80 py-5 text-center text-xs text-slate-500">
          DeadlineProof · BOT Chain Testnet (Chain ID 968) ·{" "}
          <a
            href="https://scan.bohr.life/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-cyan-300"
          >
            BOTScan Explorer
          </a>{" "}
          ·{" "}
          <a
            href="https://faucet.botchain.ai/basic"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-cyan-300"
          >
            tBOT Faucet
          </a>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;

