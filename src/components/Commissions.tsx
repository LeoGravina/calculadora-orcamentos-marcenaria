import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, Firestore } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/helpers';

// === TYPESCRIPT INTERFACES ===
interface BudgetCommission {
    id: string;
    budgetId: string | number;
    clientName: string;
    projectName: string;
    grandTotal: number;
    developerCommission: number;
    commissionStatus?: string;
    status: string;
    [key: string]: any;
}

interface CommissionsProps {
    db: Firestore | null;
    setCurrentPage: (page: string) => void;
}

const Commissions: React.FC<CommissionsProps> = ({ db, setCurrentPage }) => {
    const [budgets, setBudgets] = useState<BudgetCommission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBudgetsWithCommission = async () => {
            if (!db) return;
            setLoading(true);
            try {
                // Query: Traz apenas orçamentos aprovados/concluídos que geram comissão
                const q = query(
                    collection(db, "budgets"), 
                    where("developerCommission", ">", 0),
                    where("status", "in", ["Aprovado", "Em Produção", "Concluído", "Pago"]) // Adicionei "Pago" por segurança
                );

                const querySnapshot = await getDocs(q);
                let budgetsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetCommission));
                
                budgetsData.sort((a, b) => Number(b.budgetId || 0) - Number(a.budgetId || 0));
                setBudgets(budgetsData);

            } catch (error) {
                console.error("Erro ao buscar orçamentos para comissão:", error);
                toast.error("Falha ao carregar dados de comissão.");
            } finally {
                setLoading(false);
            }
        };

        fetchBudgetsWithCommission();
    }, [db]);

    const handleCommissionStatusChange = async (id: string, newStatus: string) => {
        if (!db) return;
        const toastId = toast.loading('Atualizando status...');
        try {
            const budgetRef = doc(db, 'budgets', id);
            await updateDoc(budgetRef, { commissionStatus: newStatus });
            
            setBudgets(currentBudgets => 
                currentBudgets.map(b => b.id === id ? { ...b, commissionStatus: newStatus } : b)
            );
            toast.success('Status da comissão atualizado!', { id: toastId });
        } catch (error) {
            console.error("Erro ao atualizar status da comissão:", error);
            toast.error('Não foi possível atualizar o status.', { id: toastId });
        }
    };
    
    // Cálculo dos totais
    const commissionTotals = useMemo(() => {
        return budgets.reduce((acc, budget) => {
            const commission = budget.developerCommission || 0;
            if (budget.commissionStatus === 'Pago') {
                acc.paid += commission;
            } else {
                acc.pending += commission;
            }
            return acc;
        }, { paid: 0, pending: 0 });
    }, [budgets]);

    return (
        <div className="flex flex-col items-center px-4 py-6 mx-auto w-full max-w-5xl text-gray-800 pb-20">
            
            {/* Cabeçalho */}
            <div className="flex w-full justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-extrabold text-gray-900">Controle de Comissões</h2>
                <button 
                    onClick={() => setCurrentPage('home')} 
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-200 transition-colors"
                >
                    Voltar
                </button>
            </div>

            <main className="w-full flex flex-col gap-6">
                
                {/* Resumo Financeiro (Dashboard) */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm flex flex-col justify-center border-b-4 border-b-amber-500">
                        <span className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-1">A Receber</span>
                        <div className="text-2xl md:text-3xl font-extrabold text-amber-600">
                            {formatCurrency(commissionTotals.pending)}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm flex flex-col justify-center border-b-4 border-b-emerald-500">
                        <span className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-1">Total Recebido</span>
                        <div className="text-2xl md:text-3xl font-extrabold text-emerald-600">
                            {formatCurrency(commissionTotals.paid)}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b-2 border-gray-50 pb-3">Histórico de Orçamentos</h3>
                    
                    {loading ? (
                        <p className="text-center py-10 text-gray-500 font-medium animate-pulse">Calculando comissões...</p>
                    ) : (
                        <>
                            {/* === MOBILE CARDS === */}
                            <div className="flex flex-col gap-4 md:hidden">
                                {budgets.map(b => (
                                    <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        {/* Barrinha lateral de cor */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${b.commissionStatus === 'Pago' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                        
                                        <div className="flex justify-between items-start mb-2 pl-2">
                                            <div className="flex flex-col">
                                                <strong className="text-gray-900 font-bold text-lg">#{b.budgetId} - {b.clientName}</strong>
                                                <span className="text-sm text-gray-500">{b.projectName}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pl-2 mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-gray-400 uppercase">Comissão (1%)</span>
                                                <span className="text-xl font-extrabold text-blue-600">{formatCurrency(b.developerCommission)}</span>
                                            </div>
                                            
                                            {/* Select de Status Gigante para Mobile */}
                                            <select 
                                                value={b.commissionStatus || 'Não Pago'}
                                                onChange={(e) => handleCommissionStatusChange(b.id, e.target.value)}
                                                className={`h-12 px-4 rounded-xl font-bold text-sm appearance-none border-2 outline-none cursor-pointer
                                                    ${b.commissionStatus === 'Pago' 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:border-emerald-500' 
                                                        : 'bg-amber-50 text-amber-700 border-amber-200 focus:border-amber-500'
                                                    }`}
                                            >
                                                <option value="Não Pago">Não Pago</option>
                                                <option value="Pago">Pago</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* === DESKTOP TABLE === */}
                            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-left bg-white">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                                        <tr>
                                            <th className="p-4 border-b">Nº</th>
                                            <th className="p-4 border-b">Cliente / Projeto</th>
                                            <th className="p-4 border-b text-right">Valor Total</th>
                                            <th className="p-4 border-b text-right">Comissão</th>
                                            <th className="p-4 border-b text-center">Status Pagamento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {budgets.map(b => (
                                            <tr key={b.id} className="hover:bg-gray-50 transition-colors group">
                                                <td className="p-4 font-bold text-gray-600">#{b.budgetId}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <strong className="text-gray-900">{b.clientName}</strong>
                                                        <span className="text-xs text-gray-500">{b.projectName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-gray-600 text-right">{formatCurrency(b.grandTotal)}</td>
                                                <td className="p-4 font-extrabold text-blue-600 text-right">{formatCurrency(b.developerCommission)}</td>
                                                <td className="p-4 text-center">
                                                    <select 
                                                        value={b.commissionStatus || 'Não Pago'}
                                                        onChange={(e) => handleCommissionStatusChange(b.id, e.target.value)}
                                                        className={`px-4 py-2 rounded-lg font-bold text-sm appearance-none border outline-none cursor-pointer
                                                            ${b.commissionStatus === 'Pago' 
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}
                                                    >
                                                        <option value="Não Pago">Não Pago</option>
                                                        <option value="Pago">Pago</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {budgets.length === 0 && (
                                <div className="text-center py-12 px-4 text-gray-500 border border-dashed border-gray-200 rounded-2xl bg-gray-50 mt-4">
                                    <p>Nenhum orçamento apto para comissão encontrado.</p>
                                    <p className="text-sm mt-1 text-gray-400">Apenas orçamentos aprovados aparecem aqui.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Commissions;