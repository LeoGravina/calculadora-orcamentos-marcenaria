// ARQUIVO ATUALIZADO: src/components/Modal.js

import React from 'react';

const Modal = ({ isOpen, onClose, onConfirm, title, children, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmButtonClass = 'btn-save' }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-back" onClick={onClose}>
                        {cancelText}
                    </button>
                    <button className={`btn ${confirmButtonClass}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;