import React, { useRef, useState } from 'react';
import { EditIcon, TrashIcon } from '../icons';
import { formatCurrency } from '../../utils/helpers';
import { maskMeasure, unmaskNumber } from '../../utils/masks'; // Importar máscaras
import Modal from '../Modal';

const PieceManager = ({ pieces, setPieces, sheets, pieceForm, setPieceForm, initialPieceForm, onEdit, onDelete }) => {
    const formRef = useRef(null);
    const [actionModal, setActionModal] = useState({ isOpen: false, piece: null });

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Aplica máscaras conforme o campo
        let val = value;
        if (name === 'length' || name === 'width') val = maskMeasure(value, 'mm');
        if (name === 'qty') val = maskMeasure(value, 'un');
        
        setPieceForm(p => ({ ...p, [name]: val }));
    };

    const toggleEdge = (edge) => setPieceForm(prev => ({ ...prev, [edge]: !prev[edge] }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!pieceForm.sheetId) return alert("Selecione uma chapa.");
        
        // Limpa as máscaras para salvar no array de peças como números reais
        const finalPiece = {
            ...pieceForm,
            length: unmaskNumber(pieceForm.length),
            width: unmaskNumber(pieceForm.width),
            qty: unmaskNumber(pieceForm.qty),
            id: pieceForm.id || crypto.randomUUID()
        };

        if (pieceForm.id) {
            setPieces(prev => prev.map(p => p.id === pieceForm.id ? finalPiece : p));
        } else {
            setPieces(prev => [...prev, finalPiece]);
        }
        
        // Reseta o form (mas mantém a chapa selecionada para agilizar)
        setPieceForm({ ...initialPieceForm, sheetId: pieceForm.sheetId });
    };

    const handleModalEdit = () => {
        // Ao editar, reaplicar máscaras para exibir bonito no input
        let p = { ...actionModal.piece };
        p.length = maskMeasure(p.length, 'mm');
        p.width = maskMeasure(p.width, 'mm');
        p.qty = maskMeasure(p.qty, 'un');
        
        onEdit(p);
        formRef.current.scrollIntoView({ behavior: 'smooth' });
        setActionModal({ isOpen: false, piece: null });
    };

    const handleModalDelete = () => {
        onDelete(actionModal.piece.id);
        setActionModal({ isOpen: false, piece: null });
    };

    return (
        <div className="card" ref={formRef}>
            <h2 className="section-title">2. Peças de Madeira</h2>
            
            <form onSubmit={handleSubmit} className="piece-form-mobile">
                <div className="form-group">
                    <label>Chapa / Material</label>
                    <select name="sheetId" value={pieceForm.sheetId} onChange={handleChange} required className="form-input-style">
                        <option value="">-- Selecione uma chapa --</option>
                        {sheets.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Nome da Peça</label>
                    <input type="text" name="name" value={pieceForm.name} onChange={handleChange} placeholder="Ex: Porta" required />
                </div>
                <div className="form-row-mobile">
                    <div className="form-group half">
                        <label>Comp. (mm)</label>
                        <input type="tel" name="length" value={pieceForm.length} onChange={handleChange} required placeholder="0 mm" />
                    </div>
                    <div className="form-group half">
                        <label>Larg. (mm)</label>
                        <input type="tel" name="width" value={pieceForm.width} onChange={handleChange} required placeholder="0 mm" />
                    </div>
                    <div className="form-group half">
                        <label>Qtd.</label>
                        <input type="tel" name="qty" value={pieceForm.qty} onChange={handleChange} required placeholder="1 un" />
                    </div>
                </div>

                {/* SELETOR VISUAL (MANTIDO IGUAL) */}
                <div className="edge-banding-selector">
                    <label className="subsection-title" style={{fontSize: '0.9rem', marginBottom: '10px', display:'block', fontWeight: 700, color: 'var(--text-muted)'}}>
                        Fita de Borda (Toque nos lados):
                    </label>
                    <div className="visual-selector-container">
                        <span className="selector-label-text label-top">LARGURA</span>
                        <span className="selector-label-text label-left">COMPRIMENTO</span>
                        <div className="piece-visual-selector">
                            <div className="edge-corner tl"></div><div className="edge-corner tr"></div><div className="edge-corner bl"></div><div className="edge-corner br"></div>
                            <div className={`edge-segment top ${pieceForm.bandW1 ? 'active' : ''}`} onClick={() => toggleEdge('bandW1')}></div>
                            <div className={`edge-segment left ${pieceForm.bandL1 ? 'active' : ''}`} onClick={() => toggleEdge('bandL1')}></div>
                            <div className="piece-center"></div>
                            <div className={`edge-segment right ${pieceForm.bandL2 ? 'active' : ''}`} onClick={() => toggleEdge('bandL2')}></div>
                            <div className={`edge-segment bottom ${pieceForm.bandW2 ? 'active' : ''}`} onClick={() => toggleEdge('bandW2')}></div>
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn btn-add" style={{width: '100%'}}>{pieceForm.id ? 'Atualizar Peça' : '+ Adicionar Peça'}</button>
            </form>

            <div className="items-list-container" style={{marginTop: '1.5rem'}}>
                <div className="table-container desktop-only-table">
                    <table>
                        <thead><tr><th>Peça</th><th>Medidas</th><th>Fitas</th><th>Qtd</th><th>Valor Total</th></tr></thead>
                        <tbody>
                            {pieces.map(p => (
                                <tr key={p.id} onClick={() => setActionModal({ isOpen: true, piece: p })} title="Toque para opções">
                                    <td>{p.name}</td>
                                    <td>{p.length} x {p.width} mm</td>
                                    <td>{(p.bandL1||p.bandL2?'C ':'') + (p.bandW1||p.bandW2?'L':'')}</td>
                                    <td>{p.qty}</td>
                                    <td>{formatCurrency(p.totalCost || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mobile-only-cards">
                    {pieces.map(p => (
                        <div className="item-card" key={p.id} onClick={() => setActionModal({ isOpen: true, piece: p })}>
                            <div className="item-card-header">
                                <strong>{p.name}</strong>
                                <span className="item-qty">x{p.qty}</span>
                            </div>
                            <div className="item-card-body">
                                <span>{p.length} x {p.width} mm</span>
                                <span>Fitas: {(p.bandL1 || p.bandL2 ? 'C ' : '') + (p.bandW1 || p.bandW2 ? 'L' : '')}</span>
                            </div>
                            <div className="item-card-footer" style={{justifyContent: 'space-between', color: 'var(--text-main)'}}>
                                <span>Total: {formatCurrency(p.totalCost || 0)}</span>
                                <span style={{color: 'var(--primary)', fontSize:'0.8rem'}}>Opções</span>
                            </div>
                        </div>
                    ))}
                </div>
                {pieces.length === 0 && <p style={{textAlign:'center', color:'#999', padding: '1rem'}}>Nenhuma peça adicionada ainda.</p>}
            </div>

            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, piece: null })} title={`Opções: ${actionModal.piece?.name}`} footer={<button onClick={() => setActionModal({ isOpen: false, piece: null })} className="btn btn-secondary" style={{width:'100%'}}>Fechar</button>}>
                <div className="action-menu-grid">
                    <button onClick={handleModalEdit} className="btn-action-menu edit"><EditIcon /> <span>Editar Peça</span></button>
                    <button onClick={handleModalDelete} className="btn-action-menu delete"><TrashIcon /> <span>Excluir Peça</span></button>
                </div>
            </Modal>
        </div>
    );
};

export default PieceManager;