// src/components/Commissions.js - ATUALIZADO

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/helpers';

const Commissions = ({ db, setCurrentPage }) => {
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBudgetsWithCommission = async () => {
            setLoading(true);
            try {
                // QUERY ATUALIZADA AQUI:
                // Agora, busca apenas orçamentos que podem gerar comissão real.
                const q = query(
                    collection(db, "budgets"), 
                    where("developerCommission", ">", 0),
                    where("status", "in", ["Aprovado", "Em Produção", "Concluído"])
                );

                const querySnapshot = await getDocs(q);
                let budgetsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                budgetsData.sort((a, b) => (b.budgetId || 0) - (a.budgetId || 0));
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

    const handleCommissionStatusChange = async (id, newStatus) => {
        const toastId = toast.loading('Atualizando status...');
        try {
            const budgetRef = doc(db, 'budgets', id);
            await updateDoc(budgetRef, { commissionStatus: newStatus });
            
            setBudgets(currentBudgets => 
                currentBudgets.map(b => 
                    b.id === id ? { ...b, commissionStatus: newStatus } : b
                )
            );
            toast.success('Status da comissão atualizado!', { id: toastId });
        } catch (error) {
            console.error("Erro ao atualizar status da comissão:", error);
            toast.error('Não foi possível atualizar o status.', { id: toastId });
        }
    };
    
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
        <main className="main-content">
            <div className="card">
                <div className="card-header-with-button">
                    <h2 className="section-title">Controle de Comissões</h2>
                    <button onClick={() => setCurrentPage('home')} className="btn btn-secondary btn-small-back">
                        Voltar à Página Inicial
                    </button>
                </div>

                <div className="commission-summary">
                    <div className="summary-box">
                        <h3>A Receber</h3>
                        <p>{formatCurrency(commissionTotals.pending)}</p>
                    </div>
                    <div className="summary-box">
                        <h3>Total Recebido</h3>
                        <p>{formatCurrency(commissionTotals.paid)}</p>
                    </div>
                </div>

                {loading ? <p>Carregando...</p> : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nº Orçam.</th>
                                    <th className="th-name">Cliente</th>
                                    <th>Móvel/Projeto</th>
                                    <th className="th-value">Valor Total</th>
                                    <th className="th-value">Comissão (1%)</th>
                                    <th>Status Pagamento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {budgets.length > 0 ? budgets.map(b => (
                                    <tr key={b.id}>
                                        <td>{b.budgetId}</td>
                                        <td className="td-name">{b.clientName}</td>
                                        <td>{b.projectName}</td>
                                        <td className="td-value">{formatCurrency(b.grandTotal)}</td>
                                        <td className="td-value commission-value">{formatCurrency(b.developerCommission)}</td>
                                        <td>
                                            <select 
                                                value={b.commissionStatus || 'Não Pago'}
                                                onChange={(e) => handleCommissionStatusChange(b.id, e.target.value)}
                                                className={`status-select status-${(b.commissionStatus || 'Não Pago').replace(' ', '-')}`}
                                            >
                                                <option value="Não Pago">Não Pago</option>
                                                <option value="Pago">Pago</option>
                                            </select>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>
                                            Nenhum orçamento apto para comissão encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
};

export default Commissions;