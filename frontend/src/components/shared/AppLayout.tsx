import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-50">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
