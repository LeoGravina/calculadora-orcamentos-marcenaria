import React, { useState } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { maskCurrency, unmaskMoney, maskMeasure, unmaskNumber } from '../../utils/masks'; 
import Modal from '../Modal';

// === TYPESCRIPT ===
interface MaterialItem { id: string; catalogId?: string; name?: string; qty?: string | number; usedQty?: string | number; unitPrice?: string | number; boxPrice?: string | number; totalCost?: number; isLocal?: boolean; [key: string]: any; }

interface MaterialSectionProps { title: string; items: MaterialItem[]; setItems: React.Dispatch<React.SetStateAction<any[]>>; catalogItems: any[]; typeLabel: string; formFields: Record<string, string>; }

const MaterialSection: React.FC<MaterialSectionProps> = ({ title, items, setItems, catalogItems, typeLabel, formFields }) => {
    const [activeTab, setActiveTab] = useState<'catalog' | 'manual'>('catalog');
    const [form, setForm] = useState<any>({ id: null, catalogId: '', qty: '', usedQty: '', ...formFields });
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, item: MaterialItem | null }>({ isOpen: false, item: null });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let val: string | number = value;
        if (name === 'qty' || name === 'usedQty') val = maskMeasure(value);
        if (name === 'unitPrice' || name === 'boxPrice') val = maskCurrency(value);
        setForm((p:any) => ({ ...p, [name]: val }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let n: any = {};
        if (activeTab === 'catalog') {
            if (!form.catalogId) return alert("Selecione um item");
            const cat = catalogItems.find(i => i.id === form.catalogId);
            n = { ...cat, id: crypto.randomUUID(), isLocal: false };
        } else {
            n = { ...form, id: form.id || crypto.randomUUID(), isLocal: true };
            n.unitPrice && (n.unitPrice = unmaskMoney(n.unitPrice));
            n.boxPrice && (n.boxPrice = unmaskMoney(n.boxPrice));
        }
        form.qty && (n.qty = unmaskNumber(form.qty));
        form.usedQty && (n.usedQty = unmaskNumber(form.usedQty));
        if (form.id && activeTab === 'manual') setItems(prev => prev.map(i => i.id === form.id ? n : i));
        else setItems(prev => [...prev, n]);
        setForm({ id: null, catalogId: '', qty: '', usedQty: '', ...formFields });
        setActiveTab('catalog'); 
    };

    return (
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 mt-6">
            <h2 className="text-xl font-extrabold text-gray-800 mb-4 tracking-tight">{title}</h2>
            <div className="flex bg-gray-50 p-1 rounded-2xl mb-4 select-nonegap-1">
                <button onClick={() => setActiveTab('catalog')} className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'catalog' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Catálogo</button>
                <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Manual</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {activeTab === 'catalog' && (
                    /* DROPDOWN ESTILIZADO TOP */
                    <div className="relative w-full">
                        <select name="catalogId" value={form.catalogId} onChange={handleChange} className="h-14 px-4 Pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-bold text-gray-700 appearance-none cursor-pointer">
                            <option value="">-- Selecione do Catálogo --</option>
                            {catalogItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                )}
                {activeTab === 'manual' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" value={form.name || ''} onChange={handleChange} placeholder={`Nome`} required className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium" />
                        {Object.keys(formFields).map(k => (
                            <input key={k} type="tel" name={k} value={form[k] || ''} onChange={handleChange} required placeholder="R$ 0,00" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-emerald-700 text-lg" />
                        ))}
                    </div>
                )}
                <div className="flex gap-3">
                    {/* Suffix Overlay (un) */}
                    <div className="flex flex-col gap-1 w-32 relative">
                        <div className="relative w-full">
                            <input type="tel" name={typeLabel==='Ferragem'?'usedQty':'qty'} value={typeLabel==='Ferragem'?form.usedQty:form.qty} onChange={handleChange} required placeholder="1" className="h-14 w-full px-4 pr-14 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold text-blue-700 text-lg" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-blue-400 select-none pointer-events-none">un</span>
                        </div>
                    </div>
                    <button type="submit" className="h-14 flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold rounded-2xl active:scale-[0.98] transition-all text-lg">Salvar</button>
                </div>
            </form>
            {/* ... List ... */}
        </div>
    );
};

interface ExtrasManagerProps { borderTapes: any[]; setBorderTapes: any; catalogEdgeBands: any[]; unitItems: any[]; setUnitItems: any; catalogUnitItems: any[]; hardware: any[]; setHardware: any; catalogHardware: any[]; }

const ExtrasManager: React.FC<ExtrasManagerProps> = ({ borderTapes, setBorderTapes, catalogEdgeBands, unitItems, setUnitItems, catalogUnitItems, hardware, setHardware, catalogHardware }) => {
    return (
        <div className="flex flex-col gap-6 mt-6">
             <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 mt-6">
                <h2 className="text-xl font-extrabold text-gray-800 mb-4 tracking-tight">3. Fita de Borda Principal</h2>
                {/* DROPDOWN ESTILIZADO TOP */}
                <div className="relative w-full">
                    <select 
                        value={borderTapes[0]?.id || ''} 
                        onChange={(e) => { const s = catalogEdgeBands.find(t => t.id === e.target.value); s && setBorderTapes([{...s, usedLength: 0, isLocal: false}]); }}
                        className="h-14 px-4 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-bold text-gray-700 appearance-none cursor-pointer"
                    >
                        <option value="">-- Selecione do Catálogo --</option>
                        {catalogEdgeBands.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
             </div>
             <MaterialSection title="4. Itens Unitários" typeLabel="Item" items={unitItems} setItems={setUnitItems} catalogItems={catalogUnitItems} formFields={{unitPrice: ''}} />
             <MaterialSection title="5. Ferragens" typeLabel="Ferragem" items={hardware} setItems={setHardware} catalogItems={catalogHardware} formFields={{boxPrice: '', boxQty: ''}} />
        </div>
    );
};

export default ExtrasManager;