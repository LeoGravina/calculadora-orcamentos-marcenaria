const Modal = ({ isOpen, onClose, onConfirm, title, children, confirmButtonClass, footer }) => {
    if (!isOpen) {
        return null;
    }

    return (
        // AQUI ESTÁ A MUDANÇA: Adicionamos a classe 'is-open' condicionalmente
        <div className={`modal-overlay ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    
                    <button type="button" onClick={onClose} className="modal-close-icon-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                <div className="modal-footer">
                    {footer ? (
                        footer
                    ) : (
                        <div className="modal-actions">
                            <button onClick={onClose} className="btn btn-secondary">
                                Cancelar
                            </button>
                            {onConfirm && (
                                <button onClick={onConfirm} className={`btn ${confirmButtonClass || 'btn-save'}`}>
                                    Confirmar
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;