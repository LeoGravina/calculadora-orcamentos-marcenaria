import React, { useState } from 'react';
import { EditIcon, TrashIcon } from '../icons';
import { formatCurrency } from '../../utils/helpers';
import { maskCurrency, unmaskMoney, maskMeasure, unmaskNumber } from '../../utils/masks'; // <--- Importar
import Modal from '../Modal';

const SheetManager = ({ sheets, setSheets, catalogSheets }) => {
    const [activeTab, setActiveTab] = useState('select');
    const [manualForm, setManualForm] = useState({ name: '', price: '', length: '', width: '', id: null });
    const [actionModal, setActionModal] = useState({ isOpen: false, sheet: null });

    const handleManualSubmit = (e) => {
        e.preventDefault();
        
        // Limpa as máscaras antes de salvar
        const newSheet = {
            ...manualForm,
            price: unmaskMoney(manualForm.price),
            length: unmaskNumber(manualForm.length),
            width: unmaskNumber(manualForm.width),
            id: manualForm.id || crypto.randomUUID(),
            isLocal: true,
            isOverride: !!manualForm.id
        };

        if (manualForm.id) {
            setSheets(prev => prev.map(s => s.id === newSheet.id ? newSheet : s));
        } else {
            setSheets(prev => [...prev, newSheet]);
        }
        setManualForm({ name: '', price: '', length: '', width: '', id: null });
        setActiveTab('select');
    };

    const handleDelete = () => {
        setSheets(prev => prev.filter(s => s.id !== actionModal.sheet.id));
        setActionModal({ isOpen: false, sheet: null });
    };

    const handleEdit = () => {
        // Ao editar, reaplica as máscaras
        const s = actionModal.sheet;
        setManualForm({
            ...s,
            price: maskCurrency(s.price.toFixed(2)),
            length: maskMeasure(s.length, 'mm'),
            width: maskMeasure(s.width, 'mm')
        });
        setActiveTab('manual');
        setActionModal({ isOpen: false, sheet: null });
    };

    return (
        <div className="card">
            <h2 className="section-title">Chapas do Orçamento</h2>
            
            <div className="tabs-container">
                <button onClick={() => setActiveTab('select')} className={`tab-button ${activeTab === 'select' ? 'active' : ''}`}>Lista de Chapas</button>
                <button onClick={() => setActiveTab('manual')} className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}>+ Nova Chapa</button>
            </div>

            <div style={{marginTop: '1rem'}}>
                {activeTab === 'select' && (
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Nome</th><th>Preço</th><th>Medidas</th><th>Origem</th></tr></thead>
                            <tbody>
                                {sheets.map(s => (
                                    <tr key={s.id} onClick={() => setActionModal({ isOpen: true, sheet: s })}>
                                        <td>{s.name}</td>
                                        <td>{formatCurrency(s.price)}</td>
                                        <td>{s.length} x {s.width} mm</td>
                                        <td>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: s.isLocal ? '#e0f2fe' : '#f3f4f6', color: s.isLocal ? '#0369a1' : '#4b5563' }}>
                                                {s.isLocal ? 'Local' : 'Catálogo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {sheets.length === 0 && <tr><td colSpan="4" style={{textAlign:'center'}}>Nenhuma chapa adicionada.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'manual' && (
                    <form onSubmit={handleManualSubmit}>
                        <div className="form-grid-inputs-4">
                            <div className="form-group">
                                <label>Nome</label>
                                <input type="text" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} required placeholder="Ex: MDF Especial" />
                            </div>
                            <div className="form-group">
                                <label>Preço</label>
                                <input type="tel" value={manualForm.price} onChange={e => setManualForm({...manualForm, price: maskCurrency(e.target.value)})} required placeholder="R$ 0,00" />
                            </div>
                            <div className="form-group">
                                <label>Comp.</label>
                                <input type="tel" value={manualForm.length} onChange={e => setManualForm({...manualForm, length: maskMeasure(e.target.value, 'mm')})} required placeholder="0 mm" />
                            </div>
                            <div className="form-group">
                                <label>Larg.</label>
                                <input type="tel" value={manualForm.width} onChange={e => setManualForm({...manualForm, width: maskMeasure(e.target.value, 'mm')})} required placeholder="0 mm" />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-save" style={{marginTop: '1rem', width: '100%'}}>{manualForm.id ? 'Atualizar' : 'Adicionar'}</button>
                    </form>
                )}
            </div>

            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, sheet: null })} title={`Opções: ${actionModal.sheet?.name}`} footer={<button onClick={() => setActionModal({ isOpen: false, sheet: null })} className="btn btn-secondary" style={{width:'100%'}}>Fechar</button>}>
                <div className="action-menu-grid">
                    {actionModal.sheet?.isLocal && <button onClick={handleEdit} className="btn-action-menu edit"><EditIcon /> <span>Editar Chapa</span></button>}
                    <button onClick={handleDelete} className="btn-action-menu delete"><TrashIcon /> <span>Remover do Orçamento</span></button>
                </div>
            </Modal>
        </div>
    );
};

export default SheetManager;