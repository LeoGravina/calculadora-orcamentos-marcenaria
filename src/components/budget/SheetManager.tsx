import React, { useState } from 'react';
import { EditIcon, TrashIcon } from '../icons';
import { formatCurrency } from '../../utils/helpers';
import { maskCurrency, unmaskMoney, maskMeasure, unmaskNumber } from '../../utils/masks'; 
import Modal from '../Modal';

// === TYPESCRIPT INTERFACES ===
interface Sheet {
    id: string | null;
    name: string;
    price: string | number;
    length: string | number;
    width: string | number;
    isLocal?: boolean;
    isOverride?: boolean;
    [key: string]: any;
}

interface SheetManagerProps {
    sheets: Sheet[];
    setSheets: React.Dispatch<React.SetStateAction<Sheet[]>>;
    catalogSheets: Sheet[];
}

const SheetManager: React.FC<SheetManagerProps> = ({ sheets, setSheets, catalogSheets }) => {
    const [activeTab, setActiveTab] = useState<'select' | 'manual'>('select');
    const [manualForm, setManualForm] = useState<Sheet>({ name: '', price: '', length: '', width: '', id: null });
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, sheet: Sheet | null }>({ isOpen: false, sheet: null });

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newSheet: Sheet = {
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
        if(actionModal.sheet) {
            setSheets(prev => prev.filter(s => s.id !== actionModal.sheet!.id));
        }
        setActionModal({ isOpen: false, sheet: null });
    };

    const handleEdit = () => {
        if (!actionModal.sheet) return;
        const s = actionModal.sheet;
        setManualForm({
            ...s,
            price: maskCurrency(Number(s.price).toFixed(2)),
            length: maskMeasure(s.length, 'mm'),
            width: maskMeasure(s.width, 'mm')
        });
        setActiveTab('manual');
        setActionModal({ isOpen: false, sheet: null });
    };

    return (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mt-6">
            <h2 className="text-xl font-extrabold text-gray-800 border-b-2 border-gray-50 pb-3 mb-4">Chapas do Orçamento</h2>
            
            {/* Abas Mobile-Friendly */}
            <div className="flex bg-gray-50 p-1 rounded-2xl mb-5">
                <button 
                    onClick={() => setActiveTab('select')} 
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'select' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Lista de Chapas
                </button>
                <button 
                    onClick={() => setActiveTab('manual')} 
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === 'manual' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    + Nova Chapa
                </button>
            </div>

            <div>
                {activeTab === 'select' && (
                    <div className="flex flex-col gap-4">
                        {/* --- MOBILE CARDS --- */}
                        <div className="flex flex-col gap-3 md:hidden">
                            {sheets.map(s => (
                                <div key={s.id} onClick={() => setActionModal({ isOpen: true, sheet: s })} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform border-l-4 border-l-emerald-500 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <strong className="text-gray-900 font-bold">{s.name}</strong>
                                        <span className="text-sm text-gray-500">{s.length} x {s.width} mm</span>
                                        <span className={`text-[10px] font-bold uppercase w-fit px-2 py-0.5 rounded-md mt-1 ${s.isLocal ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {s.isLocal ? 'Local' : 'Catálogo'}
                                        </span>
                                    </div>
                                    <div className="font-extrabold text-emerald-600">
                                        {formatCurrency(s.price)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* --- DESKTOP TABLE --- */}
                        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-left bg-white">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                                    <tr>
                                        <th className="p-4 border-b">Nome</th>
                                        <th className="p-4 border-b">Preço</th>
                                        <th className="p-4 border-b">Medidas</th>
                                        <th className="p-4 border-b text-center">Origem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sheets.map(s => (
                                        <tr key={s.id} onClick={() => setActionModal({ isOpen: true, sheet: s })} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                                            <td className="p-4 font-bold text-gray-900">{s.name}</td>
                                            <td className="p-4 font-extrabold text-emerald-600">{formatCurrency(s.price)}</td>
                                            <td className="p-4 text-gray-600">{s.length} x {s.width} mm</td>
                                            <td className="p-4 text-center">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${s.isLocal ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {s.isLocal ? 'Local' : 'Catálogo'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {sheets.length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-500">
                                Nenhuma chapa adicionada.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'manual' && (
                    <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome</label>
                                <input type="text" value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} required placeholder="Ex: MDF Especial" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-gray-800" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Preço</label>
                                <input type="tel" value={manualForm.price} onChange={e => setManualForm({...manualForm, price: maskCurrency(e.target.value)})} required placeholder="R$ 0,00" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-bold text-emerald-600" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Comp. (mm)</label>
                                <input type="tel" value={manualForm.length} onChange={e => setManualForm({...manualForm, length: maskMeasure(e.target.value, 'mm')})} required placeholder="0 mm" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full text-center font-bold text-gray-800" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Larg. (mm)</label>
                                <input type="tel" value={manualForm.width} onChange={e => setManualForm({...manualForm, width: maskMeasure(e.target.value, 'mm')})} required placeholder="0 mm" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full text-center font-bold text-gray-800" />
                            </div>
                        </div>
                        <button type="submit" className="h-14 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all w-full text-lg">
                            {manualForm.id ? 'Atualizar Chapa' : '+ Adicionar Chapa'}
                        </button>
                    </form>
                )}
            </div>

            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, sheet: null })} title={`Opções: ${actionModal.sheet?.name}`} footer={<button onClick={() => setActionModal({ isOpen: false, sheet: null })} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors">Fechar</button>}>
                <div className="flex flex-col gap-3 pb-2">
                    {actionModal.sheet?.isLocal && (
                        <button onClick={handleEdit} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-orange-50 border-l-4 border-l-orange-500 text-orange-700 transition-all shadow-sm">
                            <div className="w-6 h-6 mr-3"><EditIcon /></div> Editar Chapa
                        </button>
                    )}
                    <button onClick={handleDelete} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-red-50 border-l-4 border-l-red-500 text-red-700 transition-all shadow-sm">
                        <div className="w-6 h-6 mr-3"><TrashIcon /></div> Remover do Orçamento
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default SheetManager;