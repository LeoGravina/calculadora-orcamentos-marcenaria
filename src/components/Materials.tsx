import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Firestore } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { maskCurrency, maskMeasure, unmaskMoney, unmaskNumber } from '../utils/masks';
import { formatCurrency } from '../utils/helpers';
import { EditIcon, TrashIcon } from './icons';

interface MaterialsProps {
    setCurrentPage: (page: string) => void;
    db: Firestore | null;
}

type TabType = 'sheet' | 'edge_band' | 'unitary_item' | 'hardware_box';

export default function Materials({ setCurrentPage, db }: MaterialsProps) {
    const [activeTab, setActiveTab] = useState<TabType>('sheet');
    const [materials, setMaterials] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estado do formulário
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<any>({
        name: '', price: '', length: '', width: '', rollPrice: '', rollLength: '', unitPrice: '', boxPrice: '', boxQty: ''
    });

    const loadMaterials = async () => {
        if (!db) return;
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "materials"));
            const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMaterials(items);
        } catch (error) {
            toast.error("Erro ao carregar catálogo.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMaterials();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let val = value;
        if (['price', 'rollPrice', 'unitPrice', 'boxPrice'].includes(name)) val = maskCurrency(value);
        if (['length', 'width', 'rollLength', 'boxQty'].includes(name)) val = maskMeasure(value);
        setForm((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db) return;
        if (!form.name) return toast.error("O nome é obrigatório.");

        const toastId = toast.loading('Salvando material...');
        try {
            let dataToSave: any = { name: form.name, type: activeTab };

            if (activeTab === 'sheet') {
                dataToSave.price = unmaskMoney(form.price);
                dataToSave.length = unmaskNumber(form.length);
                dataToSave.width = unmaskNumber(form.width);
            } else if (activeTab === 'edge_band') {
                dataToSave.rollPrice = unmaskMoney(form.rollPrice);
                dataToSave.rollLength = unmaskNumber(form.rollLength);
            } else if (activeTab === 'unitary_item') {
                dataToSave.unitPrice = unmaskMoney(form.unitPrice);
            } else if (activeTab === 'hardware_box') {
                dataToSave.boxPrice = unmaskMoney(form.boxPrice);
                dataToSave.boxQty = unmaskNumber(form.boxQty);
            }

            if (editingId) {
                await updateDoc(doc(db, "materials", editingId), dataToSave);
                toast.success('Material atualizado!', { id: toastId });
            } else {
                await addDoc(collection(db, "materials"), dataToSave);
                toast.success('Material adicionado!', { id: toastId });
            }

            setForm({ name: '', price: '', length: '', width: '', rollPrice: '', rollLength: '', unitPrice: '', boxPrice: '', boxQty: '' });
            setEditingId(null);
            loadMaterials();
        } catch (error) {
            toast.error('Erro ao salvar material.', { id: toastId });
        }
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setActiveTab(item.type);
        setForm({
            name: item.name || '',
            price: item.price ? maskCurrency(item.price.toFixed(2)) : '',
            length: item.length ? String(item.length) : '',
            width: item.width ? String(item.width) : '',
            rollPrice: item.rollPrice ? maskCurrency(item.rollPrice.toFixed(2)) : '',
            rollLength: item.rollLength ? String(item.rollLength) : '',
            unitPrice: item.unitPrice ? maskCurrency(item.unitPrice.toFixed(2)) : '',
            boxPrice: item.boxPrice ? maskCurrency(item.boxPrice.toFixed(2)) : '',
            boxQty: item.boxQty ? String(item.boxQty) : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!db) return;
        if (!window.confirm("Tem certeza que deseja excluir este material do catálogo?")) return;
        
        const toastId = toast.loading('Excluindo...');
        try {
            await deleteDoc(doc(db, "materials", id));
            toast.success('Excluído com sucesso.', { id: toastId });
            loadMaterials();
        } catch (error) {
            toast.error('Erro ao excluir.', { id: toastId });
        }
    };

    const filteredMaterials = materials.filter(m => m.type === activeTab);

    return (
        <div className="flex flex-col items-center pb-24 w-full bg-gray-50 min-h-screen">
            <header className="flex flex-col items-center pt-8 pb-6 px-4 w-full bg-white shadow-sm mb-6 rounded-b-3xl border-b border-gray-100">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Catálogo de Materiais</h1>
                <p className="text-gray-500 font-medium text-sm mb-4">Gerencie os preços base</p>
                <button onClick={() => setCurrentPage('home')} className="flex items-center justify-center px-6 py-2.5 bg-gray-100 text-gray-700 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors w-full max-w-xs">
                    ← Voltar ao Início
                </button>
            </header>

            <main className="flex flex-col w-full max-w-3xl px-4">
                
                {/* --- ABAS COM SCROLL HORIZONTAL PROTEGIDO --- */}
                <div className="w-full bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mb-6 flex overflow-x-auto hide-scrollbar select-none gap-1">
                    {[
                        { id: 'sheet', label: 'Chapas' },
                        { id: 'edge_band', label: 'Fitas de Borda' },
                        { id: 'unitary_item', label: 'Unitários' },
                        { id: 'hardware_box', label: 'Ferragens (Cx)' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => { setActiveTab(tab.id as TabType); setEditingId(null); setForm({ name: '', price: '', length: '', width: '', rollPrice: '', rollLength: '', unitPrice: '', boxPrice: '', boxQty: '' }); }} 
                            className={`whitespace-nowrap px-5 py-3.5 rounded-xl font-bold text-sm transition-all flex-1 ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* --- FORMULÁRIO DE CADASTRO --- */}
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
                    <h2 className="text-xl font-extrabold text-gray-800 border-b-2 border-gray-50 pb-3 mb-5">
                        {editingId ? 'Editar Item' : 'Cadastrar Novo Item'}
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome do Material</label>
                            <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Ex: MDF Branco TX 15mm" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full font-bold text-gray-800" />
                        </div>

                        {/* Campos Dinâmicos por Tipo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {activeTab === 'sheet' && (
                                <>
                                    <div className="flex flex-col gap-1 w-full relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Preço da Chapa</label>
                                        <div className="relative w-full">
                                            <input type="tel" name="price" value={form.price} onChange={handleChange} required placeholder="0,00" className="h-14 w-full px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 text-lg" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">R$</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 w-full relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Comprimento</label>
                                        <div className="relative w-full">
                                            <input type="tel" name="length" value={form.length} onChange={handleChange} required placeholder="2750" className="h-14 w-full px-4 pr-14 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">mm</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 w-full relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Largura</label>
                                        <div className="relative w-full">
                                            <input type="tel" name="width" value={form.width} onChange={handleChange} required placeholder="1830" className="h-14 w-full px-4 pr-14 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">mm</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'edge_band' && (
                                <>
                                    <div className="flex flex-col gap-1 w-full relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Preço do Rolo</label>
                                        <div className="relative w-full">
                                            <input type="tel" name="rollPrice" value={form.rollPrice} onChange={handleChange} required placeholder="0,00" className="h-14 w-full px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 text-lg" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">R$</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 w-full relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tamanho do Rolo</label>
                                        <div className="relative w-full">
                                            <input type="tel" name="rollLength" value={form.rollLength} onChange={handleChange} required placeholder="20" className="h-14 w-full px-4 pr-14 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">mts</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {activeTab === 'unitary_item' && (
                                <div className="flex flex-col gap-1 w-full relative">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Preço Unitário</label>
                                    <div className="relative w-full">
                                        <input type="tel" name="unitPrice" value={form.unitPrice} onChange={handleChange} required placeholder="0,00" className="h-14 w-full px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 text-lg" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">R$</span>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'hardware_box' && (
                                <>
                                    <div className="flex flex-col gap-1 w-full relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Preço da Caixa</label>
                                        <div className="relative w-full">
                                            <input type="tel" name="boxPrice" value={form.boxPrice} onChange={handleChange} required placeholder="0,00" className="h-14 w-full px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-600 text-lg" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">R$</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 w-full relative">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unidades por Caixa</label>
                                        <div className="relative w-full">
                                            <input type="tel" name="boxQty" value={form.boxQty} onChange={handleChange} required placeholder="100" className="h-14 w-full px-4 pr-14 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">un</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex gap-3 mt-2">
                            {editingId && (
                                <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', price: '', length: '', width: '', rollPrice: '', rollLength: '', unitPrice: '', boxPrice: '', boxQty: '' }); }} className="h-14 px-6 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm hover:bg-gray-50 transition-colors">
                                    Cancelar
                                </button>
                            )}
                            <button type="submit" className="h-14 flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-[0.98] transition-all text-lg">
                                {editingId ? 'Atualizar Catálogo' : 'Adicionar ao Catálogo'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* --- LISTA DE ITENS SALVOS --- */}
                <h3 className="text-lg font-bold text-gray-800 mb-4 tracking-tight px-2">Itens Salvos</h3>
                {isLoading ? (
                    <div className="text-center py-10"><p className="text-gray-500 font-bold animate-pulse">Carregando catálogo...</p></div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredMaterials.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-300">
                                <p className="text-gray-400 font-medium">Nenhum item cadastrado nesta categoria.</p>
                            </div>
                        ) : (
                            filteredMaterials.map((item) => (
                                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div className="flex flex-col">
                                        <strong className="text-gray-900 font-bold text-lg">{item.name}</strong>
                                        <div className="flex flex-wrap gap-2 mt-1.5">
                                            {item.type === 'sheet' && (
                                                <>
                                                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-sm">{formatCurrency(item.price)}</span>
                                                    <span className="bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded text-sm">{item.length} x {item.width} mm</span>
                                                </>
                                            )}
                                            {item.type === 'edge_band' && (
                                                <>
                                                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-sm">{formatCurrency(item.rollPrice)}</span>
                                                    <span className="bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded text-sm">Rolo: {item.rollLength} mts</span>
                                                </>
                                            )}
                                            {item.type === 'unitary_item' && (
                                                <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-sm">{formatCurrency(item.unitPrice)} / un</span>
                                            )}
                                            {item.type === 'hardware_box' && (
                                                <>
                                                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-sm">{formatCurrency(item.boxPrice)}</span>
                                                    <span className="bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded text-sm">Cx c/ {item.boxQty} un</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(item)} className="p-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors flex-1 flex justify-center"><div className="w-5 h-5"><EditIcon /></div></button>
                                        <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex-1 flex justify-center"><div className="w-5 h-5"><TrashIcon /></div></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}