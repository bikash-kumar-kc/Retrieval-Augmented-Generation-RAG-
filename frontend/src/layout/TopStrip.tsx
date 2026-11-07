import { SidebarTrigger } from "../components/ui/sidebar";

export default function TopStrip() {
  return (
    <header className={`sticky top-0 z-10  bg-gray-100`}>
      <SidebarTrigger className="text-[#6b7280] hover:bg-[#eaf2e1] hover:text-[#3b6d11]" />
    </header>
  );
}
