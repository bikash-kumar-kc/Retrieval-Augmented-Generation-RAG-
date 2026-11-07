import { FileText, Leaf, LogOut, MessageSquare } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../components/ui/sidebar";
import { theme } from "../lib/theme";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { showToast } from "../components/reuseableComponents/Toast";

const NAV_ITEMS = [
  { label: "Documents", path: "/documents", icon: FileText },
  { label: "Chat", path: "/chat", icon: MessageSquare },
] as const;

/** Title + two links, collapsible to an icon rail. Nothing else lives here. */
export default function AppSidebar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    showToast.success("Logged out successfully.");
    navigate("/login", { replace: true });
  }

  return (
    <Sidebar collapsible="icon" className={`${theme.sidebarBorder} bg-gray-200`}>
      <SidebarHeader className={`${theme.sidebarBg} ${theme.pageText}`}>
        <div className="flex items-center justify-center gap-2 px-1 py-2 ">
          <span className="text-lg font-bold tracking-wider group-data-[collapsible=icon]:hidden ">
            GENERIC RAG
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className={`${theme.sidebarBg} ${theme.sidebarText}`}>
        <SidebarMenu className="flex flex-col gap-2 px-2 pt-2">
          {NAV_ITEMS.map(({ label, path, icon: Icon }) => (
            <SidebarMenuItem key={path}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(path)}
                tooltip={label}
                className={theme.sidebarNavButton}
              >
                <Link to={path}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="bg-white flex justify-start">
        <SidebarMenuButton
          tooltip={"Logout"}
          className="text-red-600 hover:bg-[#FEF2F2] transition-colors rounded-md"
          onClick={handleLogout}
        >
          <LogOut
            size={14}
            className="text-red-600 focus:bg-red-50 focus:text-red-700"
          />
          Logout
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
