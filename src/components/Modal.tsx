import React, { useEffect, useState, ReactNode } from "react";
import ReactDOM from "react-dom";
import { CloseIcon } from "./icons";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isOpen) {
      setShouldRender(true);
      document.body.style.overflow = "hidden";
    } else {
      timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = "";
      }, 200);
    }

    return () => {
      if (timer) clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onMouseDown={onClose}
    >
      <div
        className={`relative bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md transform transition-all duration-300 ease-out border border-gray-100 ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5 border-b-2 border-gray-50 pb-3 -mx-1">
          {title ? (
            <h3 className="text-xl font-extrabold text-gray-950 tracking-tight">
              {title}
            </h3>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="p-2 -mr-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <div className="w-5 h-5">
              <CloseIcon />
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="mt-2 text-gray-700 leading-relaxed space-y-3">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-7 pt-4 border-t border-gray-100 flex gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;