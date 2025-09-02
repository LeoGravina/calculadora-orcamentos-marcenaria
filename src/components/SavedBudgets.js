// ARQUIVO COMPLETO E ATUALIZADO: src/components/SavedBudgets.js

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon, DownloadIcon, DuplicateIcon } from './icons';
import { getImageBase64, formatCurrency } from '../utils/helpers';
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';
import Modal from './Modal'; // NOVO: Importa o componente Modal

const SavedBudgets = ({ setCurrentPage, handleEditBudget, handleDuplicateBudget, db, DADOS_DA_EMPRESA, logoDaEmpresa }) => {
    const [budgets, setBudgets] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // NOVO: State para controlar o modal de confirmação
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const statusOptions = ['Pendente', 'Aprovado', 'Em Produção', 'Concluído', 'Recusado'];

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
    
    // NOVO: Função para fechar o modal
    const closeModal = () => {
        setModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };

    // NOVO: Função que efetivamente deleta após a confirmação no modal
    const handleDeleteConfirm = async (id, budgetId) => {
        const toastId = toast.loading('Excluindo orçamento...');
        try {
            await deleteDoc(doc(db, "budgets", id));
            toast.success(`Orçamento Nº ${budgetId} excluído!`, { id: toastId });
            closeModal();
            fetchBudgets(); // Re-busca a lista atualizada
        }
        catch (error) {
            console.error("Erro ao excluir:", error);
            toast.error("Erro ao excluir o orçamento.", { id: toastId });
            closeModal();
        }
    };

    // MUDANÇA: Função de delete agora apenas ABRE o modal
    const handleDelete = (id, budgetId) => {
        setModalState({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir o orçamento Nº ${budgetId}? Esta ação não pode ser desfeita.`,
            onConfirm: () => handleDeleteConfirm(id, budgetId)
        });
    };

    const handleDownloadPdf = async (budgetToDownload) => {
        try {
            const logoBase64 = await getImageBase64(logoDaEmpresa);
            const budgetWithQr = {
                ...budgetToDownload,
                qrCodeImage: qrCodeBase64
            };
            generateBudgetPdf(budgetWithQr, DADOS_DA_EMPRESA, logoBase64);
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast.error("Ocorreu um erro ao gerar o PDF.");
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        const toastId = toast.loading('Atualizando status...');
        try {
            const budgetRef = doc(db, 'budgets', id);
            await updateDoc(budgetRef, {
                status: newStatus
            });
            setBudgets(currentBudgets => 
                currentBudgets.map(b => 
                    b.id === id ? { ...b, status: newStatus } : b
                )
            );
            toast.success('Status atualizado!', { id: toastId });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            toast.error('Não foi possível atualizar o status.', { id: toastId });
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
                                    <th>Status</th>
                                    <th className="th-value">Valor</th>
                                    <th className="th-actions">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {budgets.length > 0 ? budgets.map(b => {
                                    // LÓGICA ADICIONADA: Decide qual total deve ser exibido na tabela.
                                    // Usa o 'finalBudgetPrice' se ele existir; senão, usa o 'grandTotal'.
                                    const displayTotal = b.finalBudgetPrice ? b.finalBudgetPrice : b.grandTotal;

                                    return (
                                        <tr key={b.id}>
                                            <td>{b.budgetId || 'N/A'}</td>
                                            <td className="td-name">{b.clientName}</td>
                                            <td>{b.projectName}</td>
                                            <td>
                                                <select 
                                                    value={b.status || 'Pendente'} 
                                                    onChange={(e) => handleStatusChange(b.id, e.target.value)}
                                                    className={`status-select status-${(b.status || 'Pendente').replace(' ', '-')}`}
                                                >
                                                    {statusOptions.map(option => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            {/* LINHA ALTERADA: Agora usa a variável 'displayTotal' */}
                                            <td className="td-value">{formatCurrency(displayTotal || 0)}</td>
                                            <td className="actions">
                                                <button onClick={() => handleDownloadPdf(b)} className="icon-button download" title="Baixar PDF"><DownloadIcon /></button>
                                                <button onClick={() => handleDuplicateBudget(b)} className="icon-button duplicate" title="Duplicar"><DuplicateIcon /></button>
                                                <button onClick={() => handleEditBudget(b)} className="icon-button edit" title="Editar"><EditIcon /></button>
                                                <button onClick={() => handleDelete(b.id, b.budgetId)} className="icon-button delete" title="Excluir"><TrashIcon/></button>
                                            </td>
                                        </tr>
                                    );
                                }) : (
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

            {/* NOVO: Renderiza o componente Modal no final */}
            <Modal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
            >
                <p>{modalState.message}</p>
            </Modal>
        </main>
    );
};

export default SavedBudgets;