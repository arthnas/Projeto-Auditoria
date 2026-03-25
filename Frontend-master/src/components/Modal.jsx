import React, { useEffect } from "react";
import "./modal.css";

export default function Modal({ children, onClose, contentStyle, size = "md" }) {
  const sizeClass = size === "sm" || size === "lg" ? `modal-${size}` : "modal-md";

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return (
    <div className="app-modal-overlay">
      <div className={`modal-box ${sizeClass}`} style={contentStyle}>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
