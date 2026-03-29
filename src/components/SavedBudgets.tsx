import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, Firestore } from 'firebase/firestore';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { formatCurrency, getImageBase64 } from '../utils/helpers';
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';

// IMPORTAÇÃO DOS REACT ICONS (NOMES CORRIGIDOS)
import { 
    MdOutlineArrowBack, 
    MdOutlineSearch, 
    MdOutlineDownload, 
    MdOutlineEdit, 
    MdOutlineContentCopy, 
    MdOutlineDelete,
    MdOutlinePending,
    MdCheckCircleOutline,
    MdOutlineCancel, // <-- CORRIGIDO AQUI
    MdOutlineAccessTime,
    MdAttachMoney    // <-- CORRIGIDO AQUI (Substituiu o BiCurrencyDollar)
} from 'react-icons/md';

interface SavedBudgetsProps {
    setCurrentPage: (page: string) => void;
    handleEditBudget: (budget: any) => void;
    handleDuplicateBudget: (budget: any) => void;
    db: Firestore | null;
    DADOS_DA_EMPRESA: any;
    logoDaEmpresa: string;
}

export default function SavedBudgets({ setCurrentPage, handleEditBudget, handleDuplicateBudget, db, DADOS_DA_EMPRESA, logoDaEmpresa }: SavedBudgetsProps) {
    const [budgets, setBudgets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, budget: any | null }>({ isOpen: false, budget: null });
    const [searchTerm, setSearchTerm] = useState('');

    const loadBudgets = async () => {
        if (!db) return;
        setIsLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "budgets"));
            const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ordenar dos mais recentes para os mais antigos
            items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setBudgets(items);
        } catch (error) {
            toast.error("Erro ao carregar orçamentos.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBudgets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db]);

    const handleDelete = async () => {
        if (!db || !actionModal.budget) return;
        if (!window.confirm("Tem certeza absoluta que deseja excluir este orçamento?")) return;

        const toastId = toast.loading('Excluindo...');
        try {
            await deleteDoc(doc(db, "budgets", actionModal.budget.id));
            toast.success('Excluído com sucesso.', { id: toastId });
            setActionModal({ isOpen: false, budget: null });
            loadBudgets(); // Recarrega a lista
        } catch (error) {
            toast.error('Erro ao excluir.', { id: toastId });
        }
    };

    const handleDownloadPdf = async () => {
        if (!actionModal.budget) return;
        const toastId = toast.loading('Gerando PDF do Orçamento...');
        try {
            const logo = await getImageBase64(logoDaEmpresa);
            const data = {
                ...actionModal.budget,
                qrCodeImage: qrCodeBase64
            };
            generateBudgetPdf(data, DADOS_DA_EMPRESA, logo);
            toast.success('PDF Gerado com sucesso!', { id: toastId });
            setActionModal({ isOpen: false, budget: null });
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar PDF.', { id: toastId });
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!db || !actionModal.budget) return;
        const toastId = toast.loading('Atualizando status...');
        try {
            await updateDoc(doc(db, "budgets", actionModal.budget.id), { status: newStatus });
            toast.success(`Status atualizado para ${newStatus}`, { id: toastId });
            setActionModal({ isOpen: false, budget: null });
            loadBudgets();
        } catch (e) {
            toast.error('Erro ao atualizar status', { id: toastId });
        }
    };

    const filteredBudgets = budgets.filter(b => 
        b.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.budgetId?.includes(searchTerm)
    );

    return (
        <div className="flex flex-col items-center pb-24 w-full bg-gray-50 min-h-screen">
            <header className="flex flex-col items-center pt-8 pb-6 px-4 w-full bg-white shadow-sm mb-6 rounded-b-3xl border-b border-gray-100">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Orçamentos Salvos</h1>
                <p className="text-gray-500 font-medium text-sm mb-4">Gerenciamento de clientes</p>
                
                {/* BOTÃO VOLTAR */}
                <button 
                    onClick={() => setCurrentPage('home')} 
                    className="flex items-center justify-center pl-4 pr-6 py-2.5 bg-gray-100 text-gray-700 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors w-full max-w-xs active:scale-95"
                >
                    <MdOutlineArrowBack className="w-5 h-5 mr-2 text-gray-500" />
                    Voltar ao Início
                </button>
            </header>

            <main className="flex flex-col gap-4 w-full max-w-3xl px-4">
                
                {/* Barra de Pesquisa */}
                <div className="relative w-full">
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, projeto ou número..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-14 px-5 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none w-full font-medium shadow-sm pr-12"
                    />
                    <MdOutlineSearch className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 pointer-events-none" />
                </div>

                {isLoading ? (
                    <div className="text-center py-10"><p className="text-gray-500 font-bold animate-pulse">Carregando orçamentos...</p></div>
                ) : (
                    <div className="flex flex-col gap-4 mt-2">
                        {filteredBudgets.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-300">
                                <p className="text-gray-400 font-medium">Nenhum orçamento encontrado.</p>
                            </div>
                        ) : (
                            filteredBudgets.map((budget) => (
                                <div 
                                    key={budget.id} 
                                    onClick={() => setActionModal({ isOpen: true, budget })} 
                                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                                >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${budget.status === 'Aprovado' ? 'bg-emerald-500' : budget.status === 'Recusado' ? 'bg-red-500' : 'bg-amber-400'}`}></div>
                                    
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">#{budget.budgetId || '000'}</span>
                                            <strong className="text-gray-900 font-bold text-lg leading-tight">{budget.clientName}</strong>
                                        </div>
                                        
                                        {/* STATUS BADGE */}
                                        <span className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-md ${budget.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-800' : budget.status === 'Recusado' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {budget.status === 'Aprovado' ? <MdCheckCircleOutline className="w-3.5 h-3.5 opacity-70" /> : budget.status === 'Recusado' ? <MdOutlineCancel className="w-3.5 h-3.5 opacity-70" /> : <MdOutlineAccessTime className="w-3.5 h-3.5 opacity-70" />}
                                            {budget.status || 'Pendente'}
                                        </span>
                                    </div>
                                    
                                    <p className="text-sm text-gray-600 font-medium mb-4">{budget.projectName || 'Sem descrição de projeto'}</p>
                                    
                                    <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                                        <span className="text-xs font-bold text-gray-400">Total:</span>
                                        {/* VALOR COM MdAttachMoney */}
                                        <div className="flex items-center font-black text-blue-700 text-xl tracking-tight">
                                            <MdAttachMoney className="w-5 h-5 mr-0.5 text-blue-300 pointer-events-none" />
                                            {formatCurrency(budget.finalValue || budget.finalBudgetPrice || 0)}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* MODAL DE AÇÕES */}
            <Modal 
                isOpen={actionModal.isOpen} 
                onClose={() => setActionModal({ isOpen: false, budget: null })} 
                title={`Opções: ${actionModal.budget?.clientName?.split(' ')[0] || ''}`}
                footer={<button onClick={() => setActionModal({ isOpen: false, budget: null })} className="w-full py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Fechar</button>}
            >
                <div className="flex flex-col gap-3 pb-2">
                    
                    {/* Status Toggle */}
                    <div className="flex gap-2 mb-2 p-1 bg-gray-50 rounded-xl border border-gray-200">
                        {[
                            {s: 'Pendente', i: <MdOutlinePending className="w-4 h-4 mr-1.5 opacity-70" />},
                            {s: 'Aprovado', i: <MdCheckCircleOutline className="w-4 h-4 mr-1.5 opacity-70" />},
                            {s: 'Recusado', i: <MdOutlineCancel className="w-4 h-4 mr-1.5 opacity-70" />}
                        ].map(item => (
                            <button 
                                key={item.s}
                                onClick={() => handleStatusChange(item.s)}
                                className={`flex items-center justify-center flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${actionModal.budget?.status === item.s ? (item.s === 'Aprovado' ? 'bg-emerald-500 text-white shadow-sm' : item.s === 'Recusado' ? 'bg-red-500 text-white shadow-sm' : 'bg-amber-400 text-amber-950 shadow-sm') : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                                {item.i}
                                {item.s}
                            </button>
                        ))}
                    </div>

                    {/* BOTÕES DE AÇÃO */}
                    <button 
                        onClick={() => { handleEditBudget(actionModal.budget); setActionModal({ isOpen: false, budget: null }); }} 
                        className="flex items-center justify-center py-4 w-full font-bold border-2 border-orange-500 rounded-xl bg-white text-orange-600 hover:bg-orange-50 transition-all shadow-sm active:scale-98"
                    >
                        <MdOutlineEdit className="w-5 h-5 mr-3 text-orange-400" />
                        Editar Orçamento
                    </button>
                    
                    <button 
                        onClick={handleDownloadPdf} 
                        className="flex items-center justify-center py-4 w-full font-bold border-2 border-blue-200 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all shadow-sm active:scale-98"
                    >
                        <MdOutlineDownload className="w-5 h-5 mr-3 text-blue-500" />
                        Baixar PDF
                    </button>

                    <button 
                        onClick={() => { handleDuplicateBudget(actionModal.budget); setActionModal({ isOpen: false, budget: null }); }} 
                        className="flex items-center justify-center py-4 w-full font-bold border-2 border-purple-500 rounded-xl bg-white text-purple-600 hover:bg-purple-50 transition-all shadow-sm active:scale-98"
                    >
                        <MdOutlineContentCopy className="w-5 h-5 mr-3 text-purple-400" />
                        Duplicar
                    </button>

                    <button 
                        onClick={handleDelete} 
                        className="flex items-center justify-center py-4 w-full font-bold border-2 border-red-500 rounded-xl bg-white text-red-600 hover:bg-red-50 mt-2 transition-all shadow-sm active:scale-98"
                    >
                        <MdOutlineDelete className="w-5 h-5 mr-3 text-red-400" />
                        Excluir
                    </button>
                </div>
            </Modal>
        </div>
    );
}