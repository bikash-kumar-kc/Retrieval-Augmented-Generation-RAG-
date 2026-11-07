import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui/dropdown-menu";


export type GenericDropdownAction<T> = {
  actionName: string;
  method: () => void | Promise<void>;
  variant?: "default" | "destructive";
  /** when set, the action is NOT run directly; onConfirm receives it so a dialog can ask first */
  confirmMessage?: string;
  data?: T;
};

type GenericDropdownProps<T> = {
  actions: GenericDropdownAction<T>[];
  onConfirm: (action: GenericDropdownAction<T>) => void;
  disabled?: boolean;
};

export function GenericDropdown<T>({ actions, onConfirm, disabled }: GenericDropdownProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          onClick={(e) => e.stopPropagation()}
          aria-label="Row actions"
          className="rounded-sm p-1.5 text-[#171717] hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b6d11] disabled:opacity-50 "
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="border-[#e5e7eb] bg-[#F5F5F5] px-2 py-3 text-[#171717]">
        {actions.map((action, idx) => (
          <DropdownMenuItem
            key={action.actionName}
            onClick={(e) => {
              e.stopPropagation();
              if (action.confirmMessage) onConfirm(action);
              else void action.method();
            }}
            className={
              action.variant === "destructive"
                ? `text-red-600 focus:bg-red-100 focus:text-red-700 ${idx !== 0 ? "mt-2" : "mt-0"}`
                : `focus:bg-[#eaf2e1] focus:text-[#3b6d11] ${idx !== 0 ? "mt-2" : "mt-0"}`
            }
          >
            {action.actionName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
