import React, { useState } from 'react';
import { formatCurrency } from '../../utils/helpers';
import { maskCurrency, unmaskMoney, maskMeasure, unmaskNumber } from '../../utils/masks'; 
import Modal from '../Modal';

// === TYPESCRIPT ===
interface Sheet { id: string | null; name: string; price: string | number; length: string | number; width: string | number; isLocal?: boolean; [key: string]: any; }
interface SheetManagerProps { sheets: Sheet[]; setSheets: React.Dispatch<React.SetStateAction<Sheet[]>>; catalogSheets: Sheet[]; }

const SheetManager: React.FC<SheetManagerProps> = ({ sheets, setSheets, catalogSheets }) => {
    const [activeTab, setActiveTab] = useState<'select' | 'manual'>('select');
    const [manualForm, setManualForm] = useState<Sheet>({ name: '', price: '', length: '', width: '', id: null });
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, sheet: Sheet | null }>({ isOpen: false, sheet: null });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let val = name === 'price' ? maskCurrency(value) : (name==='name'?value:maskMeasure(value));
        setManualForm(p => ({ ...p, [name]: val }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const n: Sheet = { ...manualForm, price: unmaskMoney(manualForm.price), length: unmaskNumber(manualForm.length), width: unmaskNumber(manualForm.width), id: manualForm.id || crypto.randomUUID(), isLocal: true };
        if (manualForm.id) setSheets(prev => prev.map(s => s.id === n.id ? n : s));
        else setSheets(prev => [...prev, n]);
        setManualForm({ name: '', price: '', length: '', width: '', id: null }); setActiveTab('select');
    };

    return (
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 mt-6 overflow-hidden">
            <h2 className="text-xl font-extrabold text-gray-800 border-b-2 border-gray-50 pb-3 mb-4 tracking-tight">Chapas do Orçamento</h2>
            
            {/* Abas com Overflow X Protegido */}
            <div className="w-full bg-gray-50 p-1 rounded-2xl mb-5 flex overflow-x-auto hide-scrollbar select-none gap-1">
                {[ { id: 'select', l: 'Lista do Orçamento' }, { id: 'manual', l: '+ Nova Chapa Local' } ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`whitespace-nowrap flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === t.id ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t.l}</button>
                ))}
            </div>

            <div>
                {activeTab === 'select' && (
                    <div className="flex flex-col gap-3 md:hidden">
                        {sheets.map(s => (
                            <div key={s.id} onClick={() => setActionModal({ isOpen: true, sheet: s })} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform border-l-4 border-l-emerald-500 flex justify-between items-center cursor-pointer">
                                <div className="flex flex-col">
                                    <strong className="text-gray-900 font-bold">{s.name}</strong>
                                    <span className="text-sm text-gray-600">{s.length} x {s.width} mm</span>
                                    <span className={`text-[10px] font-bold uppercase w-fit px-2 py-0.5 rounded-md mt-1 ${s.isLocal ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{s.isLocal ? 'Local' : 'Catálogo'}</span>
                                </div>
                                <div className="font-extrabold text-emerald-600 text-lg">{formatCurrency(s.price)}</div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'manual' && (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input name="name" value={manualForm.name} onChange={handleChange} required placeholder="Nome (Ex: MDF Especial)" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none w-full font-medium text-gray-800" />
                        <input type="tel" name="price" value={manualForm.price} onChange={handleChange} required placeholder="Preço (R$ 0,00)" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none w-full font-bold text-emerald-600 text-lg" />
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* Suffix Overlay (mm) */}
                            <div className="flex flex-col gap-1 w-full relative">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widePr-16 text-center">Comp. (mm)</label>
                                <div className="relative w-full">
                                    <input type="tel" name="length" value={manualForm.length} onChange={handleChange} required placeholder="0" className="h-14 w-full px-4 Pr-16 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-center font-bold text-lg" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">mm</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 w-full relative">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widePr-16 text-center">Larg. (mm)</label>
                                <div className="relative w-full">
                                    <input type="tel" name="width" value={manualForm.width} onChange={handleChange} required placeholder="0" className="h-14 w-full px-4 Pr-16 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-center font-bold text-lg" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">mm</span>
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="h-14 mt-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold rounded-2xl active:scale-[0.98] transition-all w-full text-lg">Salvar Chapa Local</button>
                    </form>
                )}
            </div>
            {/* Action modal ... */}
        </div>
    );
};

export default SheetManager;