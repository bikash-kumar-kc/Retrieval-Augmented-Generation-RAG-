
import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "../components/ui/sidebar";
import { TooltipProvider } from "../components/ui/tooltip";
import AppSidebar from "./AppSideBar";
import TopStrip from "./TopStrip";

/** 25% sidebar (never narrower than 16rem) + 75% main. SidebarInset is already a <main>, so the content wrapper is a div. */
export default function AppLayout() {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <AppSidebar />
        <SidebarInset>
          <TopStrip />
          <div className="min-h-screen w-full bg-gray-100! px-4 py-6 text-[#6b7280]! transition-all duration-200 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </SidebarInset>
      </TooltipProvider>
    </SidebarProvider>
  );
}
