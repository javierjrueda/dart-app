"use client";

import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle,
  faInfoCircle,
  faExclamationTriangle,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: (id: string) => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    { id, title, description, type = "info", duration = 5000, onClose },
    ref
  ) => {
    React.useEffect(() => {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    const getIcon = () => {
      switch (type) {
        case "success":
          return faCheckCircle;
        case "error":
          return faTimesCircle;
        case "warning":
          return faExclamationTriangle;
        default:
          return faInfoCircle;
      }
    };

    const getColors = () => {
      switch (type) {
        case "success":
          return "bg-success-50 border-success-200 text-success-800";
        case "error":
          return "bg-error-50 border-error-200 text-error-800";
        case "warning":
          return "bg-warning-50 border-warning-200 text-warning-800";
        default:
          return "bg-neutral-50 border-neutral-200 text-neutral-800";
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-start gap-3 p-4 border rounded-lg shadow-lg backdrop-blur-sm",
          "animate-in slide-in-from-right-full duration-300",
          getColors()
        )}
      >
        <FontAwesomeIcon
          icon={getIcon()}
          className={cn(
            "mt-0.5 flex-shrink-0",
            type === "success" && "text-success-600",
            type === "error" && "text-error-600",
            type === "warning" && "text-warning-600",
            type === "info" && "text-neutral-600"
          )}
        />

        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold text-sm mb-1">{title}</div>}
          {description && (
            <div className="text-sm opacity-90">{description}</div>
          )}
        </div>

        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <FontAwesomeIcon icon={faTimes} className="text-sm" />
        </button>
      </div>
    );
  }
);

Toast.displayName = "Toast";

export { Toast };
export type { ToastProps };
