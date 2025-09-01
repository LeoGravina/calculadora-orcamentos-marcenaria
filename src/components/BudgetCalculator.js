import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { doc, getDoc, runTransaction, addDoc, updateDoc, collection } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from './icons';
import { getImageBase64, formatCurrency } from '../utils/helpers';
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';
import Modal from './Modal';

const BudgetCalculator = ({ setCurrentPage, budgetToEdit, clearEditingBudget, db, DADOS_DA_EMPRESA, logoDaEmpresa }) => {
    const [editingId, setEditingId] = useState(null);
    const [budgetId, setBudgetId] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [profitMargin, setProfitMargin] = useState(180);
    const [helperCost, setHelperCost] = useState('');
    const [deliveryFee, setDeliveryFee] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [sheets, setSheets] = useState([{ id: 'default-sheet', name: 'Chapa Padrão', price: 350, length: 2750, width: 1850 }]);
    const [sheetForm, setSheetForm] = useState({ id: null, name: '', price: '', length: '', width: '' });
    const [pieces, setPieces] = useState([]);
    const initialPieceForm = { id: null, name: '', length: '', width: '', qty: 1, sheetId: 'default-sheet', bandL1: false, bandW1: false, bandL2: false, bandW2: false };
    const [pieceForm, setPieceForm] = useState(initialPieceForm);
    const [hardware, setHardware] = useState([]);
    const [hardwareForm, setHardwareForm] = useState({ id: null, name: '', boxQty: '', boxPrice: '', usedQty: '' });
    
    // NOVO: State para itens unitários
    const [unitItems, setUnitItems] = useState([]);
    const [unitItemForm, setUnitItemForm] = useState({ id: null, name: '', unitPrice: '', qty: '' });

    const [borderTapes, setBorderTapes] = useState([{ id: 'default-tape', name: 'Fita Padrão 22mm', rollPrice: 75, rollLength: 50, usedLength: 0 }]);
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Lógica de Carregamento de Rascunho
    const loadDraft = useCallback(() => {
        const savedDraftJSON = localStorage.getItem('budgetDraft');
        if (savedDraftJSON) {
            const savedDraft = JSON.parse(savedDraftJSON);
            setClientName(savedDraft.clientName || '');
            setClientPhone(savedDraft.clientPhone || '');
            setProjectName(savedDraft.projectName || '');
            setDescription(savedDraft.description || '');
            setProfitMargin(savedDraft.profitMargin || 180);
            setHelperCost(savedDraft.helperCost || '');
            setDeliveryFee(savedDraft.deliveryFee || '');
            setDiscountPercentage(savedDraft.discountPercentage || 0);
            setSheets(savedDraft.sheets || []);
            setPieces(savedDraft.pieces || []);
            setHardware(savedDraft.hardware || []);
            setUnitItems(savedDraft.unitItems || []);
            setBorderTapes(savedDraft.borderTapes || []);
            toast.success('Rascunho carregado!');
            closeModal();
        }
    }, []);

    const discardDraft = useCallback(() => {
        localStorage.removeItem('budgetDraft');
        toast.error('Rascunho descartado.');
        closeModal();
    }, []);

    useEffect(() => {
        if (!budgetToEdit) {
            const savedDraftJSON = localStorage.getItem('budgetDraft');
            if (savedDraftJSON) {
                setModalState({
                    isOpen: true,
                    title: 'Rascunho Encontrado',
                    message: 'Deseja carregar o progresso salvo? O conteúdo atual será substituído.',
                    onConfirm: loadDraft,
                    onClose: discardDraft,
                    confirmText: 'Carregar',
                    cancelText: 'Excluir',
                    confirmButtonClass: 'btn-save'
                });
            }
        }
    }, [budgetToEdit, loadDraft, discardDraft]);
    
    // Lógica de Salvamento Automático (silencioso)
    useEffect(() => {
        if (editingId) return;

        const draft = { clientName, clientPhone, projectName, description, profitMargin, helperCost, deliveryFee, discountPercentage, sheets, pieces, hardware, unitItems, borderTapes };

        const handler = setTimeout(() => {
            localStorage.setItem('budgetDraft', JSON.stringify(draft));
        }, 750);

        return () => { clearTimeout(handler); };
    }, [clientName, clientPhone, projectName, description, profitMargin, helperCost, deliveryFee, discountPercentage, sheets, pieces, hardware, unitItems, borderTapes, editingId]);

    const totals = useMemo(() => {
        const margin = 1 + (parseFloat(profitMargin) || 0) / 100;
        const totalPiecesCost = pieces.reduce((acc, p) => { const s = sheets.find(s => s.id === p.sheetId); if (!s) return acc; const sArea = (s.length||1)*(s.width||1); const ppsmm = sArea>0?(s.price||0)/sArea:0; const pArea = (p.length||0)*(p.width||0); const final = pArea*ppsmm*(p.qty||0)*margin; p.totalCost=final; return acc+final; }, 0);
        const totalHardwareCost = hardware.reduce((acc, i) => { const uPrice = (i.boxPrice||0)/(i.boxQty||1); const final = uPrice*(i.usedQty||0)*margin; i.totalCost=final; return acc+final; }, 0);
        const totalUnitItemsCost = unitItems.reduce((acc, i) => { const final = (i.unitPrice || 0) * (i.qty || 0) * margin; i.totalCost = final; return acc + final; }, 0);
        const totalTapeNeededInMm = pieces.reduce((acc, p) => {
            let piecePerimeter = 0;
            if (p.bandL1) piecePerimeter += parseFloat(p.length || 0);
            if (p.bandL2) piecePerimeter += parseFloat(p.length || 0);
            if (p.bandW1) piecePerimeter += parseFloat(p.width || 0);
            if (p.bandW2) piecePerimeter += parseFloat(p.width || 0);
            return acc + (piecePerimeter * (p.qty || 1));
        }, 0);
        const totalTapeNeededInMeters = totalTapeNeededInMm / 1000;
        const tapeInfo = borderTapes[0] || {};
        const pricePerMeter = (tapeInfo.rollPrice || 0) / (tapeInfo.rollLength || 1);
        const totalBorderTapeCost = totalTapeNeededInMeters * pricePerMeter * margin;
        if(tapeInfo) tapeInfo.totalCost = totalBorderTapeCost;
        
        const subtotal = totalPiecesCost + totalHardwareCost + totalUnitItemsCost + totalBorderTapeCost;
        const finalHelperCost = parseFloat(helperCost) || 0;
        const finalDeliveryFee = parseFloat(deliveryFee) || 0;
        const finalDiscount = subtotal * (discountPercentage / 100);
        const grandTotal = (subtotal - finalDiscount) + finalHelperCost + finalDeliveryFee;
        
        return { grandTotal, subtotal, finalDeliveryFee, finalHelperCost, finalDiscount, totalTapeNeededInMeters };
    }, [pieces, hardware, unitItems, profitMargin, deliveryFee, helperCost, borderTapes, discountPercentage, sheets]);
    
    useEffect(() => {
        const formattedTotalMeters = totals.totalTapeNeededInMeters.toFixed(2);
        if (borderTapes[0]?.usedLength !== formattedTotalMeters) {
            setBorderTapes(prev => [{ ...prev[0], usedLength: formattedTotalMeters }]);
        }
    }, [totals.totalTapeNeededInMeters, borderTapes]);

    const fetchAndSetNextBudgetId = useCallback(async () => {
        const counterRef = doc(db, "counters", "budgets");
        try {
            const counterSnap = await getDoc(counterRef);
            const nextId = (counterSnap.data()?.lastId || 0) + 1;
            setBudgetId(String(nextId).padStart(3, '0'));
        } catch (error) { console.error("Erro ao buscar ID:", error); setBudgetId('N/A'); }
    }, [db]);

    useEffect(() => {
        if (budgetToEdit) {
            localStorage.removeItem('budgetDraft');
            setEditingId(budgetToEdit.id);
            setBudgetId(budgetToEdit.budgetId || '');
            setClientName(budgetToEdit.clientName || '');
            setClientPhone(budgetToEdit.clientPhone || '');
            setProjectName(budgetToEdit.projectName || '');
            setDescription(budgetToEdit.description || '');
            setProfitMargin(budgetToEdit.profitMargin || 180);
            setHelperCost(budgetToEdit.finalHelperCost || '');
            setDeliveryFee(budgetToEdit.finalDeliveryFee || '');
            setDiscountPercentage(budgetToEdit.discountPercentage || 0);
            setSheets(budgetToEdit.sheets || []);
            setPieces(budgetToEdit.pieces || []);
            setHardware(budgetToEdit.hardware || []);
            setUnitItems(budgetToEdit.unitItems || []);
            setBorderTapes(budgetToEdit.borderTapes || [{ id: 'default-tape', name: 'Fita Padrão 22mm', rollPrice: 75, rollLength: 50, usedLength: 0 }]);
        } else {
            fetchAndSetNextBudgetId();
        }
    }, [budgetToEdit, fetchAndSetNextBudgetId]);
    
    const resetForm = useCallback(() => { 
        setEditingId(null); setClientName(''); setClientPhone(''); setProjectName(''); setDescription(''); setProfitMargin(180); setHelperCost(''); setDeliveryFee(''); setDiscountPercentage(0); setPieces([]); setHardware([]); setUnitItems([]); setBorderTapes([{ id: 'default-tape', name: 'Fita Padrão 22mm', rollPrice: 75, rollLength: 50, usedLength: 0 }]);
        clearEditingBudget(); 
        fetchAndSetNextBudgetId();
        localStorage.removeItem('budgetDraft');
        toast.success('Formulário limpo.');
    }, [clearEditingBudget, fetchAndSetNextBudgetId]);

    const handleSaveBudget = async () => {
        if (!clientName || !projectName) { toast.error('Preencha o nome do cliente e do projeto.'); return; }
        const toastId = toast.loading(editingId ? 'Atualizando orçamento...' : 'Salvando orçamento...');
        try {
            const counterRef = doc(db, "counters", "budgets");
            let finalBudgetId;
            if (editingId) {
                finalBudgetId = budgetId;
            } else {
                const newId = await runTransaction(db, async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);
                    const newCount = (counterDoc.data()?.lastId || 0) + 1;
                    transaction.set(counterRef, { lastId: newCount });
                    return newCount;
                });
                finalBudgetId = String(newId).padStart(3, '0');
            }

            const developerCommission = totals.grandTotal * 0.01;

            const budgetData = { 
                budgetId: finalBudgetId, 
                clientName, 
                clientPhone, 
                projectName, 
                description, 
                profitMargin, 
                discountPercentage, 
                sheets, 
                pieces, 
                hardware, 
                unitItems, 
                borderTapes, 
                createdAt: new Date().toISOString(), 
                status: budgetToEdit?.status || 'Pendente', 
                ...totals,
                // --- LINHAS CORRIGIDAS/ADICIONADAS ---
                developerCommission: developerCommission, // Adiciona a comissão calculada
                commissionStatus: budgetToEdit?.commissionStatus || 'Não Pago' // Adiciona o status do pagamento
            };
            
            if (editingId) {
                await updateDoc(doc(db, "budgets", editingId), budgetData);
                toast.success('Orçamento atualizado com sucesso!', { id: toastId });
            } else {
                await addDoc(collection(db, "budgets"), budgetData);
                toast.success(`Orçamento Nº ${finalBudgetId} salvo com sucesso!`, { id: toastId });
            }
            localStorage.removeItem('budgetDraft');
            resetForm();
            setCurrentPage('saved');
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error('Erro ao salvar o orçamento.', { id: toastId });
        }
    };
    
    const handleGeneratePdf = async () => {
        if (!clientName || !projectName) { toast.error('Preencha os dados do cliente e projeto para gerar o PDF.'); return; }
        try {
            const logoBase64 = await getImageBase64(logoDaEmpresa);
            const currentBudget = { budgetId, clientName, clientPhone, projectName, description, discountPercentage, pieces, hardware, unitItems, borderTapes, createdAt: new Date().toISOString(), ...totals, qrCodeImage: qrCodeBase64 };
            generateBudgetPdf(currentBudget, DADOS_DA_EMPRESA, logoBase64);
        } catch (error) {
            console.error("Erro ao gerar PDF ou converter a imagem:", error);
            toast.error("Não foi possível gerar o PDF. Verifique o console.");
        }
    };
    
    const handleSheetFormChange = (e) => setSheetForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const handlePieceFormChange = (e) => {
        const { name, value } = e.target;
        setPieceForm(p => ({ ...p, [name]: value }));
    };
    const toggleEdgeBanding = (edge) => {
        setPieceForm(prev => ({ ...prev, [edge]: !prev[edge] }));
    };
    const handleBorderTapeChange = (e) => {
        const { name, value } = e.target;
        setBorderTapes(prev => [{...prev[0], [name]: value }]);
    };
    const handleHardwareFormChange = (e) => setHardwareForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleUnitItemFormChange = (e) => setUnitItemForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSheetSubmit = (e) => {
        e.preventDefault();
        const isEditing = !!sheetForm.id;
        setSheets(isEditing ? sheets.map(s => s.id === sheetForm.id ? sheetForm : s) : [...sheets, { ...sheetForm, id: crypto.randomUUID() }]);
        setSheetForm({ id: null, name: '', price: '', length: '', width: '' });
        toast.success(isEditing ? 'Chapa atualizada!' : 'Chapa adicionada!');
    };
    const handlePieceSubmit = (e) => {
        e.preventDefault();
        const isEditing = !!pieceForm.id;
        setPieces(isEditing ? pieces.map(p => p.id === pieceForm.id ? pieceForm : p) : [...pieces, { ...pieceForm, id: crypto.randomUUID() }]);
        setPieceForm(initialPieceForm);
        toast.success(isEditing ? 'Peça atualizada!' : 'Peça adicionada!');
    };
    const handleHardwareSubmit = (e) => {
        e.preventDefault();
        const isEditing = !!hardwareForm.id;
        setHardware(isEditing ? hardware.map(h => h.id === hardwareForm.id ? hardwareForm : h) : [...hardware, { ...hardwareForm, id: crypto.randomUUID() }]);
        setHardwareForm({ id: null, name: '', boxQty: '', boxPrice: '', usedQty: '' });
        toast.success(isEditing ? 'Item atualizado!' : 'Item adicionado!');
    };
    const handleUnitItemSubmit = (e) => {
        e.preventDefault();
        const isEditing = !!unitItemForm.id;
        setUnitItems(isEditing ? unitItems.map(item => item.id === unitItemForm.id ? unitItemForm : item) : [...unitItems, { ...unitItemForm, id: crypto.randomUUID() }]);
        setUnitItemForm({ id: null, name: '', unitPrice: '', qty: '' });
        toast.success(isEditing ? 'Item atualizado!' : 'Item adicionado!');
    };
    
    const editSheet = (s) => setSheetForm(s);
    const editPiece = (p) => setPieceForm(p);
    const editHardware = (i) => setHardwareForm(i);
    const editUnitItem = (item) => setUnitItemForm(item);

    const closeModal = () => {
        setModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };
    const handleDeleteSheetConfirm = (id) => {
        if (sheets.length > 1) {
            setSheets(sheets.filter(s => s.id !== id));
            toast.success('Chapa removida.');
        } else {
            toast.error('É necessário ter ao menos uma chapa.');
        }
        closeModal();
    };
    const handleDeletePieceConfirm = (id) => {
        setPieces(pieces.filter(p => p.id !== id));
        toast.success('Peça removida.');
        closeModal();
    };
    const handleDeleteHardwareConfirm = (id) => {
        setHardware(hardware.filter(h => h.id !== id));
        toast.success('Item removido.');
        closeModal();
    };
    const handleDeleteUnitItemConfirm = (id) => {
        setUnitItems(unitItems.filter(item => item.id !== id));
        toast.success('Item removido.');
        closeModal();
    };

    const deleteSheet = (id, name) => {
        setModalState({ isOpen: true, title: 'Confirmar Exclusão', message: `Tem certeza que deseja excluir a chapa "${name}"?`, onConfirm: () => handleDeleteSheetConfirm(id), confirmButtonClass: 'btn-delete-action' });
    };
    const deletePiece = (id, name) => {
        setModalState({ isOpen: true, title: 'Confirmar Exclusão', message: `Tem certeza que deseja excluir a peça "${name}"?`, onConfirm: () => handleDeletePieceConfirm(id), confirmButtonClass: 'btn-delete-action' });
    };
    const deleteHardware = (id, name) => {
        setModalState({ isOpen: true, title: 'Confirmar Exclusão', message: `Tem certeza que deseja excluir o item "${name}"?`, onConfirm: () => handleDeleteHardwareConfirm(id), confirmButtonClass: 'btn-delete-action' });
    };
    const deleteUnitItem = (id, name) => {
        setModalState({ isOpen: true, title: 'Confirmar Exclusão', message: `Tem certeza que deseja excluir o item "${name}"?`, onConfirm: () => handleDeleteUnitItemConfirm(id), confirmButtonClass: 'btn-delete-action' });
    };
    
    return (
        <div>
            <header className="app-header">
                <h1>{editingId ? `Editando Orçamento ${budgetId}` : `Novo Orçamento`}</h1>
                <img src={logoDaEmpresa} alt="Logo da Empresa" className="app-logo-small" />
                <p>{DADOS_DA_EMPRESA.companyName}</p>
            </header>
            <main className="main-content">
                <div className="card">
                    <div className="card-header-with-button">
                        <h2 className="section-title">Detalhes Gerais</h2>
                        <button onClick={() => { resetForm(); setCurrentPage('home'); }} className="btn btn-secondary btn-small-back">Voltar à Página Inicial</button>
                    </div>
                    <div className="grid-2-cols">
                        <div>
                            <h3 className="subsection-title">Projeto</h3>
                            <div className="form-group"><label>Nome do Cliente</label><input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome Completo do Cliente" /></div>
                            <div className="form-group">
                                <label>Contato (Telefone)</label>
                                <IMaskInput mask="(00)00000-0000" value={clientPhone} onAccept={(value) => setClientPhone(value)} placeholder="(XX) XXXXX-XXXX" type="tel" className="form-input-style" />
                            </div>
                            <div className="form-group"><label>Nome do Móvel/Projeto</label><input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Ex: Armário de Cozinha" /></div>
                        </div>
                        <div>
                            <h3 className="subsection-title">Lucro e Custos Adicionais</h3>
                            <div className="form-group"><label>Lucro sobre Materiais (%)</label><input type="number" value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)} /></div>
                            <div className="form-group"><label>Custo Ajudante (R$)</label><input type="number" step="0.01" value={helperCost} onChange={(e) => setHelperCost(e.target.value)} placeholder="Ex: 150.00" /></div>
                            <div className="form-group"><label>Frete (R$)</label><input type="number" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="Ex: 50.00" /></div>
                        </div>
                    </div>
                    <div className="form-group" style={{marginTop: '1rem'}}>
                        <label>Descrição / Observações</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Detalhes sobre o acabamento, medidas especiais, etc."></textarea>
                    </div>
                </div>

                <div className="card">
                    <h2 className="section-title">Chapas de Madeira</h2>
                    <form onSubmit={handleSheetSubmit}>
                        <div className="form-grid-inputs-4">
                            <div className="form-group"><label>Nome da Chapa</label><input type="text" name="name" value={sheetForm.name} onChange={handleSheetFormChange} placeholder="Ex: MDF Branco 18mm" required /></div>
                            <div className="form-group"><label>Preço (R$)</label><input type="number" name="price" value={sheetForm.price} onChange={handleSheetFormChange} placeholder="Ex: 350" required /></div>
                            <div className="form-group"><label>Comp. (mm)</label><input type="number" name="length" value={sheetForm.length} onChange={handleSheetFormChange} placeholder="Ex: 2750" required /></div>
                            <div className="form-group"><label>Larg. (mm)</label><input type="number" name="width" value={sheetForm.width} onChange={handleSheetFormChange} placeholder="Ex: 1850" required /></div>
                        </div>
                        <button type="submit" className={`btn form-submit-button ${sheetForm.id ? 'btn-save' : 'btn-add'}`}>{sheetForm.id ? 'Salvar Chapa' : '+ Adicionar Chapa'}</button>
                    </form>
                    <div className="table-container">
                        <table>
                            <thead><tr><th className="th-name">Nome</th><th>Preço</th><th>Medidas</th><th className="th-actions">Ações</th></tr></thead>
                            <tbody>{sheets.map(s => (<tr key={s.id}><td className="td-name">{s.name}</td><td>{formatCurrency(s.price)}</td><td>{s.length}mm x {s.width}mm</td><td className="actions"><button onClick={() => editSheet(s)} className="icon-button" title="Editar"><EditIcon /></button><button onClick={() => deleteSheet(s.id, s.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
                
                <div className="card">
                    <h2 className="section-title">Peças de Madeira</h2>
                    <form onSubmit={handlePieceSubmit} className="piece-form">
                        <div className="form-grid-inputs-5">
                            <div className="form-group"><label>Chapa</label><select name="sheetId" value={pieceForm.sheetId} onChange={handlePieceFormChange}>{sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                            <div className="form-group"><label>Nome da Peça</label><input type="text" name="name" value={pieceForm.name} onChange={handlePieceFormChange} placeholder="Ex: Porta" required /></div>
                            <div className="form-group"><label>Comp. (mm)</label><input type="number" name="length" value={pieceForm.length} onChange={handlePieceFormChange} placeholder="Ex: 700" required /></div>
                            <div className="form-group"><label>Larg. (mm)</label><input type="number" name="width" value={pieceForm.width} onChange={handlePieceFormChange} placeholder="Ex: 400" required /></div>
                            <div className="form-group"><label>Qtd.</label><input type="number" name="qty" value={pieceForm.qty} onChange={handlePieceFormChange} placeholder="Ex: 2" required /></div>
                        </div>
                        <div className="edge-banding-selector">
                            <label className="subsection-title">Fita de Borda nesta Peça:</label>
                            <div className="visual-selector-wrapper">
                                <span className="dimension-label vertical">Comprimento</span>
                                <div>
                                    <span className="dimension-label horizontal">Largura</span>
                                    <div className="piece-visual-selector">
                                        <div className={`edge-segment top ${pieceForm.bandW1 ? 'active' : ''}`} onClick={() => toggleEdgeBanding('bandW1')} title="Fitar um lado da Largura"></div>
                                        <div className={`edge-segment left ${pieceForm.bandL1 ? 'active' : ''}`} onClick={() => toggleEdgeBanding('bandL1')} title="Fitar um lado do Comprimento"></div>
                                        <div className="piece-center"></div>
                                        <div className={`edge-segment right ${pieceForm.bandL2 ? 'active' : ''}`} onClick={() => toggleEdgeBanding('bandL2')} title="Fitar o outro lado do Comprimento"></div>
                                        <div className={`edge-segment bottom ${pieceForm.bandW2 ? 'active' : ''}`} onClick={() => toggleEdgeBanding('bandW2')} title="Fitar o outro lado da Largura"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button type="submit" className={`btn form-submit-button ${pieceForm.id ? 'btn-save' : 'btn-add'}`}>{pieceForm.id ? 'Salvar Peça' : '+ Adicionar Peça'}</button>
                    </form>
                     <div className="table-container">
                        <table>
                            <thead><tr><th className="th-name">Peça</th><th>Medidas</th><th>Fita de Borda</th><th>Qtd</th><th className="th-value">Valor Final</th><th className="th-actions">Ações</th></tr></thead>
                            <tbody>
                                {pieces.map(p => {
                                    const parts = [];
                                    const lengthSides = (p.bandL1 ? 1 : 0) + (p.bandL2 ? 1 : 0);
                                    const widthSides = (p.bandW1 ? 1 : 0) + (p.bandW2 ? 1 : 0);
                                    if (lengthSides > 0) parts.push(`${lengthSides} no Comp.`);
                                    if (widthSides > 0) parts.push(`${widthSides} na Larg.`);
                                    const bandingText = parts.length > 0 ? parts.join(' e ') : 'Nenhuma';

                                    return (
                                        <tr key={p.id}>
                                            <td className="td-name">{p.name}</td>
                                            <td>{p.length}mm x {p.width}mm</td>
                                            <td>{bandingText}</td>
                                            <td>{p.qty}</td>
                                            <td className="td-value">{formatCurrency(p.totalCost)}</td>
                                            <td className="actions"><button onClick={() => editPiece(p)} className="icon-button" title="Editar"><EditIcon /></button><button onClick={() => deletePiece(p.id, p.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h2 className="section-title">Fita de Borda</h2>
                    <div className="form-grid-inputs-4">
                        <div className="form-group"><label>Descrição</label><input type="text" name="name" value={borderTapes[0]?.name || ''} onChange={handleBorderTapeChange} placeholder="Ex: Fita Branca 22mm" required /></div>
                        <div className="form-group"><label>Preço do Rolo (R$)</label><input type="number" step="0.01" name="rollPrice" value={borderTapes[0]?.rollPrice || ''} onChange={handleBorderTapeChange} placeholder="Ex: 75.00" required /></div>
                        <div className="form-group"><label>Metros no Rolo</label><input type="number" step="0.1" name="rollLength" value={borderTapes[0]?.rollLength || ''} onChange={handleBorderTapeChange} placeholder="Ex: 50" required /></div>
                        <div className="form-group"><label>Metros Usados (Automático)</label><input type="number" name="usedLength" value={borderTapes[0]?.usedLength || 0} placeholder="Calculado" readOnly disabled /></div>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead><tr><th className="th-name">Descrição</th><th>Metros Usados</th><th className="th-value">Valor Final</th></tr></thead>
                            <tbody>{borderTapes.map(t => (<tr key={t.id}>
                                <td className="td-name">{t.name}</td>
                                <td>{t.usedLength} m</td>
                                <td className="td-value">{formatCurrency(t.totalCost)}</td>
                            </tr>))}</tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h2 className="section-title">Itens Unitários (Dobradiças, Puxadores, etc.)</h2>
                    <form onSubmit={handleUnitItemSubmit}>
                        <div className="form-grid-inputs-3">
                            <div className="form-group">
                                <label>Nome do Item</label>
                                <input type="text" name="name" value={unitItemForm.name} onChange={handleUnitItemFormChange} placeholder="Ex: Dobradiça Curva" required />
                            </div>
                            <div className="form-group">
                                <label>Valor Unitário (R$)</label>
                                <input type="number" step="0.01" name="unitPrice" value={unitItemForm.unitPrice} onChange={handleUnitItemFormChange} placeholder="Ex: 15.00" required />
                            </div>
                            <div className="form-group">
                                <label>Quantidade</label>
                                <input type="number" name="qty" value={unitItemForm.qty} onChange={handleUnitItemFormChange} placeholder="Ex: 4" required />
                            </div>
                        </div>
                        <button type="submit" className={`btn form-submit-button ${unitItemForm.id ? 'btn-save' : 'btn-add'}`}>{unitItemForm.id ? 'Salvar Item' : '+ Adicionar Item'}</button>
                    </form>
                    <div className="table-container">
                        <table>
                            <thead><tr><th className="th-name">Item</th><th>Qtd</th><th>Valor Unit.</th><th className="th-value">Valor Final</th><th className="th-actions">Ações</th></tr></thead>
                            <tbody>
                                {unitItems.map(item => (
                                    <tr key={item.id}>
                                        <td className="td-name">{item.name}</td>
                                        <td>{item.qty}</td>
                                        <td>{formatCurrency(item.unitPrice)}</td>
                                        <td className="td-value">{formatCurrency(item.totalCost)}</td>
                                        <td className="actions">
                                            <button onClick={() => editUnitItem(item)} className="icon-button" title="Editar"><EditIcon /></button>
                                            <button onClick={() => deleteUnitItem(item.id, item.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h2 className="section-title">Ferragens em Caixa</h2>
                     <form onSubmit={handleHardwareSubmit}>
                        <div className="form-grid-inputs-4">
                            <div className="form-group"><label>Item</label><input type="text" name="name" value={hardwareForm.name} onChange={handleHardwareFormChange} placeholder="Ex: Parafuso 3.5x16" required /></div>
                            <div className="form-group"><label>Qtd na Caixa</label><input type="number" name="boxQty" value={hardwareForm.boxQty} onChange={handleHardwareFormChange} placeholder="Ex: 500" required /></div>
                            <div className="form-group"><label>Preço da Caixa (R$)</label><input type="number" step="0.01" name="boxPrice" value={hardwareForm.boxPrice} onChange={handleHardwareFormChange} placeholder="Ex: 25.00" required /></div>
                            <div className="form-group"><label>Qtd. Usada</label><input type="number" name="usedQty" value={hardwareForm.usedQty} onChange={handleHardwareFormChange} placeholder="Ex: 50" required /></div>
                        </div>
                        <button type="submit" className={`btn form-submit-button ${hardwareForm.id ? 'btn-save' : 'btn-secondary'}`}>{hardwareForm.id ? 'Salvar Item' : '+ Adicionar Item'}</button>
                    </form>
                     <div className="table-container">
                        <table>
                            <thead><tr><th className="th-name">Item</th><th>Qtd Usada</th><th className="th-value">Valor Final</th><th className="th-actions">Ações</th></tr></thead>
                            <tbody>{hardware.map(i => (<tr key={i.id}><td className="td-name">{i.name}</td><td>{i.usedQty}</td><td className="td-value">{formatCurrency(i.totalCost)}</td><td className="actions"><button onClick={() => editHardware(i)} className="icon-button" title="Editar"><EditIcon /></button><button onClick={() => deleteHardware(i.id, i.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button></td></tr>))}</tbody>
                        </table>
                    </div>
                </div>
                
                <div className="card summary-card">
                    <h2 className="section-title">Resumo e Salvamento</h2>
                    <div className="form-group">
                        <label>Desconto</label>
                        <select
                            value={discountPercentage}
                            onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                            className="form-input-style"
                        >
                            <option value="0">Sem desconto</option>
                            <option value="5">5%</option>
                            <option value="10">10%</option>
                        </select>
                    </div>
                    <div className="summary-details">
                        <div className="summary-item"><span>Subtotal (Materiais):</span><span>{formatCurrency(totals.subtotal)}</span></div>
                        <div className="summary-item"><span>Ajudante:</span><span>{formatCurrency(totals.finalHelperCost)}</span></div>
                        <div className="summary-item"><span>Frete:</span><span>{formatCurrency(totals.finalDeliveryFee)}</span></div>
                        {totals.finalDiscount > 0 && (
                             <div className="summary-item">
                                <span>Desconto ({discountPercentage}%):</span>
                                <span style={{ color: '#dc2626', fontWeight: '500' }}>
                                    - {formatCurrency(totals.finalDiscount)}
                                </span>
                            </div>
                        )}
                        <hr className="summary-divider" />
                        <div className="summary-item grand-total"><span>VALOR TOTAL:</span><span>{formatCurrency(totals.grandTotal)}</span></div>
                    </div>
                    <div className="summary-buttons">
                        <button onClick={() => { resetForm(); setCurrentPage('home'); }} className="btn btn-back">Cancelar Orçamento</button>
                        <button onClick={handleGeneratePdf} className="btn btn-print-open">Gerar PDF</button>
                        <button onClick={handleSaveBudget} className="btn btn-save">{editingId ? 'Atualizar Orçamento' : 'Salvar Orçamento'}</button>
                    </div>
                </div>
            </main>

            <Modal
                isOpen={modalState.isOpen}
                onClose={modalState.onClose || closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                confirmText={modalState.confirmText}
                cancelText={modalState.cancelText}
                confirmButtonClass={modalState.confirmButtonClass}
            >
                <p>{modalState.message}</p>
            </Modal>
        </div>
    );
};

export default BudgetCalculator;