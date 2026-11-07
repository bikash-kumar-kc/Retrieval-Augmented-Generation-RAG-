/**
 * The design tokens, written as Tailwind arbitrary-value utilities so nothing needs to be
 * defined in global CSS. Full class names must stay literal so Tailwind can see them.
 */
export const theme = {
  // App shell
  pageBg: "bg-[#f5f9f0]",
  pageText: "text-[#171717]",
  mutedText: "text-[#6b7280]",
  mutedTextHover: "hover:text-[#4f545e]",
  border: "border-[#e5e7eb]",
  hoverBg: "hover:bg-[#f5f5f5]",

  // Sidebar
  sidebarBg: "bg-white",
  sidebarBorder: "border-[oklch(0.922_0_0)]",
  sidebarText: "text-[#6b7280]",
  sidebarNavButton:
    "h-10 rounded-md px-3 text-[15px] text-[#6b7280] hover:bg-[#F5F5F5] hover:text-[#3b6d11] " +
    "data-[active=true]:bg-[#1E293B] data-[active=true]:text-white " +
    "data-[active=true]:hover:bg-[#334155] data-[active=true]:hover:text-gray-200 transition-colors",

  // Header / top strip
  headerBg: "bg-transparent",
  headerBorder: "border-[#f1f1f1]",
  headerText: "text-[#171717]",

  // Brand
  brandBg: "bg-[#3b6d11]",
  brandSoftBg: "bg-[#eaf2e1]",
  brandText: "text-[#3b6d11]",

  // Surfaces
  card: "rounded-md shadow-md hover:shadow-lg border border-[#e5e7eb] bg-white transition-all",
  primaryButton: "bg-[#3b6d11] text-white hover:bg-[#2f5a0d]",
} as const;
