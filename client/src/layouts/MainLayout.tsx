import { Outlet } from "react-router-dom";
import Navbar from "@/components/common/Navbar";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
