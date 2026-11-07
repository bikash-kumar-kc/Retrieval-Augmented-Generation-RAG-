
import { toast, type ToastOptions } from "react-toastify"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"

const base: ToastOptions = {
  autoClose: 4000,
  hideProgressBar: true,
  closeOnClick: false,
  icon: false, // we render our own icon inline for layout control
}

function Content({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description?: string
}) {
  return (
   <div className="flex items-center gap-3 p-4 rounded-sm">
  <span className="shrink-0 flex items-center">{icon}</span>
  <div className="flex flex-col gap-1.5">
    <p className="text-sm font-medium leading-none">{title}</p>
    {description && <p className="text-sm text-muted-foreground leading-snug">{description}</p>}
  </div>
</div>

  )
}

export const showToast = {
  success: (title: string, description?: string, opts?: ToastOptions) =>
    toast.success(
      <Content icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} title={title} description={description} />,
      { ...base, ...opts }
    ),

  error: (title: string, description?: string, opts?: ToastOptions) =>
    toast.error(
      <Content icon={<XCircle className="h-4 w-4 text-red-600" />} title={title} description={description} />,
      { ...base, autoClose: 6000, ...opts }
    ),

  warning: (title: string, description?: string, opts?: ToastOptions) =>
    toast.warning(
      <Content icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />} title={title} description={description} />,
      { ...base, ...opts }
    ),

  info: (title: string, description?: string, opts?: ToastOptions) =>
    toast.info(
      <Content icon={<Info className="h-4 w-4 text-blue-600" />} title={title} description={description} />,
      { ...base, ...opts }
    ),
}