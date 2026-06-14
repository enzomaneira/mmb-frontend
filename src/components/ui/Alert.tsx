type AlertType = "success" | "error" | "info";

interface AlertProps {
  type?: AlertType;
  message: string;
  onClose?: () => void;
}

const styles: Record<AlertType, string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

export function Alert({ type = "info", message, onClose }: AlertProps) {
  if (!message) return null;

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${styles[type]}`}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-lg leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
