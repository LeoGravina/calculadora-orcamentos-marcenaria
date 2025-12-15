import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon, DownloadIcon, DuplicateIcon } from './icons';
import { getImageBase64, formatCurrency } from '../utils/helpers';
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';
import Modal from './Modal';

const SavedBudgets = ({ setCurrentPage, handleEditBudget, handleDuplicateBudget, db, DADOS_DA_EMPRESA, logoDaEmpresa }) => {
    const [budgets, setBudgets] = useState([]);
    
    // --- NOVOS ESTADOS DE FILTRO ---
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // Começa vazio (Mostra tudo)
    // -------------------------------

    const [loading, setLoading] = useState(true);
    
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, budgetId: '', clientName: '' });
    const [actionModal, setActionModal] = useState({ isOpen: false, budget: null });

    const statusOptions = ['Pendente', 'Aprovado', 'Em Produção', 'Concluído', 'Recusado'];

    const fetchBudgets = useCallback(async () => {
        setLoading(true);
        try {
            const budgetsCollection = collection(db, "budgets");
            const querySnapshot = await getDocs(budgetsCollection);
            let budgetsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // --- LÓGICA DE FILTRAGEM DUPLA (TEXTO + STATUS) ---
            
            // 1. Filtro de Texto (Nome do Cliente ou Projeto)
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                budgetsData = budgetsData.filter(budget =>
                    budget.clientName.toLowerCase().includes(lowerTerm) ||
                    budget.projectName.toLowerCase().includes(lowerTerm)
                );
            }

            // 2. Filtro de Status (Se não estiver vazio)
            if (statusFilter) {
                budgetsData = budgetsData.filter(budget => 
                    (budget.status || 'Pendente') === statusFilter
                );
            }
            // --------------------------------------------------

            budgetsData.sort((a, b) => (b.budgetId || 0) - (a.budgetId || 0));
            setBudgets(budgetsData);
        } catch (error) { toast.error("Falha ao carregar orçamentos."); } finally { setLoading(false); }
    }, [db, searchTerm, statusFilter]); // Adicionei statusFilter nas dependências

    useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

    const handleDeleteConfirm = async () => {
        const { id, budgetId } = deleteModal;
        const toastId = toast.loading('Excluindo...');
        try {
            await deleteDoc(doc(db, "budgets", id));
            toast.success(`Orçamento ${budgetId} excluído!`, { id: toastId });
            setDeleteModal({ isOpen: false, id: null, budgetId: '', clientName: '' });
            fetchBudgets();
        } catch (error) { toast.error("Erro ao excluir.", { id: toastId }); }
    };

    const handleDeleteClick = (id, budgetId, clientName) => {
        setActionModal({ isOpen: false, budget: null });
        setTimeout(() => setDeleteModal({ isOpen: true, id, budgetId, clientName }), 100);
    };

    const handleDownloadPdf = async (budgetToDownload) => {
        const toastId = toast.loading('Gerando PDF...');
        try {
            const logoBase64 = await getImageBase64(logoDaEmpresa);
            const budgetWithQr = { ...budgetToDownload, qrCodeImage: qrCodeBase64 };
            generateBudgetPdf(budgetWithQr, DADOS_DA_EMPRESA, logoBase64);
            toast.success('PDF Gerado!', { id: toastId });
            setActionModal({ isOpen: false, budget: null });
        } catch (error) { toast.error("Erro ao gerar PDF.", { id: toastId }); }
    };

    const handleStatusChange = async (e, id) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        try {
            const budgetRef = doc(db, 'budgets', id);
            await updateDoc(budgetRef, { status: newStatus });
            // Atualiza localmente para não precisar recarregar tudo do banco
            setBudgets(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
            toast.success('Status atualizado!');
        } catch (error) { toast.error('Erro ao atualizar status.'); }
    };

    return (
        <div>
            <header className="app-header">
                <h1>Gerenciamento</h1>
                <img src={logoDaEmpresa} alt="Logo" className="app-logo" style={{marginTop: '10px', marginBottom: '15px'}} />
                <button onClick={() => setCurrentPage('home')} className="btn btn-secondary btn-small-back">
                    Voltar ao Início
                </button>
            </header>

            <main className="main-content">
                <div className="card">
                    <h2 className="section-title">Orçamentos Salvos</h2>
                    
                    {/* --- ÁREA DE FILTROS LADO A LADO --- */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                        
                        {/* Barra de Pesquisa (Cresce para ocupar espaço) */}
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <input 
                                type="text" 
                                placeholder="Buscar cliente ou projeto..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="form-input-style" 
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* Dropdown de Status (Tamanho fixo ou auto) */}
                        <div style={{ flex: '0 0 auto', minWidth: '150px' }}>
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)} 
                                className="form-input-style"
                                style={{ width: '100%', cursor: 'pointer' }}
                            >
                                <option value="">Todos os Status</option>
                                {statusOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* ----------------------------------- */}

                    {loading ? <p style={{textAlign:'center'}}>Carregando...</p> : (
                        <>
                            <div className="table-container desktop-only-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nº</th>
                                            <th className="th-name">Cliente</th>
                                            <th>Projeto</th>
                                            <th>Status</th>
                                            <th className="th-value">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {budgets.map(b => (
                                            <tr key={b.id} onClick={() => setActionModal({ isOpen: true, budget: b })} title="Clique para opções">
                                                <td>{b.budgetId}</td>
                                                <td className="td-name">{b.clientName}</td>
                                                <td>{b.projectName}</td>
                                                <td>
                                                    <select value={b.status || 'Pendente'} onChange={(e) => handleStatusChange(e, b.id)} onClick={(e) => e.stopPropagation()} className={`status-select status-${(b.status || 'Pendente').replace(' ', '-')}`}>
                                                        {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </td>
                                                <td className="td-value">{formatCurrency(b.finalBudgetPrice || b.grandTotal || 0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mobile-only-cards">
                                {budgets.map(b => (
                                    <div className="item-card" key={b.id} onClick={() => setActionModal({ isOpen: true, budget: b })}>
                                        <div className="item-card-header">
                                            <strong>#{b.budgetId} - {b.clientName}</strong>
                                            <select value={b.status || 'Pendente'} onChange={(e) => handleStatusChange(e, b.id)} onClick={(e) => e.stopPropagation()} className={`status-select status-${(b.status || 'Pendente').replace(' ', '-')}`} style={{fontSize: '0.75rem', padding: '4px 24px 4px 8px'}}>
                                                {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                        <div className="item-card-body">
                                            <span>{b.projectName}</span>
                                            <span className="item-cost">{formatCurrency(b.finalBudgetPrice || b.grandTotal || 0)}</span>
                                        </div>
                                        <div className="item-card-footer">Toque para opções</div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* MENSAGEM QUANDO O FILTRO NÃO ACHA NADA */}
                            {budgets.length === 0 && (
                                <div style={{textAlign: 'center', padding: '2rem', color: '#666'}}>
                                    <p>Nenhum orçamento encontrado com esses filtros.</p>
                                    {(searchTerm || statusFilter) && (
                                        <button 
                                            onClick={() => {setSearchTerm(''); setStatusFilter('');}} 
                                            className="btn btn-secondary" 
                                            style={{marginTop: '10px', fontSize: '0.9rem'}}
                                        >
                                            Limpar Filtros
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, budget: null })} title={`Opções: ${actionModal.budget?.clientName || ''}`} footer={<button onClick={() => setActionModal({ isOpen: false, budget: null })} className="btn btn-secondary" style={{width:'100%'}}>Fechar</button>}>
                    <div className="action-menu-grid">
                        <button onClick={() => handleEditBudget(actionModal.budget)} className="btn-action-menu edit"><EditIcon /> <span>Editar Orçamento</span></button>
                        <button onClick={() => handleDownloadPdf(actionModal.budget)} className="btn-action-menu download"><DownloadIcon /> <span>Baixar PDF</span></button>
                        <button onClick={() => handleDuplicateBudget(actionModal.budget)} className="btn-action-menu duplicate"><DuplicateIcon /> <span>Duplicar</span></button>
                        <button onClick={() => handleDeleteClick(actionModal.budget?.id, actionModal.budget?.budgetId, actionModal.budget?.clientName)} className="btn-action-menu delete"><TrashIcon /> <span>Excluir</span></button>
                    </div>
                </Modal>

                <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, budgetId: '', clientName: '' })} title="Confirmar Exclusão" footer={<div className="modal-actions-grid"><button onClick={() => setDeleteModal({ isOpen: false, id: null, budgetId: '', clientName: '' })} className="btn-modal-cancel">Cancelar</button><button onClick={handleDeleteConfirm} className="btn-modal-confirm">Excluir</button></div>}>
                    <div className="delete-msg">Tem certeza que deseja apagar o orçamento de <strong>{deleteModal.clientName}</strong>?<br/><small style={{fontSize:'0.9rem', color:'#666'}}>Não será possível recuperar depois.</small></div>
                </Modal>
            </main>
        </div>
    );
};

export default SavedBudgets;