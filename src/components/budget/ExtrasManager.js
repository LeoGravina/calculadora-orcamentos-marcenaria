import React, { useState } from 'react';
import { EditIcon, TrashIcon } from '../icons';
import { formatCurrency } from '../../utils/helpers';
import { maskCurrency, unmaskMoney, maskMeasure, unmaskNumber } from '../../utils/masks'; // <--- Importar Máscaras
import Modal from '../Modal';

const MaterialSection = ({ title, items, setItems, catalogItems, typeLabel, formFields }) => {
    const [activeTab, setActiveTab] = useState('catalog');
    const [form, setForm] = useState({ id: null, catalogId: '', qty: '', usedQty: '', ...formFields });
    const [actionModal, setActionModal] = useState({ isOpen: false, item: null });

    const handleChange = (e) => {
        const { name, value } = e.target;
        let val = value;

        // Máscaras Dinâmicas
        if (name === 'qty' || name === 'usedQty') val = maskMeasure(value, 'un');
        if (name === 'unitPrice' || name === 'boxPrice') val = maskCurrency(value);

        setForm(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let newItem = {};
        
        if (activeTab === 'catalog') {
            if (!form.catalogId) return alert("Selecione um item");
            const catalogItem = catalogItems.find(i => i.id === form.catalogId);
            newItem = { ...catalogItem, id: crypto.randomUUID(), isLocal: false };
        } else {
            newItem = { ...form, id: form.id || crypto.randomUUID(), isLocal: true };
            // Limpa máscaras de preço manual
            if (newItem.unitPrice) newItem.unitPrice = unmaskMoney(newItem.unitPrice);
            if (newItem.boxPrice) newItem.boxPrice = unmaskMoney(newItem.boxPrice);
        }

        // Limpa máscaras de quantidade
        if (form.qty) newItem.qty = unmaskNumber(form.qty);
        if (form.usedQty) newItem.usedQty = unmaskNumber(form.usedQty);
        
        if (form.id && activeTab === 'manual') {
            setItems(prev => prev.map(i => i.id === form.id ? newItem : i));
        } else {
            setItems(prev => [...prev, newItem]);
        }
        
        // Reseta form mantendo campos vazios
        setForm({ id: null, catalogId: '', qty: '', usedQty: '', ...formFields });
        setActiveTab('catalog'); 
    };

    const handleDelete = () => {
        setItems(prev => prev.filter(i => i.id !== actionModal.item.id));
        setActionModal({ isOpen: false, item: null });
    };

    const handleEdit = () => {
        if (actionModal.item.isLocal) {
            // Ao editar, reaplica as máscaras visualmente
            let itemToEdit = { ...actionModal.item };
            if (itemToEdit.qty) itemToEdit.qty = maskMeasure(itemToEdit.qty, 'un');
            if (itemToEdit.usedQty) itemToEdit.usedQty = maskMeasure(itemToEdit.usedQty, 'un');
            if (itemToEdit.unitPrice) itemToEdit.unitPrice = maskCurrency(itemToEdit.unitPrice.toFixed(2));
            if (itemToEdit.boxPrice) itemToEdit.boxPrice = maskCurrency(itemToEdit.boxPrice.toFixed(2));

            setForm(itemToEdit);
            setActiveTab('manual');
        } else {
            alert("Itens de catálogo não podem ser editados, apenas removidos.");
        }
        setActionModal({ isOpen: false, item: null });
    };

    return (
        <div className="card" style={{marginTop: '1.5rem'}}>
            <h2 className="section-title">{title}</h2>
            <div className="tabs-container">
                <button onClick={() => setActiveTab('catalog')} className={`tab-button ${activeTab === 'catalog' ? 'active' : ''}`}>Catálogo</button>
                <button onClick={() => setActiveTab('manual')} className={`tab-button ${activeTab === 'manual' ? 'active' : ''}`}>Manual</button>
            </div>

            <form onSubmit={handleSubmit} style={{marginTop: '1rem'}}>
                {activeTab === 'catalog' && (
                    <div className="form-group">
                        <label>Selecionar {typeLabel}</label>
                        <select 
                            name="catalogId"
                            value={form.catalogId} 
                            onChange={e => setForm({...form, catalogId: e.target.value})} 
                            className="form-input-style"
                        >
                            <option value="">-- Selecione --</option>
                            {catalogItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </div>
                )}
                
                {activeTab === 'manual' && (
                    <div className="form-grid-inputs-2">
                        <div className="form-group">
                            <label>Nome</label>
                            <input name="name" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} required placeholder={`Nome do ${typeLabel}`} />
                        </div>
                        {Object.keys(formFields).map(key => (
                             <div className="form-group" key={key}>
                                 <label>{key.includes('Price') ? 'Preço (R$)' : key}</label>
                                 <input 
                                    type="tel"
                                    name={key}
                                    value={form[key] || ''} 
                                    onChange={handleChange} 
                                    required
                                    placeholder="R$ 0,00"
                                />
                             </div>
                        ))}
                    </div>
                )}

                <div className="form-group" style={{maxWidth: '150px', marginTop: '10px'}}>
                    <label>Quantidade</label>
                    <input 
                        type="tel"
                        name={typeLabel === 'Ferragem' ? 'usedQty' : 'qty'}
                        value={typeLabel === 'Ferragem' ? form.usedQty : form.qty} 
                        onChange={handleChange} 
                        required 
                        placeholder="1 un" 
                    />
                </div>
                <button type="submit" className="btn btn-save" style={{marginTop: '10px'}}>Salvar {typeLabel}</button>
            </form>

            <div className="table-container" style={{marginTop: '1rem'}}>
                <table>
                    <thead><tr><th>Item</th><th>Qtd</th><th>Total</th></tr></thead>
                    <tbody>
                        {items.map(i => (
                            <tr key={i.id} onClick={() => setActionModal({ isOpen: true, item: i })}>
                                <td>{i.name} {i.isLocal && <small>(Local)</small>}</td>
                                <td>{i.qty || i.usedQty} un</td>
                                <td>{formatCurrency(i.totalCost || 0)}</td>
                            </tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan="3" style={{textAlign:'center'}}>Nenhum item.</td></tr>}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, item: null })} title={`Opções: ${actionModal.item?.name}`} footer={<button onClick={() => setActionModal({ isOpen: false, item: null })} className="btn btn-secondary" style={{width:'100%'}}>Fechar</button>}>
                <div className="action-menu-grid">
                    {actionModal.item?.isLocal && <button onClick={handleEdit} className="btn-action-menu edit"><EditIcon /> <span>Editar Item</span></button>}
                    <button onClick={handleDelete} className="btn-action-menu delete"><TrashIcon /> <span>Remover</span></button>
                </div>
            </Modal>
        </div>
    );
};

const ExtrasManager = ({ borderTapes, setBorderTapes, catalogEdgeBands, unitItems, setUnitItems, catalogUnitItems, hardware, setHardware, catalogHardware }) => {
    return (
        <div>
             <div className="card" style={{marginTop: '1.5rem'}}>
                <h2 className="section-title">Fita de Borda Principal</h2>
                <div className="form-group">
                    <select 
                        value={borderTapes[0]?.id || ''} 
                        onChange={(e) => {
                            const selected = catalogEdgeBands.find(t => t.id === e.target.value);
                            if (selected) setBorderTapes([{...selected, usedLength: 0, isLocal: false}]);
                        }}
                        className="form-input-style"
                    >
                        <option value="">-- Selecione do Catálogo --</option>
                        {catalogEdgeBands.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
             </div>

             <MaterialSection title="Itens Unitários" typeLabel="Item" items={unitItems} setItems={setUnitItems} catalogItems={catalogUnitItems} formFields={{unitPrice: ''}} />
             <MaterialSection title="Ferragens (Caixa)" typeLabel="Ferragem" items={hardware} setItems={setHardware} catalogItems={catalogHardware} formFields={{boxPrice: '', boxQty: ''}} />
        </div>
    );
};

export default ExtrasManager;