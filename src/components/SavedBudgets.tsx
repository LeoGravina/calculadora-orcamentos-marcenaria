import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc, Firestore } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon, DownloadIcon, DuplicateIcon } from './icons';
import { getImageBase64, formatCurrency } from '../utils/helpers';
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';
import Modal from './Modal';

// --- TYPESCRIPT: Interfaces ---
interface Budget {
    id: string;
    budgetId: string | number;
    clientName: string;
    projectName: string;
    status?: string;
    finalBudgetPrice?: number;
    grandTotal?: number;
    [key: string]: any; // Permite outros dados flexíveis do orçamento
}

interface SavedBudgetsProps {
    setCurrentPage: (page: string) => void;
    handleEditBudget: (budget: Budget) => void;
    handleDuplicateBudget: (budget: Budget) => void;
    db: Firestore | null;
    DADOS_DA_EMPRESA: any;
    logoDaEmpresa: string;
}

const statusOptions = ['Pendente', 'Aprovado', 'Em Produção', 'Concluído', 'Recusado'];

// Função auxiliar para as cores do Tailwind baseadas no status
const getStatusClasses = (status: string) => {
    switch (status) {
        case 'Aprovado':
        case 'Pago': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'Em Produção': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'Recusado': return 'bg-red-100 text-red-800 border-red-200';
        case 'Concluído': return 'bg-gray-100 text-gray-700 border-gray-300';
        default: return 'bg-amber-100 text-amber-800 border-amber-200'; // Pendente
    }
};

const SavedBudgets: React.FC<SavedBudgetsProps> = ({ 
    setCurrentPage, handleEditBudget, handleDuplicateBudget, db, DADOS_DA_EMPRESA, logoDaEmpresa 
}) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', budgetId: '', clientName: '' });
    const [actionModal, setActionModal] = useState<{isOpen: boolean, budget: Budget | null}>({ isOpen: false, budget: null });

    const fetchBudgets = useCallback(async () => {
        if (!db) return;
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "budgets"));
            let budgetsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));

            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                budgetsData = budgetsData.filter(b =>
                    b.clientName.toLowerCase().includes(lowerTerm) ||
                    b.projectName.toLowerCase().includes(lowerTerm)
                );
            }

            if (statusFilter) {
                budgetsData = budgetsData.filter(b => (b.status || 'Pendente') === statusFilter);
            }

            budgetsData.sort((a, b) => Number(b.budgetId || 0) - Number(a.budgetId || 0));
            setBudgets(budgetsData);
        } catch (error) { 
            toast.error("Falha ao carregar orçamentos."); 
        } finally { 
            setLoading(false); 
        }
    }, [db, searchTerm, statusFilter]);

    useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

    const handleDeleteConfirm = async () => {
        if (!db) return;
        const { id, budgetId } = deleteModal;
        const toastId = toast.loading('Excluindo...');
        try {
            await deleteDoc(doc(db, "budgets", id));
            toast.success(`Orçamento ${budgetId} excluído!`, { id: toastId });
            setDeleteModal({ isOpen: false, id: '', budgetId: '', clientName: '' });
            fetchBudgets();
        } catch (error) { toast.error("Erro ao excluir.", { id: toastId }); }
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
        e.stopPropagation();
        if (!db) return;
        const newStatus = e.target.value;
        try {
            await updateDoc(doc(db, 'budgets', id), { status: newStatus });
            setBudgets(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
            toast.success('Status atualizado!');
        } catch (error) { toast.error('Erro ao atualizar status.'); }
    };

    return (
        <div className="flex flex-col items-center px-4 py-6 mx-auto w-full max-w-5xl text-gray-800 mb-20">
            
            {/* Cabeçalho */}
            <header className="flex flex-col items-center mb-6 w-full">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Gerenciamento</h1>
                <img src={logoDaEmpresa} alt="Logo" className="w-20 h-20 rounded-full border-2 border-white shadow-md mb-4 bg-black" />
                <button 
                    onClick={() => setCurrentPage('home')} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 hover:text-amber-600 transition-all font-bold text-sm"
                >
                    <span>← Voltar ao Início</span>
                </button>
            </header>

            <main className="w-full">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 border-b-2 border-gray-50 pb-3 mb-4">Orçamentos Salvos</h2>
                    
                    {/* Filtros Mobile-First (Empilhados no celular, lado a lado no PC) */}
                    <div className="flex flex-col md:flex-row gap-3 mb-6">
                        <input 
                            type="text" 
                            placeholder="Buscar cliente ou projeto..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full md:flex-1 h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all"
                        />
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)} 
                            className="w-full md:w-48 h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer transition-all"
                        >
                            <option value="">Todos os Status</option>
                            {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    {loading ? (
                        <p className="text-center py-10 text-gray-500 font-medium animate-pulse">Carregando orçamentos...</p>
                    ) : (
                        <>
                            {/* === VISÃO MOBILE (CARDS) === */}
                            {/* A classe 'md:hidden' esconde isso no PC e mostra só no celular */}
                            <div className="flex flex-col gap-4 md:hidden">
                                {budgets.map(b => (
                                    <div 
                                        key={b.id} 
                                        onClick={() => setActionModal({ isOpen: true, budget: b })}
                                        className="relative bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform overflow-hidden"
                                    >
                                        {/* Barra colorida na esquerda do card indicando o status */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusClasses(b.status || 'Pendente').split(' ')[0]}`}></div>
                                        
                                        <div className="flex justify-between items-start mb-2 pl-2">
                                            <strong className="text-gray-900 font-bold truncate pr-2">#{b.budgetId} - {b.clientName}</strong>
                                            
                                            {/* Select de Status super amigável para o toque */}
                                            <select 
                                                value={b.status || 'Pendente'} 
                                                onChange={(e) => handleStatusChange(e, b.id)} 
                                                onClick={(e) => e.stopPropagation()} 
                                                className={`text-xs font-bold px-2 py-1.5 rounded-lg border appearance-none text-center ${getStatusClasses(b.status || 'Pendente')}`}
                                            >
                                                {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        
                                        <div className="flex justify-between items-end pl-2 mt-3">
                                            <span className="text-sm text-gray-500 truncate w-1/2">{b.projectName}</span>
                                            <span className="text-lg font-extrabold text-gray-800">{formatCurrency(b.finalBudgetPrice || b.grandTotal || 0)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* === VISÃO DESKTOP (TABELA) === */}
                            {/* A classe 'hidden md:block' esconde no celular e mostra no PC */}
                            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                                        <tr>
                                            <th className="p-4 border-b border-gray-200">Nº</th>
                                            <th className="p-4 border-b border-gray-200">Cliente</th>
                                            <th className="p-4 border-b border-gray-200">Projeto</th>
                                            <th className="p-4 border-b border-gray-200">Status</th>
                                            <th className="p-4 border-b border-gray-200 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {budgets.map(b => (
                                            <tr key={b.id} onClick={() => setActionModal({ isOpen: true, budget: b })} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                                                <td className="p-4 text-gray-600 font-medium">#{b.budgetId}</td>
                                                <td className="p-4 font-bold text-gray-900">{b.clientName}</td>
                                                <td className="p-4 text-gray-600">{b.projectName}</td>
                                                <td className="p-4">
                                                    <select 
                                                        value={b.status || 'Pendente'} 
                                                        onChange={(e) => handleStatusChange(e, b.id)} 
                                                        onClick={(e) => e.stopPropagation()} 
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border appearance-none cursor-pointer ${getStatusClasses(b.status || 'Pendente')}`}
                                                    >
                                                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-4 font-extrabold text-gray-900 text-right">{formatCurrency(b.finalBudgetPrice || b.grandTotal || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Estado Vazio */}
                            {budgets.length === 0 && (
                                <div className="text-center py-12 px-4 text-gray-500">
                                    <p className="mb-4">Nenhum orçamento encontrado com esses filtros.</p>
                                    {(searchTerm || statusFilter) && (
                                        <button 
                                            onClick={() => {setSearchTerm(''); setStatusFilter('');}} 
                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors"
                                        >
                                            Limpar Filtros
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* MODAIS: (Seu componente Modal.js vai precisar ser ajustado para Tailwind depois, mas a chamada fica igual) */}
                <Modal 
                    isOpen={actionModal.isOpen} 
                    onClose={() => setActionModal({ isOpen: false, budget: null })} 
                    title={`Opções: ${actionModal.budget?.clientName || ''}`} 
                    footer={<button onClick={() => setActionModal({ isOpen: false, budget: null })} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors">Fechar</button>}
                >
                    <div className="flex flex-col gap-3 pb-2">
                        <button onClick={() => { handleEditBudget(actionModal.budget!); setActionModal({isOpen: false, budget: null}); }} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-orange-50 border-l-4 border-l-orange-500 text-orange-700 transition-all shadow-sm">
                            <div className="w-6 h-6 mr-3"><EditIcon /></div> Editar Orçamento
                        </button>
                        <button onClick={() => {/* Lógica de PDF */}} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-blue-50 border-l-4 border-l-blue-500 text-blue-700 transition-all shadow-sm">
                            <div className="w-6 h-6 mr-3"><DownloadIcon /></div> Baixar PDF
                        </button>
                        <button onClick={() => { handleDuplicateBudget(actionModal.budget!); setActionModal({isOpen: false, budget: null}); }} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-purple-50 border-l-4 border-l-purple-500 text-purple-700 transition-all shadow-sm">
                            <div className="w-6 h-6 mr-3"><DuplicateIcon /></div> Duplicar
                        </button>
                        <button onClick={() => { setDeleteModal({ isOpen: true, id: actionModal.budget!.id, budgetId: String(actionModal.budget!.budgetId), clientName: actionModal.budget!.clientName }); setActionModal({isOpen: false, budget: null}); }} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-red-50 border-l-4 border-l-red-500 text-red-700 mt-2 transition-all shadow-sm">
                            <div className="w-6 h-6 mr-3"><TrashIcon /></div> Excluir
                        </button>
                    </div>
                </Modal>

                <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: '', budgetId: '', clientName: '' })} title="Confirmar Exclusão" footer={
                    <div className="grid grid-cols-2 gap-3 w-full mt-4">
                        <button onClick={() => setDeleteModal({ isOpen: false, id: '', budgetId: '', clientName: '' })} className="py-3 bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200">Cancelar</button>
                        <button onClick={handleDeleteConfirm} className="py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md">Excluir</button>
                    </div>
                }>
                    <p className="text-center text-lg text-gray-800">Tem certeza que deseja apagar o orçamento de <strong className="text-red-600">{deleteModal.clientName}</strong>?</p>
                    <p className="text-center text-sm text-gray-500 mt-2">Não será possível recuperar depois.</p>
                </Modal>
            </main>
        </div>
    );
};

export default SavedBudgets;