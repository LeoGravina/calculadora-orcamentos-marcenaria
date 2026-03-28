import React, { useState } from 'react';
import { EditIcon, TrashIcon } from '../icons';
import { formatCurrency } from '../../utils/helpers';
import { maskCurrency, unmaskMoney, maskMeasure, unmaskNumber } from '../../utils/masks'; 
import Modal from '../Modal';

// === TYPESCRIPT INTERFACES ===
interface MaterialItem {
    id: string | null;
    catalogId?: string;
    name?: string;
    qty?: string | number;
    usedQty?: string | number;
    unitPrice?: string | number;
    boxPrice?: string | number;
    totalCost?: number;
    isLocal?: boolean;
    [key: string]: any;
}

interface MaterialSectionProps {
    title: string;
    items: MaterialItem[];
    setItems: React.Dispatch<React.SetStateAction<any[]>>;
    catalogItems: any[];
    typeLabel: string;
    formFields: Record<string, string>;
}

const MaterialSection: React.FC<MaterialSectionProps> = ({ title, items, setItems, catalogItems, typeLabel, formFields }) => {
    const [activeTab, setActiveTab] = useState<'catalog' | 'manual'>('catalog');
    const [form, setForm] = useState<MaterialItem>({ id: null, catalogId: '', qty: '', usedQty: '', ...formFields });
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, item: MaterialItem | null }>({ isOpen: false, item: null });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let val: string | number = value;

        if (name === 'qty' || name === 'usedQty') val = maskMeasure(value, 'un');
        if (name === 'unitPrice' || name === 'boxPrice') val = maskCurrency(value);

        setForm(prev => ({ ...prev, [name]: val }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let newItem: any = {};
        
        if (activeTab === 'catalog') {
            if (!form.catalogId) return alert("Selecione um item");
            const catalogItem = catalogItems.find(i => i.id === form.catalogId);
            newItem = { ...catalogItem, id: crypto.randomUUID(), isLocal: false };
        } else {
            newItem = { ...form, id: form.id || crypto.randomUUID(), isLocal: true };
            if (newItem.unitPrice) newItem.unitPrice = unmaskMoney(newItem.unitPrice);
            if (newItem.boxPrice) newItem.boxPrice = unmaskMoney(newItem.boxPrice);
        }

        if (form.qty) newItem.qty = unmaskNumber(form.qty);
        if (form.usedQty) newItem.usedQty = unmaskNumber(form.usedQty);
        
        if (form.id && activeTab === 'manual') {
            setItems(prev => prev.map(i => i.id === form.id ? newItem : i));
        } else {
            setItems(prev => [...prev, newItem]);
        }
        
        setForm({ id: null, catalogId: '', qty: '', usedQty: '', ...formFields });
        setActiveTab('catalog'); 
    };

    const handleDelete = () => {
        if (actionModal.item) {
            setItems(prev => prev.filter(i => i.id !== actionModal.item!.id));
        }
        setActionModal({ isOpen: false, item: null });
    };

    const handleEdit = () => {
        if (actionModal.item?.isLocal) {
            let itemToEdit = { ...actionModal.item };
            if (itemToEdit.qty) itemToEdit.qty = maskMeasure(itemToEdit.qty, 'un');
            if (itemToEdit.usedQty) itemToEdit.usedQty = maskMeasure(itemToEdit.usedQty, 'un');
            if (itemToEdit.unitPrice) itemToEdit.unitPrice = maskCurrency(Number(itemToEdit.unitPrice).toFixed(2));
            if (itemToEdit.boxPrice) itemToEdit.boxPrice = maskCurrency(Number(itemToEdit.boxPrice).toFixed(2));

            setForm(itemToEdit);
            setActiveTab('manual');
        }
        setActionModal({ isOpen: false, item: null });
    };

    return (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mt-6">
            <h2 className="text-lg font-extrabold text-gray-800 mb-4">{title}</h2>
            
            <div className="flex bg-gray-50 p-1 rounded-2xl mb-4">
                <button onClick={() => setActiveTab('catalog')} className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'catalog' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Catálogo</button>
                <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Manual</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {activeTab === 'catalog' && (
                    <div className="flex flex-col gap-1">
                        <select name="catalogId" value={form.catalogId} onChange={handleChange} className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-gray-800">
                            <option value="">-- Selecione do Catálogo --</option>
                            {catalogItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                    </div>
                )}
                
                {activeTab === 'manual' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" value={form.name || ''} onChange={handleChange} required placeholder={`Nome da ${typeLabel}`} className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium" />
                        {Object.keys(formFields).map(key => (
                             <input key={key} type="tel" name={key} value={form[key] || ''} onChange={handleChange} required placeholder="R$ 0,00" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-bold text-emerald-600" />
                        ))}
                    </div>
                )}

                <div className="flex gap-3">
                    <input type="tel" name={typeLabel === 'Ferragem' ? 'usedQty' : 'qty'} value={typeLabel === 'Ferragem' ? form.usedQty : form.qty} onChange={handleChange} required placeholder="1 un" className="h-14 px-4 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-blue-700 w-32 text-center" />
                    <button type="submit" className="h-14 flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all">
                        Salvar
                    </button>
                </div>
            </form>

            <div className="mt-5 border-t border-gray-100 pt-4">
                {/* --- MOBILE CARDS --- */}
                <div className="flex flex-col gap-2 md:hidden">
                    {items.map(i => (
                        <div key={i.id} onClick={() => setActionModal({ isOpen: true, item: i })} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex justify-between items-center active:scale-[0.98] transition-transform">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800">{i.name} {i.isLocal && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded ml-1">Local</span>}</span>
                                <span className="text-xs text-gray-500 mt-0.5">{i.qty || i.usedQty} un</span>
                            </div>
                            <span className="font-extrabold text-gray-900">{formatCurrency(i.totalCost || 0)}</span>
                        </div>
                    ))}
                </div>

                {/* --- DESKTOP TABLE --- */}
                <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-left bg-white text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr><th className="p-3 border-b">Item</th><th className="p-3 border-b text-center">Qtd</th><th className="p-3 border-b text-right">Total</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {items.map(i => (
                                <tr key={i.id} onClick={() => setActionModal({ isOpen: true, item: i })} className="hover:bg-gray-50 cursor-pointer">
                                    <td className="p-3 font-bold text-gray-800">{i.name} {i.isLocal && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded ml-1">Local</span>}</td>
                                    <td className="p-3 text-center text-gray-600">{i.qty || i.usedQty} un</td>
                                    <td className="p-3 text-right font-extrabold text-gray-900">{formatCurrency(i.totalCost || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {items.length === 0 && <p className="text-center text-gray-400 text-sm py-4">Nenhum item adicionado.</p>}
            </div>

            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, item: null })} title={`Opções: ${actionModal.item?.name}`} footer={<button onClick={() => setActionModal({ isOpen: false, item: null })} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors">Fechar</button>}>
                <div className="flex flex-col gap-3 pb-2">
                    {actionModal.item?.isLocal && <button onClick={handleEdit} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-orange-50 border-l-4 border-l-orange-500 text-orange-700 transition-all shadow-sm"><div className="w-6 h-6 mr-3"><EditIcon /></div> Editar Item</button>}
                    <button onClick={handleDelete} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-red-50 border-l-4 border-l-red-500 text-red-700 transition-all shadow-sm"><div className="w-6 h-6 mr-3"><TrashIcon /></div> Remover</button>
                </div>
            </Modal>
        </div>
    );
};

// Interface do ExtrasManager Principal
interface ExtrasManagerProps {
    borderTapes: any[]; setBorderTapes: any; catalogEdgeBands: any[];
    unitItems: any[]; setUnitItems: any; catalogUnitItems: any[];
    hardware: any[]; setHardware: any; catalogHardware: any[];
}

const ExtrasManager: React.FC<ExtrasManagerProps> = ({ borderTapes, setBorderTapes, catalogEdgeBands, unitItems, setUnitItems, catalogUnitItems, hardware, setHardware, catalogHardware }) => {
    return (
        <div className="flex flex-col gap-6 mt-6">
             <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-extrabold text-gray-800 mb-3">Fita de Borda Principal</h2>
                <div className="flex flex-col gap-1">
                    <select 
                        value={borderTapes[0]?.id || ''} 
                        onChange={(e) => {
                            const selected = catalogEdgeBands.find(t => t.id === e.target.value);
                            if (selected) setBorderTapes([{...selected, usedLength: 0, isLocal: false}]);
                        }}
                        className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-gray-800"
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