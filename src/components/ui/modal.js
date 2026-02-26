"use client";

export default function Modal({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ui-modal-panel">
        <div className="ui-modal-header">
          <strong>{title}</strong>
          <button type="button" onClick={onClose} className="ui-modal-close">
            Close
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
