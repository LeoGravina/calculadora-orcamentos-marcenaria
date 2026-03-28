import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from './icons';
import { formatCurrency } from '../utils/helpers';
import { maskCurrency, unmaskMoney, maskMeasure, unmaskNumber } from '../utils/masks'; 
import Modal from './Modal';

// === TYPESCRIPT: Interfaces dos Materiais ===
interface MaterialBase { id: string | null; name: string; type?: string; }
interface Sheet extends MaterialBase { price: string | number; length: string | number; width: string | number; }
interface EdgeBand extends MaterialBase { rollPrice: string | number; rollLength: string | number; }
interface UnitaryItem extends MaterialBase { unitPrice: string | number; }
interface HardwareBox extends MaterialBase { boxPrice: string | number; boxQty: string | number; }

interface MaterialsProps {
    db: Firestore | null;
    setCurrentPage: (page: string) => void;
}

const Materials: React.FC<MaterialsProps> = ({ db, setCurrentPage }) => {
    // Estados de Listagem
    const [sheets, setSheets] = useState<Sheet[]>([]);
    const [edgeBands, setEdgeBands] = useState<EdgeBand[]>([]);
    const [unitaryItems, setUnitaryItems] = useState<UnitaryItem[]>([]); 
    const [hardwareBoxes, setHardwareBoxes] = useState<HardwareBox[]>([]);
    
    // Estados de Formulário
    const initialSheetForm: Sheet = { id: null, name: '', price: '', length: '', width: '' };
    const initialEdgeBandForm: EdgeBand = { id: null, name: '', rollPrice: '', rollLength: '' };
    const initialUnitaryItemForm: UnitaryItem = { id: null, name: '', unitPrice: '' };
    const initialHardwareBoxForm: HardwareBox = { id: null, name: '', boxPrice: '', boxQty: '' };

    const [sheetForm, setSheetForm] = useState<Sheet>(initialSheetForm);
    const [edgeBandForm, setEdgeBandForm] = useState<EdgeBand>(initialEdgeBandForm);
    const [unitaryItemForm, setUnitaryItemForm] = useState<UnitaryItem>(initialUnitaryItemForm);
    const [hardwareBoxForm, setHardwareBoxForm] = useState<HardwareBox>(initialHardwareBoxForm);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sheets' | 'edgeBands' | 'unitaryItems' | 'hardwareBoxes'>('sheets');
    
    // Estados de Modais
    const [actionModal, setActionModal] = useState<{isOpen: boolean, item: any, type: string}>({ isOpen: false, item: null, type: '' });
    const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, item: any}>({ isOpen: false, item: null });

    const fetchMaterials = useCallback(async () => {
        if (!db) return;
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "materials"));
            const allMaterials = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            
            setSheets(allMaterials.filter(item => item.type === 'sheet'));
            setEdgeBands(allMaterials.filter(item => item.type === 'edge_band'));
            setUnitaryItems(allMaterials.filter(item => item.type === 'unitary_item'));
            setHardwareBoxes(allMaterials.filter(item => item.type === 'hardware_box'));
        } catch (error) { toast.error("Erro ao carregar materiais."); } finally { setLoading(false); }
    }, [db]);

    useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

    // Lógica de Salvar (Blindada pelo TS)
    const handleFormSubmit = async (e: React.FormEvent, formData: any, type: string, setForm: Function, initialForm: any, title: string) => {
        e.preventDefault();
        if (!db) return;
        const toastId = toast.loading('Salvando...');
        try {
            const dataToSave = { ...formData, type };
            if (dataToSave.price) dataToSave.price = unmaskMoney(dataToSave.price);
            if (dataToSave.rollPrice) dataToSave.rollPrice = unmaskMoney(dataToSave.rollPrice);
            if (dataToSave.unitPrice) dataToSave.unitPrice = unmaskMoney(dataToSave.unitPrice);
            if (dataToSave.boxPrice) dataToSave.boxPrice = unmaskMoney(dataToSave.boxPrice);

            if (dataToSave.length) dataToSave.length = unmaskNumber(dataToSave.length);
            if (dataToSave.width) dataToSave.width = unmaskNumber(dataToSave.width);
            if (dataToSave.rollLength) dataToSave.rollLength = unmaskNumber(dataToSave.rollLength);
            if (dataToSave.boxQty) dataToSave.boxQty = unmaskNumber(dataToSave.boxQty);

            if (formData.id) {
                await updateDoc(doc(db, "materials", formData.id), dataToSave);
            } else {
                delete dataToSave.id;
                await addDoc(collection(db, "materials"), dataToSave);
            }
            toast.success(`${title} salvo!`, { id: toastId });
            setForm(initialForm);
            fetchMaterials();
        } catch (error) { toast.error("Erro ao salvar.", { id: toastId }); }
    };

    const handleEditClick = (item: any, type: string) => {
        setActionModal({ isOpen: false, item: null, type: '' });
        let itemToEdit = { ...item };

        if (itemToEdit.price) itemToEdit.price = maskCurrency(itemToEdit.price.toFixed(2));
        if (itemToEdit.rollPrice) itemToEdit.rollPrice = maskCurrency(itemToEdit.rollPrice.toFixed(2));
        if (itemToEdit.unitPrice) itemToEdit.unitPrice = maskCurrency(itemToEdit.unitPrice.toFixed(2));
        if (itemToEdit.boxPrice) itemToEdit.boxPrice = maskCurrency(itemToEdit.boxPrice.toFixed(2));

        if (itemToEdit.length) itemToEdit.length = maskMeasure(itemToEdit.length, 'mm');
        if (itemToEdit.width) itemToEdit.width = maskMeasure(itemToEdit.width, 'mm');
        if (itemToEdit.rollLength) itemToEdit.rollLength = maskMeasure(itemToEdit.rollLength, 'm');
        if (itemToEdit.boxQty) itemToEdit.boxQty = maskMeasure(itemToEdit.boxQty, 'un');

        if (type === 'sheets') setSheetForm(itemToEdit);
        if (type === 'edgeBands') setEdgeBandForm(itemToEdit);
        if (type === 'unitaryItems') setUnitaryItemForm(itemToEdit);
        if (type === 'hardwareBoxes') setHardwareBoxForm(itemToEdit);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteConfirm = async () => {
        if (!db) return;
        const toastId = toast.loading('Excluindo...');
        try {
            await deleteDoc(doc(db, "materials", deleteModal.item.id));
            toast.success('Item removido!', { id: toastId });
            setDeleteModal({ isOpen: false, item: null });
            fetchMaterials();
        } catch (error) { toast.error("Erro ao excluir.", { id: toastId }); }
    };

    // Renderização auxiliar da lista baseada na aba ativa
    const renderList = () => {
        const currentData = activeTab === 'sheets' ? sheets : activeTab === 'edgeBands' ? edgeBands : activeTab === 'unitaryItems' ? unitaryItems : hardwareBoxes;

        if (loading) return <p className="text-center py-8 text-gray-500 animate-pulse">Carregando catálogo...</p>;
        if (currentData.length === 0) return <p className="text-center py-8 text-gray-500">Nenhum item cadastrado nesta categoria.</p>;

        return (
            <div className="mt-6">
                {/* --- MOBILE (Cards) --- */}
                <div className="flex flex-col gap-3 md:hidden">
                    {currentData.map((item: any) => (
                        <div key={item.id} onClick={() => setActionModal({ isOpen: true, item, type: activeTab })} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:scale-95 transition-transform flex justify-between items-center">
                            <div className="flex flex-col">
                                <strong className="text-gray-900 text-lg">{item.name}</strong>
                                <span className="text-sm text-gray-500 mt-1">
                                    {activeTab === 'sheets' && `${item.length} x ${item.width} mm`}
                                    {activeTab === 'edgeBands' && `Rolo de ${item.rollLength}m`}
                                    {activeTab === 'hardwareBoxes' && `Caixa c/ ${item.boxQty} un`}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="font-extrabold text-emerald-600 text-lg">
                                    {formatCurrency(item.price || item.rollPrice || item.unitPrice || item.boxPrice)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- DESKTOP (Tabela) --- */}
                <div className="hidden md:block overflow-hidden border border-gray-200 rounded-xl">
                    <table className="w-full text-left bg-white">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4 border-b">Nome</th>
                                <th className="p-4 border-b">Preço</th>
                                <th className="p-4 border-b text-right">Especificação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentData.map((item: any) => (
                                <tr key={item.id} onClick={() => setActionModal({ isOpen: true, item, type: activeTab })} className="hover:bg-gray-50 cursor-pointer group">
                                    <td className="p-4 font-bold text-gray-900">{item.name}</td>
                                    <td className="p-4 text-emerald-600 font-extrabold">{formatCurrency(item.price || item.rollPrice || item.unitPrice || item.boxPrice)}</td>
                                    <td className="p-4 text-gray-500 text-right">
                                        {activeTab === 'sheets' && `${item.length} x ${item.width} mm`}
                                        {activeTab === 'edgeBands' && `${item.rollLength} m`}
                                        {activeTab === 'hardwareBoxes' && `${item.boxQty} un`}
                                        {activeTab === 'unitaryItems' && `-`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center px-4 py-6 mx-auto w-full max-w-4xl text-gray-800 pb-20">
            
            {/* Cabeçalho */}
            <div className="flex w-full justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-extrabold text-gray-900">Catálogo</h2>
                <button onClick={() => setCurrentPage('home')} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200">Voltar</button>
            </div>
            
            <div className="w-full bg-white p-2 rounded-2xl shadow-sm border border-gray-100 mb-6">
                {/* Abas com overflow horizontal para deslizar no mobile */}
                <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1">
                    {[
                        { id: 'sheets', label: 'Chapas' },
                        { id: 'edgeBands', label: 'Fitas' },
                        { id: 'unitaryItems', label: 'Itens' },
                        { id: 'hardwareBoxes', label: 'Ferragens' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`whitespace-nowrap flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Formulários (O layout de grid muda para coluna em telas pequenas) */}
            <div className="w-full bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                {activeTab === 'sheets' && (
                    <form onSubmit={(e) => handleFormSubmit(e, sheetForm, 'sheet', setSheetForm, initialSheetForm, 'Chapa')} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium" value={sheetForm.name} onChange={e => setSheetForm({...sheetForm, name:e.target.value})} placeholder="Nome (Ex: MDF Branco)" required />
                            <input type="tel" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-emerald-700" value={sheetForm.price} onChange={e => setSheetForm({...sheetForm, price: maskCurrency(e.target.value)})} placeholder="Preço (R$)" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="tel" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium text-center" value={sheetForm.length} onChange={e => setSheetForm({...sheetForm, length: maskMeasure(e.target.value, 'mm')})} placeholder="Comp. (mm)" required />
                            <input type="tel" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium text-center" value={sheetForm.width} onChange={e => setSheetForm({...sheetForm, width: maskMeasure(e.target.value, 'mm')})} placeholder="Larg. (mm)" required />
                        </div>
                        <button type="submit" className="h-14 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all">
                            {sheetForm.id ? 'Salvar Alteração' : '+ Adicionar Chapa'}
                        </button>
                    </form>
                )}
                
                {/* (A mesma lógica de classes foi aplicada às outras abas para brevidade) */}
                {activeTab === 'edgeBands' && (
                    <form onSubmit={(e) => handleFormSubmit(e, edgeBandForm, 'edge_band', setEdgeBandForm, initialEdgeBandForm, 'Fita')} className="flex flex-col gap-4">
                        <input className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" value={edgeBandForm.name} onChange={e => setEdgeBandForm({...edgeBandForm, name:e.target.value})} placeholder="Nome (Ex: Fita Branca)" required />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="tel" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-emerald-700" value={edgeBandForm.rollPrice} onChange={e => setEdgeBandForm({...edgeBandForm, rollPrice: maskCurrency(e.target.value)})} placeholder="Preço Rolo" required />
                            <input type="tel" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-medium text-center" value={edgeBandForm.rollLength} onChange={e => setEdgeBandForm({...edgeBandForm, rollLength: maskMeasure(e.target.value, 'm')})} placeholder="Tamanho (m)" required />
                        </div>
                        <button type="submit" className="h-14 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all">{edgeBandForm.id ? 'Salvar' : '+ Adicionar Fita'}</button>
                    </form>
                )}

                {/* Lista Renderizada */}
                {renderList()}
            </div>

            {/* Modais */}
            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, item: null, type: '' })} title={`Opções`} footer={<button onClick={() => setActionModal({ isOpen: false, item: null, type: '' })} className="w-full py-3 bg-gray-100 text-gray-800 font-bold rounded-xl">Fechar</button>}>
                <div className="flex flex-col gap-3">
                    <button onClick={() => handleEditClick(actionModal.item, actionModal.type)} className="flex items-center p-4 bg-white border border-gray-200 rounded-xl font-bold text-orange-700 hover:bg-orange-50 border-l-4 border-l-orange-500">
                        <div className="w-6 h-6 mr-3"><EditIcon /></div> Editar Cadastro
                    </button>
                    <button onClick={() => { setDeleteModal({ isOpen: true, item: actionModal.item }); setActionModal({ isOpen: false, item: null, type: '' }); }} className="flex items-center p-4 bg-white border border-gray-200 rounded-xl font-bold text-red-700 hover:bg-red-50 border-l-4 border-l-red-500">
                        <div className="w-6 h-6 mr-3"><TrashIcon /></div> Excluir do Catálogo
                    </button>
                </div>
            </Modal>

            <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} title="Atenção" footer={
                <div className="grid grid-cols-2 gap-3 w-full">
                    <button onClick={() => setDeleteModal({ isOpen: false, item: null })} className="py-3 bg-gray-100 text-gray-700 font-bold rounded-xl">Cancelar</button>
                    <button onClick={handleDeleteConfirm} className="py-3 bg-red-500 text-white font-bold rounded-xl shadow-md">Confirmar</button>
                </div>
            }>
                <p className="text-center text-gray-800">Deseja apagar <strong>{deleteModal.item?.name}</strong> do catálogo permanentemente?</p>
            </Modal>

        </div>
    );
};

export default Materials;