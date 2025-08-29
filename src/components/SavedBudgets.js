// ARQUIVO COMPLETO PARA: src/components/SavedBudgets.js

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon, DownloadIcon } from './icons';
import { getImageBase64, formatCurrency } from '../utils/helpers';
import generateBudgetPdf from '../utils/pdfGenerator';

const SavedBudgets = ({ setCurrentPage, handleEditBudget, db, DADOS_DA_EMPRESA, logoDaEmpresa }) => {
    const [budgets, setBudgets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchBudgets = useCallback(async () => {
        setLoading(true);
        try {
            const budgetsCollection = collection(db, "budgets");
            const querySnapshot = await getDocs(budgetsCollection);
            let budgetsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (searchTerm) {
                budgetsData = budgetsData.filter(budget =>
                    budget.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    budget.projectName.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            budgetsData.sort((a, b) => (b.budgetId || 0) - (a.budgetId || 0));
            setBudgets(budgetsData);

        } catch (error) {
            console.error("Erro ao buscar orçamentos:", error);
            toast.error("Falha ao carregar os orçamentos.");
        } finally {
            setLoading(false);
        }
    }, [db, searchTerm]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const handleDelete = async (id, budgetId) => {
        if (window.confirm(`Tem certeza que deseja excluir o orçamento Nº ${budgetId}?`)) {
            const toastId = toast.loading('Excluindo orçamento...');
            try {
                await deleteDoc(doc(db, "budgets", id));
                toast.success(`Orçamento Nº ${budgetId} excluído!`, { id: toastId });
                fetchBudgets();
            }
            catch (error) {
                console.error("Erro ao excluir:", error);
                toast.error("Erro ao excluir o orçamento.", { id: toastId });
            }
        }
    };

    const handleDownloadPdf = async (budgetToDownload) => {
        try {
            const logoBase64 = await getImageBase64(logoDaEmpresa);
            generateBudgetPdf(budgetToDownload, DADOS_DA_EMPRESA, logoBase64);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Ocorreu um erro ao gerar o PDF.");
        }
    };

    return (
        <main className="main-content">
            <div className="card">
                <div className="card-header-with-button">
                    <h2 className="section-title">Orçamentos Salvos</h2>
                    <button onClick={() => setCurrentPage('home')} className="btn btn-secondary btn-small-back">
                        Voltar à Página Inicial
                    </button>
                </div>
                <div className="form-group">
                    <label>Buscar por cliente ou projeto</label>
                    <input
                        type="text"
                        placeholder="Digite o nome para buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? <p>Carregando orçamentos...</p> : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nº</th>
                                    <th className="th-name">Cliente</th>
                                    <th>Projeto</th>
                                    <th>Data</th>
                                    <th className="th-value">Valor</th>
                                    <th className="th-actions">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {budgets.length > 0 ? budgets.map(b => (
                                    <tr key={b.id}>
                                        <td>{b.budgetId || 'N/A'}</td>
                                        <td className="td-name">{b.clientName}</td>
                                        <td>{b.projectName}</td>
                                        <td>{new Date(b.createdAt).toLocaleDateString('pt-BR')}</td>
                                        <td className="td-value">{formatCurrency(b.grandTotal || 0)}</td>
                                        <td className="actions">
                                            <button onClick={() => handleDownloadPdf(b)} className="icon-button" title="Baixar PDF"><DownloadIcon /></button>
                                            <button onClick={() => handleEditBudget(b)} className="icon-button" title="Editar"><EditIcon /></button>
                                            <button onClick={() => handleDelete(b.id, b.budgetId)} className="icon-button delete" title="Excluir"><TrashIcon/></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>
                                            Nenhum orçamento encontrado.
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

export default SavedBudgets;