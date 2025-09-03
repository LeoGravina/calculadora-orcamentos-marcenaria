import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, runTransaction, addDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from './icons';
import { getImageBase64, formatCurrency } from '../utils/helpers';
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';
import { cuttingOptimizer } from '../utils/cuttingOptimizer';
import CuttingPlanCanvas from '../components/CuttingPlanCanvas';
import Modal from './Modal';

const BudgetCalculator = ({ setCurrentPage, budgetToEdit, clearEditingBudget, db, DADOS_DA_EMPRESA, logoDaEmpresa }) => {
    const [activeSheetTab, setActiveSheetTab] = useState('select');
    const [activeBorderTapeTab, setActiveBorderTapeTab] = useState('select');
    const [activeUnitItemTab, setActiveUnitItemTab] = useState('catalog');
    const [activeHardwareTab, setActiveHardwareTab] = useState('catalog');
    const [catalogSheets, setCatalogSheets] = useState([]);
    const [catalogEdgeBands, setCatalogEdgeBands] = useState([]);
    const [catalogUnitItems, setCatalogUnitItems] = useState([]);
    const [catalogHardware, setCatalogHardware] = useState([]);
    const [sheets, setSheets] = useState([]);
    const [borderTapes, setBorderTapes] = useState([]);
    const [pieces, setPieces] = useState([]);
    const [hardware, setHardware] = useState([]);
    const [unitItems, setUnitItems] = useState([]);
    const [manualSheetForm, setManualSheetForm] = useState({ name: '', price: '', length: '', width: '' });
    const initialPieceForm = useMemo(() => ({
        name: "",
        length: "",
        width: "",
        qty: 1,
        sheetId: '', // Importante adicionar
        bandL1: false,
        bandL2: false,
        bandW1: false,
        bandW2: false,
        id: null // Usado para saber se está editando
    }), []);
    const [pieceForm, setPieceForm] = useState(initialPieceForm);
    const [hardwareForm, setHardwareForm] = useState({ catalogId: '', usedQty: '', name: '', boxPrice: '', boxQty: '', id: null });
    const [unitItemForm, setUnitItemForm] = useState({ catalogId: '', qty: '', name: '', unitPrice: '', id: null });
    const [editingId, setEditingId] = useState(null);
    const [budgetId, setBudgetId] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [profitMargin, setProfitMargin] = useState(220);
    const [helperCost, setHelperCost] = useState('');
    const [deliveryFee, setDeliveryFee] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [finalBudgetPrice, setFinalBudgetPrice] = useState('');
    const [, setIsPriceManuallySet] = useState(false);
    const [landscapePlan, setLandscapePlan] = useState(null);
    const [portraitPlan, setPortraitPlan] = useState(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);
    const fetchLock = useRef(false);
    const isDraftRestored = useRef(false);

    // NOVO: Refs para os formulários de edição
    const sheetFormRef = useRef(null);
    const pieceFormRef = useRef(null);
    const unitItemFormRef = useRef(null);
    const hardwareFormRef = useRef(null);

    // NOVO: Estado para controlar o modal de confirmação de rascunho
    const [draftModalState, setDraftModalState] = useState({ isOpen: false });

    // NOVO: Ref para controlar o timeout do autosave
    const autosaveTimeoutRef = useRef(null);

    const fetchAndSetNextBudgetId = useCallback(async () => {
        const counterRef = doc(db, "counters", "budgets");
        try {
            const counterSnap = await getDoc(counterRef);
            const nextId = (counterSnap.data()?.lastId || 0) + 1;
            setBudgetId(String(nextId).padStart(3, '0'));
        } catch (error) { console.error("Erro ao buscar ID:", error); setBudgetId('N/A'); }
    }, [db]);

    // NOVO: Função para restaurar o rascunho quando o usuário confirma no modal
    const handleRestoreDraft = () => {
        const savedDraft = localStorage.getItem('budgetDraft');
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                setClientName(draft.clientName || '');
                setClientPhone(draft.clientPhone || '');
                setProjectName(draft.projectName || '');
                setDescription(draft.description || '');
                setProfitMargin(draft.profitMargin || 220);
                setHelperCost(draft.helperCost || '');
                setDeliveryFee(draft.deliveryFee || '');
                setDiscountPercentage(draft.discountPercentage || 0);
                setSheets(draft.sheets || []);
                setPieces(draft.pieces || []);
                setHardware(draft.hardware || []);
                setUnitItems(draft.unitItems || []);
                setBorderTapes(draft.borderTapes || []);
                setFinalBudgetPrice(draft.finalBudgetPrice || '');
                isDraftRestored.current = true;
                toast.success('Rascunho anterior restaurado!');
            } catch (error) {
                toast.error('Não foi possível restaurar o rascunho.');
                localStorage.removeItem('budgetDraft'); // Limpa rascunho corrompido
                resetForm(false);
            }
        }
        setDraftModalState({ isOpen: false }); // Fecha o modal
    };

    // NOVO: Função para descartar o rascunho e começar um novo orçamento
    const handleDiscardDraft = () => {
        localStorage.removeItem('budgetDraft'); // Remove o rascunho antigo
        setDraftModalState({ isOpen: false }); // Fecha o modal
        resetForm(false); // Garante que o formulário esteja limpo
        toast.success('Iniciando um novo orçamento.');
    };

    // ALTERADO: A função de reset agora é silenciosa por padrão
    const resetForm = useCallback((showToast = false) => { 
        setEditingId(null); setClientName(''); setClientPhone(''); setProjectName(''); setDescription(''); 
        setProfitMargin(180); setHelperCost(''); setDeliveryFee(''); setDiscountPercentage(0);
        setPieces([]); setHardware([]); setUnitItems([]);
        setSheets(catalogSheets);
        setBorderTapes(catalogEdgeBands.length > 0 ? [{ ...catalogEdgeBands[0], usedLength: 0 }] : []);
        setActiveSheetTab('select'); setActiveBorderTapeTab('select'); setActiveUnitItemTab('catalog'); setActiveHardwareTab('catalog');
        setPieceForm(initialPieceForm);
        setUnitItemForm({ catalogId: '', qty: '', name: '', unitPrice: '', id: null });
        setHardwareForm({ catalogId: '', usedQty: '', name: '', boxPrice: '', boxQty: '', id: null });
        setFinalBudgetPrice('');
        setIsPriceManuallySet(false);
        if(clearEditingBudget) clearEditingBudget(); 
        fetchAndSetNextBudgetId();

        // Só mostra o toast se a função for chamada com o parâmetro `true`
        if (showToast) {
            toast.success('Formulário limpo.');
        }
    }, [catalogSheets, catalogEdgeBands, clearEditingBudget, initialPieceForm, fetchAndSetNextBudgetId]);

    // NOVO: Função específica para o botão "Cancelar", que limpa o rascunho e mostra o toast
    const handleCancelBudget = () => {
        localStorage.removeItem('budgetDraft'); // Limpa o rascunho
        resetForm(true); // Chama o reset e pede para mostrar a notificação
        setCurrentPage('home');
    };

    const handleGenerateCuttingPlan = () => {
        if (pieces.length === 0 || sheets.length === 0) {
            toast.error("Adicione peças e chapas para gerar um plano de corte.");
            return;
        }

        setIsLoadingPlan(true);
        setLandscapePlan(null); // Limpa os planos antigos
        setPortraitPlan(null);

        // Usamos um setTimeout para permitir que o estado de loading atualize a tela
        setTimeout(() => {
            try {
                // --- CORREÇÃO 1: Garantir que as dimensões das peças sejam NÚMEROS ---
                // O otimizador precisa de números para fazer cálculos, não strings de texto.
                const piecesWithNumericDimensions = pieces.map(p => ({
                    ...p,
                    length: parseInt(p.length, 10),
                    width: parseInt(p.width, 10),
                    qty: parseInt(p.qty, 10) || 1
                }));

                // Função auxiliar para expandir as peças com base na quantidade
                const expandPieces = (pieceList) => {
                    return pieceList.flatMap(piece => 
                        Array.from({ length: piece.qty }, (_, i) => ({
                            ...piece,
                            uniqueId: `${piece.id}-${i}`,
                        }))
                    );
                };

                // --- CÁLCULO DO PLANO HORIZONTAL (LANDSCAPE) ---
                const landscapeSheets = sheets.map(s => ({...s})); // Cópia das chapas

                // --- CORREÇÃO 2: Usar uma cópia nova das peças para cada plano ---
                // Isso evita que a primeira chamada do otimizador modifique a lista de peças
                // e afete o resultado da segunda chamada.
                const piecesForPlan1 = expandPieces(piecesWithNumericDimensions);

                if (piecesForPlan1.length === 0) {
                    toast.error("Não há peças para o plano de corte.");
                    setIsLoadingPlan(false);
                    return;
                }
                
                const plan1 = cuttingOptimizer(piecesForPlan1, landscapeSheets);
                setLandscapePlan(plan1);
                console.log("Plano Horizontal Gerado:", plan1);

                // --- CÁLCULO DO PLANO VERTICAL (PORTRAIT) ---
                const portraitSheets = sheets.map(s => ({
                    ...s,
                    length: s.width, // Inverte as dimensões
                    width: s.length,
                    name: `${s.name} (Em Pé)`
                }));
                // Cria uma SEGUNDA cópia limpa das peças para o segundo plano
                const piecesForPlan2 = expandPieces(piecesWithNumericDimensions);
                
                const plan2 = cuttingOptimizer(piecesForPlan2, portraitSheets);
                setPortraitPlan(plan2);
                console.log("Plano Vertical Gerado:", plan2);

                toast.success("Planos de corte gerados!");

            } catch (error) {
                console.error("Erro ao gerar planos de corte:", error);
                toast.error("Ocorreu um erro ao gerar os planos.");
            } finally {
                setIsLoadingPlan(false);
            }
        }, 50); // Um pequeno delay para o feedback de loading funcionar
    };

    // ADICIONE ESTE BLOCO CORRIGIDO NO LUGAR DOS DOIS ACIMA
    useEffect(() => {
        // Esta lógica só deve rodar ao criar um NOVO orçamento
        if (!budgetToEdit) {
            const savedDraft = localStorage.getItem('budgetDraft');

            if (savedDraft) {
                // 1. Se encontrou um rascunho, a ÚNICA COISA a fazer é abrir o modal.
                setDraftModalState({ isOpen: true });
            } else {
                // 2. Se NÃO encontrou rascunho, aí sim, limpa o formulário silenciosamente.
                resetForm(false);
            }
        }
        // A dependência em resetForm pode ser removida se você garantir que ela não muda desnecessariamente,
        // mas por segurança, vamos mantê-la. A lógica interna agora previne o conflito.
    }, [budgetToEdit, resetForm]);

    // 1. useEffect DEDICADO a carregar o catálogo UMA ÚNICA VEZ.
    useEffect(() => {
        // A trava garante que o catálogo seja buscado apenas na primeira vez que o componente montar.
        if (fetchLock.current === false) {
            fetchLock.current = true; // Ativa a trava para não buscar novamente

            const fetchCatalogMaterials = async () => {
                const toastId = toast.loading('Carregando catálogo de materiais...');
                try {
                    const materialsCollectionRef = collection(db, "materials");
                    const querySnapshot = await getDocs(materialsCollectionRef);
                    const allMaterials = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                    // Filtra e atualiza os estados do catálogo
                    setCatalogSheets(allMaterials.filter(m => m.type === 'sheet'));
                    setCatalogEdgeBands(allMaterials.filter(m => m.type === 'edge_band'));
                    setCatalogUnitItems(allMaterials.filter(m => m.type === 'unitary_item'));
                    setCatalogHardware(allMaterials.filter(m => m.type === 'hardware_box'));
                    
                    toast.success('Catálogo carregado!', { id: toastId });
                } catch (error) {
                    console.error("Erro ao buscar catálogo:", error);
                    toast.error("Falha ao carregar catálogo.", { id: toastId });
                }
            };

            fetchCatalogMaterials();
        }
    }, [db]); // Depende apenas de 'db', que é estável.

    useEffect(() => {
        if (budgetToEdit) {
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
            setBorderTapes(budgetToEdit.borderTapes || []);
            // ... (resto da sua lógica de preenchimento)

        // Se for um orçamento novo
        } else {
            if (isDraftRestored.current) {
            isDraftRestored.current = false;
            return; 
            }
            fetchAndSetNextBudgetId(); // A chamada para resetForm() foi removida daqui.

            if (catalogSheets.length > 0) {
            setSheets(catalogSheets);
            setPieceForm(p => ({ ...p, sheetId: catalogSheets[0].id }));
        }
            if (catalogEdgeBands.length > 0) {
                setBorderTapes([{ ...catalogEdgeBands[0], usedLength: 0 }]);
                setActiveBorderTapeTab('select');
        } else {
            setActiveBorderTapeTab('manual');
            setBorderTapes([{id: 'manual-tape', name: '', rollPrice: '', rollLength: '', usedLength: 0, isLocal: true}]);
        }
    }
    }, [budgetToEdit, catalogSheets, catalogEdgeBands, fetchAndSetNextBudgetId, resetForm]);

    // NOVO: useEffect para o AUTOSAVE com debounce
    useEffect(() => {
        // Não salvar rascunho se estiver no modo de edição
        if (editingId) return;

        // Limpa o timeout anterior sempre que um dado muda
        clearTimeout(autosaveTimeoutRef.current);

        // Define um novo timeout para salvar os dados após 1.5 segundos de inatividade
        autosaveTimeoutRef.current = setTimeout(() => {
            const draft = {
                clientName, clientPhone, projectName, description, profitMargin, 
                helperCost, deliveryFee, discountPercentage, sheets, pieces, hardware, 
                unitItems, borderTapes, finalBudgetPrice
            };
            localStorage.setItem('budgetDraft', JSON.stringify(draft));
            // Opcional: Adicione um toast discreto se desejar
            // toast('Rascunho salvo', { icon: '💾', duration: 1000 });
        }, 1500); // 1.5 segundos

        // Limpa o timeout quando o componente é desmontado
        return () => clearTimeout(autosaveTimeoutRef.current);

    }, [
        clientName, clientPhone, projectName, description, profitMargin, helperCost,
        deliveryFee, discountPercentage, sheets, pieces, hardware, unitItems,
        borderTapes, finalBudgetPrice, editingId
    ]);
    
   const totals = useMemo(() => {
        const margin = 1 + (parseFloat(profitMargin) || 0) / 100;
        const totalPiecesCost = pieces.reduce((acc, p) => { const s = sheets.find(s => s.id === p.sheetId); if (!s) return acc; const sArea = (s.length||1)*(s.width||1); const ppsmm = sArea>0?(s.price||0)/sArea:0; const pArea = (p.length||0)*(p.width||0); const final = pArea*ppsmm*(p.qty||0)*margin; p.totalCost=final; return acc+final; }, 0);
        const totalHardwareCost = hardware.reduce((acc, i) => { const uPrice = (i.boxPrice||0)/(i.boxQty||1); const final = uPrice*(i.usedQty||0)*margin; i.totalCost=final; return acc+final; }, 0);
        const totalUnitItemsCost = unitItems.reduce((acc, i) => { const final = (i.unitPrice || 0) * (i.qty || 0) * margin; i.totalCost = final; return acc + final; }, 0);
        const totalTapeNeededInMm = pieces.reduce((acc, p) => { let piecePerimeter = 0; if (p.bandL1) piecePerimeter += parseFloat(p.length || 0); if (p.bandL2) piecePerimeter += parseFloat(p.length || 0); if (p.bandW1) piecePerimeter += parseFloat(p.width || 0); if (p.bandW2) piecePerimeter += parseFloat(p.width || 0); return acc + (piecePerimeter * (p.qty || 1)); }, 0);
        const totalTapeNeededInMeters = totalTapeNeededInMm / 1000;
        const tapeInfo = borderTapes[0] || {};
        const pricePerMeter = (tapeInfo.rollPrice || 0) / (tapeInfo.rollLength || 1);
        const totalBorderTapeCost = totalTapeNeededInMeters * pricePerMeter * margin;
        if(tapeInfo) tapeInfo.totalCost = totalBorderTapeCost;
        
        const subtotalCalculado = totalPiecesCost + totalHardwareCost + totalUnitItemsCost + totalBorderTapeCost;
        const finalHelperCost = parseFloat(helperCost) || 0;
        const finalDeliveryFee = parseFloat(deliveryFee) || 0;

        // O valor base estimado (sem desconto)
        const grandTotalEstimado = subtotalCalculado + finalHelperCost + finalDeliveryFee;

        // --- NOVA LÓGICA PARA O TOTAL FINAL ---
        // O valor de partida agora é o que foi digitado manualmente, ou o estimado se estiver vazio.
        const valorBase = parseFloat(String(finalBudgetPrice).replace(',', '.')) || grandTotalEstimado;
        // O desconto é calculado sobre este novo valor base.
        const valorDoDescontoFinal = valorBase * (parseFloat(discountPercentage) / 100);
        // O valor final é o valor base menos o desconto.
        const valorFinalComDesconto = valorBase - valorDoDescontoFinal;

        return { 
            grandTotal: grandTotalEstimado, // Mantemos o antigo para referência como 'Valor Base'
            subtotal: subtotalCalculado, 
            finalHelperCost, 
            finalDeliveryFee,
            finalDiscountAmount: valorDoDescontoFinal, // NOVO: Valor do desconto final
            finalValue: valorFinalComDesconto // NOVO: O valor final real
        };
    }, [pieces, hardware, unitItems, sheets, profitMargin, deliveryFee, helperCost, borderTapes, discountPercentage, finalBudgetPrice]); // Adicionado finalBudgetPrice às dependências
    
    const closeModal = () => setModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

        // ALTERADO: A função de salvar agora limpa o rascunho e reseta o form silenciosamente
    const handleSaveBudget = async () => {
        if (!clientName || !projectName) { toast.error('Preencha o nome do cliente e do projeto.'); return; }
        const toastId = toast.loading(editingId ? 'Atualizando orçamento...' : 'Salvando orçamento...');
        
        try {
            // ... (lógica de salvar no Firebase - sem alteração)
            const cleanedFinalPriceString = String(finalBudgetPrice).replace(',', '.').replace(/[^0-9.]/g, '');
            const finalPriceNumber = parseFloat(cleanedFinalPriceString) || totals.grandTotal;
            const developerCommission = finalPriceNumber * 0.01;

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

            const budgetData = { 
                budgetId: finalBudgetId, clientName, clientPhone, projectName, description, profitMargin, 
                discountPercentage, sheets, pieces, hardware, unitItems, borderTapes, 
                createdAt: new Date().toISOString(), status: budgetToEdit?.status || 'Pendente', 
                ...totals,
                finalBudgetPrice: finalPriceNumber,
                developerCommission: developerCommission,
                commissionStatus: budgetToEdit?.commissionStatus || 'Não Pago'
            };
            
            if (editingId) {
                await updateDoc(doc(db, "budgets", editingId), budgetData);
                toast.success('Orçamento atualizado com sucesso!', { id: toastId });
            } else {
                await addDoc(collection(db, "budgets"), budgetData);
                toast.success(`Orçamento Nº ${finalBudgetId} salvo com sucesso!`, { id: toastId });
            }
            
            // Limpa o rascunho e o formulário (sem toast) antes de navegar
            localStorage.removeItem('budgetDraft');
            resetForm(false); // Reset silencioso
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
            const currentBudget = { budgetId, clientName, clientPhone, projectName, description, discountPercentage, pieces, hardware, unitItems, borderTapes, createdAt: new Date().toISOString(), ...totals, finalBudgetPrice: parseFloat(finalBudgetPrice) || totals.grandTotal, qrCodeImage: qrCodeBase64 };
            generateBudgetPdf(currentBudget, DADOS_DA_EMPRESA, logoBase64);
        } catch (error) {
            console.error("Erro ao gerar PDF ou converter a imagem:", error);
            toast.error("Não foi possível gerar o PDF. Verifique o console.");
        }
    };

    const handleManualSheetSubmit = (e) => {
        e.preventDefault();
        const { name, price, length, width } = manualSheetForm;
        if (!name || !price || !length || !width) { toast.error("Preencha todos os campos da chapa."); return; }

        const isEditing = !!manualSheetForm.id;

        const sheetData = {
            ...manualSheetForm,
            price: parseFloat(price),
            length: parseInt(length),
            width: parseInt(width),
            isLocal: true, // Qualquer chapa salva/editada aqui é ou se torna local
            isOverride: isEditing ? manualSheetForm.isOverride || !manualSheetForm.isLocal : false,
        };

        if (isEditing) {
            setSheets(prev => prev.map(s => s.id === sheetData.id ? sheetData : s));
            toast.success(`Chapa "${name}" atualizada.`);
        } else {
            sheetData.id = crypto.randomUUID();
            setSheets(prev => [...prev, sheetData]);
            toast.success(`Chapa local "${name}" adicionada.`);
        }
        
        setManualSheetForm({ name: '', price: '', length: '', width: '' });
        setActiveSheetTab('select');
    };

    const deleteSheet = (id, name) => {
        setModalState({ isOpen: true, title: 'Confirmar Exclusão', message: `Tem certeza que deseja excluir a chapa local "${name}"?`, onConfirm: () => { setSheets(p => p.filter(s => s.id !== id)); closeModal(); toast.success('Chapa local removida.'); }, confirmButtonClass: 'btn-delete-action' });
    };

    const handlePieceFormChange = (e) => setPieceForm(p => ({ ...p, [e.target.name]: e.target.value }));
    const toggleEdgeBanding = (edge) => setPieceForm(prev => ({ ...prev, [edge]: !prev[edge] }));
    const handlePieceSubmit = (e) => {
    e.preventDefault();

    // NOVO: Validação para garantir que uma chapa foi selecionada
    if (!pieceForm.sheetId) {
        toast.error("Por favor, selecione uma chapa para a peça.");
        return;
    }

    const isEditing = !!pieceForm.id;
    setPieces(isEditing ? pieces.map(p => p.id === pieceForm.id ? pieceForm : p) : [...pieces, { ...pieceForm, id: crypto.randomUUID() }]);
    
    setPieceForm(prevForm => ({
        ...initialPieceForm,
        sheetId: prevForm.sheetId
    }));

    toast.success(isEditing ? 'Peça atualizada!' : 'Peça adicionada!');
};

    const editPiece = (pieceToEdit) => {
        setPieceForm({ ...initialPieceForm, ...pieceToEdit });
        // NOVO: Adiciona o scroll suave
        pieceFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const deletePiece = (id, name) => {
        setModalState({ isOpen: true, title: 'Confirmar Exclusão', message: `Tem certeza que deseja excluir a peça "${name}"?`, onConfirm: () => { setPieces(p => p.filter(i => i.id !== id)); closeModal(); toast.success('Peça removida.'); }, confirmButtonClass: 'btn-delete-action' });
    };

    const editSheet = (sheet) => {
        setActiveSheetTab('manual');
        setManualSheetForm(sheet);
        // NOVO: Adiciona o scroll suave
        sheetFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleBorderTapeSelection = (e) => {
        const selectedId = e.target.value;
        const currentUsedLength = borderTapes[0]?.usedLength || 0;
        const tapeFromCatalog = catalogEdgeBands.find(t => t.id === selectedId);
        if(tapeFromCatalog) setBorderTapes([{...tapeFromCatalog, usedLength: currentUsedLength, isLocal: false}]);
    };
    const handleManualBorderTapeChange = (e) => {
        const {name, value} = e.target;
        setBorderTapes(prev => [{...prev[0], [name]: value, isLocal: true}]);
    };
    
    const handleGenericSubmit = (e, formState, setFormState, catalogItems, items, setItems, itemType, activeTab) => {
        e.preventDefault();
        const isEditing = !!formState.id;
        const { name, qty, usedQty, unitPrice, boxPrice, boxQty, catalogId } = formState;
        const quantity = qty || usedQty;

        // --- LÓGICA CORRIGIDA E SIMPLIFICADA ---
        let logicPath = activeTab; // Por padrão, o caminho é a aba ativa
        if (isEditing) {
            // Se estiver editando, o caminho é definido pelas propriedades do item, não pela aba
            logicPath = (formState.isLocal || formState.isOverride) ? 'manual' : 'catalog';
        }

        if (logicPath === 'manual') {
            const price = unitPrice || boxPrice;
            if (!name || !price || !quantity || !String(quantity).trim() || parseFloat(quantity) <= 0) {
                toast.error(`Preencha todos os campos do ${itemType} manual com valores válidos.`);
                return;
            }
            const newItem = {
                name,
                id: isEditing ? formState.id : crypto.randomUUID(),
                isLocal: true, // Qualquer item salvo por aqui é considerado local/manual
                isOverride: isEditing ? formState.isOverride : false,
            };
            if (qty) { newItem.qty = parseInt(qty); newItem.unitPrice = parseFloat(unitPrice); }
            if (usedQty) { newItem.usedQty = parseInt(usedQty); newItem.boxPrice = parseFloat(boxPrice); newItem.boxQty = parseInt(boxQty); }
            
            setItems(isEditing ? items.map(i => i.id === newItem.id ? newItem : i) : [...items, newItem]);
            toast.success(`${itemType} ${isEditing ? 'atualizado' : 'adicionado'}.`);

        } else { // logicPath === 'catalog'
            if (!catalogId || !quantity || !String(quantity).trim() || parseFloat(quantity) <= 0) {
                toast.error(`Selecione um ${itemType} do catálogo e informe uma quantidade válida.`);
                return;
            }
            const itemFromCatalog = catalogItems.find(item => item.id === catalogId);
            if (!itemFromCatalog) {
                toast.error("Item do catálogo não encontrado.");
                return;
            }

            const newItem = { ...itemFromCatalog, id: crypto.randomUUID(), isLocal: false, isOverride: false };
            if (qty) newItem.qty = parseInt(qty);
            if (usedQty) newItem.usedQty = parseInt(usedQty);

            setItems([...items, newItem]);
            toast.success(`"${itemFromCatalog.name}" adicionado.`);
        }

        setFormState({ catalogId: '', qty: '', usedQty: '', name: '', unitPrice: '', boxPrice: '', boxQty: '', id: null });
    };
    // CORREÇÃO: Lógica de edição que promove itens de catálogo a manuais/editáveis
    const editItem = (item, setActiveTab, setFormState) => {
        // Se o item não for local (veio do catálogo), promove-o para edição manual
        if (!item.isLocal) {
            setActiveTab('manual');
            setFormState({ ...item, isOverride: true }); // Marca como editado
        } else {
            // Se já for manual, apenas abre para edição
            setActiveTab('manual');
            setFormState(item);
        }
    };
    const deleteItem = (id, name, items, setItems, itemType) => {
        setModalState({ isOpen: true, title: 'Confirmar Exclusão', message: `Deseja excluir "${name}"?`, onConfirm: () => { setItems(items.filter(i => i.id !== id)); closeModal(); toast.success(`${itemType} removido.`); }, confirmButtonClass: 'btn-delete-action' });
    };

    // Funções específicas que chamam as genéricas
    const editUnitItem = (item) => {
        editItem(item, setActiveUnitItemTab, setUnitItemForm);
        // NOVO: Adiciona o scroll suave
        unitItemFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const deleteUnitItem = (id, name) => deleteItem(id, name, unitItems, setUnitItems, 'Item');
    const editHardware = (item) => {
    editItem(item, setActiveHardwareTab, setHardwareForm);
    // NOVO: Adiciona o scroll suave
    hardwareFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const deleteHardware = (id, name) => deleteItem(id, name, hardware, setHardware, 'Ferragem');

    // Função para obter o texto de origem do item
    const getOriginBadge = (item) => {
        if (item.isLocal) return <span className="badge-local">Local</span>;
        if (item.isOverride) return <span className="badge-override">Catálogo (Editado)</span>;
        return <span className="badge-catalog">Catálogo</span>;
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
                        <button onClick={() => { setCurrentPage('home'); }} className="btn btn-secondary btn-small-back">Voltar à Página Inicial</button>
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

                <div className="card" ref={sheetFormRef}>
                    <h2 className="section-title">Chapas para este Orçamento</h2>
                    <div className="tabs-container">
                        <button onClick={() => setActiveSheetTab('select')} className={`tab-button ${activeSheetTab === 'select' ? 'active' : ''}`}>Selecionar do Catálogo</button>
                        <button onClick={() => setActiveSheetTab('manual')} className={`tab-button ${activeSheetTab === 'manual' ? 'active' : ''}`}>Adicionar Nova Chapa</button>
                    </div>
                    <div className="tab-content" style={{marginTop: '1.5rem'}}>
                        {activeSheetTab === 'select' && (
                            <div className="form-fade-in">
                                <p>As chapas listadas (do catálogo e locais) estão disponíveis para seleção na seção 'Peças de Madeira' abaixo.</p>
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th className="th-name">Nome</th>
                                                <th>Preço</th>
                                                <th>Medidas</th>
                                                <th>Origem</th>
                                                {/* Classe para alinhar o título */}
                                                <th className="th-actions">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sheets.map(s => (
                                                <tr key={s.id}>
                                                    <td className="td-name">{s.name}</td>
                                                    <td>{formatCurrency(s.price)}</td>
                                                    <td>{s.length}mm x {s.width}mm</td>
                                                    <td>{getOriginBadge(s)}</td>
                                                    {/* Célula com a classe e os botões corretos */}
                                                    <td className="actions">
                                                        {/* Botão de Editar para TODOS os itens */}
                                                        <button type="button" onClick={() => editSheet(s)} className="icon-button edit" title="Editar"><EditIcon /></button>
                                                        
                                                        {/* Botão de Excluir APENAS para itens locais */}
                                                        {s.isLocal && (
                                                            <button type="button" onClick={() => deleteSheet(s.id, s.name)} className="icon-button delete" title="Excluir Chapa Local"><TrashIcon /></button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {activeSheetTab === 'manual' && (
                            <form onSubmit={handleManualSheetSubmit} className="form-fade-in">
                                {/* O formulário de adição manual continua o mesmo */}
                                <h3 className="subsection-title">{manualSheetForm.id ? 'Editando Chapa' : 'Nova Chapa '}</h3>
                                <div className="form-grid-inputs-4">
                                    <div className="form-group"><label>Nome</label><input type="text" value={manualSheetForm.name} onChange={(e) => setManualSheetForm(p => ({...p, name: e.target.value}))} placeholder="Ex: MDF Azul 15mm" required /></div>
                                    <div className="form-group"><label>Preço (R$)</label><input type="number" step="0.01" value={manualSheetForm.price} onChange={(e) => setManualSheetForm(p => ({...p, price: e.target.value}))} placeholder="Ex: 350.00 " required /></div>
                                    <div className="form-group"><label>Comp. (mm)</label><input type="number" value={manualSheetForm.length} onChange={(e) => setManualSheetForm(p => ({...p, length: e.target.value}))} placeholder="Ex: 2750 " required /></div>
                                    <div className="form-group"><label>Larg. (mm)</label><input type="number" value={manualSheetForm.width} onChange={(e) => setManualSheetForm(p => ({...p, width: e.target.value}))} placeholder="Ex: 1850 " required /></div>
                                </div>
                                <button type="submit" className={`btn form-submit-button ${manualSheetForm.id ? 'btn-save' : 'btn-add'}`}>
                                    {manualSheetForm.id ? 'Salvar Alterações' : 'Adicionar Chapa '}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
                
                <div className="card" ref={pieceFormRef}>
                    <h2 className="section-title">Peças de Madeira</h2>
                    <form onSubmit={handlePieceSubmit} className="piece-form">
                        <div className="form-grid-inputs-5">
                            <div className="form-group"><label>Chapa</label><select name="sheetId" value={pieceForm.sheetId} onChange={handlePieceFormChange} required>
                <option value="">-- Selecione uma chapa --</option>
                {sheets.map(s => <option key={s.id} value={s.id}>{s.name} {s.isLocal && '(Local)'}</option>)}
            </select></div>
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
                                        <div className={`edge-segment top ${pieceForm.bandW1 ? 'active' : ''}`} onClick={() => toggleEdgeBanding('bandW1')}></div><div className={`edge-segment left ${pieceForm.bandL1 ? 'active' : ''}`} onClick={() => toggleEdgeBanding('bandL1')}></div>
                                        <div className="piece-center"></div><div className={`edge-segment right ${pieceForm.bandL2 ? 'active' : ''}`} onClick={() => toggleEdgeBanding('bandL2')}></div>
                                        <div className={`edge-segment bottom ${pieceForm.bandW2 ? 'active' : ''}`} onClick={() => toggleEdgeBanding('bandW2')}></div>
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
                                    const parts = []; const lengthSides = (p.bandL1 ? 1 : 0) + (p.bandL2 ? 1 : 0); const widthSides = (p.bandW1 ? 1 : 0) + (p.bandW2 ? 1 : 0);
                                    if (lengthSides > 0) parts.push(`${lengthSides} no Comp.`); if (widthSides > 0) parts.push(`${widthSides} na Larg.`); const bandingText = parts.length > 0 ? parts.join(' e ') : 'Nenhuma';
                                    return (
                                        <tr key={p.id}>
                                            <td className="td-name">{p.name}</td><td>{p.length}mm x {p.width}mm</td><td>{bandingText}</td><td>{p.qty}</td><td className="td-value">{formatCurrency(p.totalCost)}</td>
                                            <td className="actions"><button onClick={() => editPiece(p)} className="icon-button edit" title="Editar"><EditIcon /></button><button onClick={() => deletePiece(p.id, p.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card" style={{ marginTop: '2rem' }}>
                    <h2 className="section-title">Plano de Corte</h2>
                    <button onClick={handleGenerateCuttingPlan} className="btn btn-secondary" disabled={isLoadingPlan}>
                        {isLoadingPlan ? 'Gerando Planos...' : 'Gerar Plano de Corte'}
                    </button>

                    {isLoadingPlan && <p style={{marginTop: '1rem'}}>Calculando a melhor forma de cortar suas peças...</p>}

                    {/* Container para os dois planos */}
                    {/* A nova condição é esta: (landscapePlan || portraitPlan) */}
                    {(landscapePlan || portraitPlan) && (
                        <div className="cutting-plan-results-container">
                            
                            {/* Coluna do Plano Horizontal */}
                            <div className="cutting-plan-option">
                                <h3>Opção 1: Chapas na Horizontal</h3>
                                {landscapePlan && landscapePlan.usedSheets.length > 0 ? (
                                    <>
                                        <p className="canvas-info">Total de Chapas Usadas: <strong>{landscapePlan.usedSheets.length}</strong></p>
                                        <CuttingPlanCanvas cuttingPlan={landscapePlan} />
                                    </>
                                ) : (
                                    <p>{landscapePlan?.error || "Não foi possível gerar este plano."}</p>
                                )}
                            </div>

                            {/* Coluna do Plano Vertical */}
                            <div className="cutting-plan-option">
                                <h3>Opção 2: Chapas na Vertical</h3>
                                {portraitPlan && portraitPlan.usedSheets.length > 0 ? (
                                    <>
                                        <p className="canvas-info">Total de Chapas Usadas: <strong>{portraitPlan.usedSheets.length}</strong></p>
                                        <CuttingPlanCanvas cuttingPlan={portraitPlan} />
                                    </>
                                ) : (
                                    <p>{portraitPlan?.error || "Não foi possível gerar este plano."}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="card">
                    <h2 className="section-title">Fita de Borda</h2>
                    <div className="tabs-container">
                        <button type="button" onClick={() => setActiveBorderTapeTab('select')} className={`tab-button ${activeBorderTapeTab === 'select' ? 'active' : ''}`}>Selecionar do Catálogo</button>
                        <button type="button" onClick={() => setActiveBorderTapeTab('manual')} className={`tab-button ${activeBorderTapeTab === 'manual' ? 'active' : ''}`}>Adicionar Nova Fita</button>
                    </div>
                    <div className="tab-content" style={{marginTop: '1.5rem'}}>
                        {activeBorderTapeTab === 'select' && (
                            <div className="form-fade-in form-group">
                                <label>Fita para o Projeto</label>
                                <select value={borderTapes[0]?.isLocal ? '' : borderTapes[0]?.id || ''} onChange={handleBorderTapeSelection}>
                                    <option value="">-- Selecione uma fita --</option>
                                    {catalogEdgeBands.map(tape => (<option key={tape.id} value={tape.id}>{tape.name}</option>))}
                                </select>
                            </div>
                        )}
                        {activeBorderTapeTab === 'manual' && (
                            <div className="form-fade-in">
                                <h3 className="subsection-title">Informar Fita de Borda Avulsa</h3>
                                 <div className="form-grid-inputs-3">
                                    <div className="form-group"><label>Nome</label><input type="text" name="name" value={borderTapes[0]?.name || ''} onChange={handleManualBorderTapeChange} placeholder="Ex: Fita Azul 19mm" required/></div>
                                    <div className="form-group"><label>Preço do Rolo (R$)</label><input type="number" step="0.01" name="rollPrice" value={borderTapes[0]?.rollPrice || ''} onChange={handleManualBorderTapeChange} placeholder="Ex: 50.00 " required/></div>
                                    <div className="form-group"><label>Metros no Rolo (m)</label><input type="number" name="rollLength" value={borderTapes[0]?.rollLength || ''} onChange={handleManualBorderTapeChange} placeholder="Ex: 100.00 " required/></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="table-container" style={{marginTop: '1rem'}}>
                        <table>
                            <thead><tr><th className="th-name">Descrição</th><th>Origem</th><th>Metros Usados</th><th className="th-value">Valor Final</th></tr></thead>
                            <tbody>{borderTapes.map(t => (<tr key={t.id}><td className="td-name">{t.name || '(Não selecionada)'}</td><td>{t.isLocal ? <span className="badge-local">Local</span> : <span className="badge-catalog">Catálogo</span>}</td><td>{t.usedLength} m</td><td className="td-value">{formatCurrency(t.totalCost)}</td></tr>))}</tbody>
                        </table>
                    </div>
                </div>

                <div className="card" ref={unitItemFormRef}>
                    <h2 className="section-title">Itens Unitários</h2>
                    <form onSubmit={(e) => handleGenericSubmit(e, unitItemForm, setUnitItemForm, catalogUnitItems, unitItems, setUnitItems, 'Item', activeUnitItemTab)}>
                        <div className="tabs-container">
                            <button type="button" onClick={() => setActiveUnitItemTab('catalog')} className={`tab-button ${activeUnitItemTab === 'catalog' ? 'active' : ''}`}>Selecionar do Catálogo</button>
                            <button type="button" onClick={() => setActiveUnitItemTab('manual')} className={`tab-button ${activeUnitItemTab === 'manual' ? 'active' : ''}`}>Adicionar Novo Item</button>
                        </div>
                        <div className="tab-content" style={{marginTop: '1.5rem'}}>
                            {activeUnitItemTab === 'catalog' && (
                                <div className="form-fade-in form-group">
                                    <label>Item do Catálogo</label>
                                    <select name="catalogId" value={unitItemForm.catalogId} onChange={(e) => setUnitItemForm(p => ({...p, id: null, catalogId: e.target.value}))}>
                                        <option value="">-- Selecione um item --</option>{catalogUnitItems.map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}
                                    </select>
                                </div>
                            )}
                            {activeUnitItemTab === 'manual' && (
                                <div className="form-fade-in">
                                    <h3 className="subsection-title">{unitItemForm.id ? 'Editando Item' : 'Novo Item '}</h3>
                                     <div className="form-grid-inputs-2">
                                        <div className="form-group"><label>Nome</label><input type="text" name="name" value={unitItemForm.name} onChange={(e) => setUnitItemForm(p => ({...p, name: e.target.value}))} placeholder="Ex: Dobradiça " required /></div>
                                        <div className="form-group"><label>Valor Unitário (R$)</label><input type="number" step="0.01" name="unitPrice" value={unitItemForm.unitPrice} onChange={(e) => setUnitItemForm(p => ({...p, unitPrice: e.target.value}))} placeholder="Ex: 12.90 " required /></div>
                                     </div>
                                </div>
                            )}
                        </div>
                        <div className="form-group" style={{marginTop: '1rem', maxWidth: '200px'}}>
                            <label>Quantidade</label>
                            <input type="number" name="qty" value={unitItemForm.qty} onChange={(e) => setUnitItemForm(p => ({...p, qty: e.target.value}))} placeholder="Ex: 3 " required />
                        </div>
                        <button type="submit" className={`btn form-submit-button ${unitItemForm.id ? 'btn-save' : 'btn-add'}`}>{unitItemForm.id ? 'Salvar Alterações' : '+ Adicionar Item'}</button>
                    </form>
                    <div className="table-container">
                        <table>
                            <thead><tr><th className="th-name">Item</th><th>Qtd</th><th>Valor Unit.</th><th>Origem</th><th>Valor Final</th><th className="th-actions">Ações</th></tr></thead>
                            <tbody>{unitItems.map(item => (<tr key={item.id}><td>{item.name}</td><td>{item.qty}</td><td>{formatCurrency(item.unitPrice)}</td><td>{getOriginBadge(item)}</td><td className="td-value">{formatCurrency(item.totalCost)}</td>
                                <td className="actions">
                                    <button onClick={() => editUnitItem(item)} className="icon-button edit" title="Editar"><EditIcon /></button>
                                    <button onClick={() => deleteUnitItem(item.id, item.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button>
                                </td>
                            </tr>))}</tbody>
                        </table>
                    </div>
                </div>

                <div className="card" ref={hardwareFormRef}>
                    <h2 className="section-title">Ferragens em Caixa</h2>
                    <form onSubmit={(e) => handleGenericSubmit(e, hardwareForm, setHardwareForm, catalogHardware, hardware, setHardware, 'Ferragem', activeHardwareTab)}>
                        <div className="tabs-container">
                            <button type="button" onClick={() => setActiveHardwareTab('catalog')} className={`tab-button ${activeHardwareTab === 'catalog' ? 'active' : ''}`}>Selecionar do Catálogo</button>
                            <button type="button" onClick={() => setActiveHardwareTab('manual')} className={`tab-button ${activeHardwareTab === 'manual' ? 'active' : ''}`}>Adicionar Nova Ferragem</button>
                        </div>
                        <div className="tab-content" style={{marginTop: '1.5rem'}}>
                            {activeHardwareTab === 'catalog' && (
                                <div className="form-fade-in form-group">
                                    <label>Ferragem do Catálogo</label>
                                    <select name="catalogId" value={hardwareForm.catalogId} onChange={(e) => setHardwareForm(p => ({...p, id: null, catalogId: e.target.value}))}>
                                        <option value="">-- Selecione --</option>{catalogHardware.map(item => (<option key={item.id} value={item.id}>{item.name}</option>))}
                                    </select>
                                </div>
                            )}
                            {activeHardwareTab === 'manual' && (
                                <div className="form-fade-in">
                                    <h3 className="subsection-title">{hardwareForm.id ? 'Editando Ferragem' : 'Nova Ferragem '}</h3>
                                    <div className="form-grid-inputs-3">
                                        <div className="form-group"><label>Nome</label><input type="text" name="name" value={hardwareForm.name} onChange={(e) => setHardwareForm(p => ({...p, name: e.target.value}))} placeholder="Ex: Caixa de prego " required /></div>
                                        <div className="form-group"><label>Preço da Caixa (R$)</label><input type="number" step="0.01" name="boxPrice" value={hardwareForm.boxPrice} onChange={(e) => setHardwareForm(p => ({...p, boxPrice: e.target.value}))} placeholder="Ex: 50.00 " required /></div>
                                        <div className="form-group"><label>Qtd na Caixa</label><input type="number" name="boxQty" value={hardwareForm.boxQty} onChange={(e) => setHardwareForm(p => ({...p, boxQty: e.target.value}))} placeholder="Ex: 500 " required /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="form-group" style={{marginTop: '1rem', maxWidth: '200px'}}>
                            <label>Quantidade Usada</label>
                            <input type="number" name="usedQty" value={hardwareForm.usedQty} onChange={(e) => setHardwareForm(p => ({...p, usedQty: e.target.value}))} placeholder="Ex: 3" required />
                        </div>
                        <button type="submit" className={`btn form-submit-button ${hardwareForm.id ? 'btn-save' : 'btn-add'}`}>{hardwareForm.id ? 'Salvar Alterações' : '+ Adicionar Item'}</button>
                    </form>
                    <div className="table-container">
                        <table>
                            {/* CORREÇÃO CSS: Adicionada className="th-actions" */}
                            <thead><tr><th className="th-name">Item</th><th>Qtd Usada</th><th>Origem</th><th>Valor Final</th><th className="th-actions">Ações</th></tr></thead>
                            <tbody>{hardware.map(i => (<tr key={i.id}><td>{i.name}</td><td>{i.usedQty}</td><td>{getOriginBadge(i)}</td><td className="td-value">{formatCurrency(i.totalCost)}</td>
                                {/* CORREÇÃO CSS: Adicionada className="actions" */}
                                <td className="actions">
                                    <button onClick={() => editHardware(i)} className="icon-button edit" title="Editar"><EditIcon /></button>
                                    <button onClick={() => deleteHardware(i.id, i.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button>
                                </td>
                            </tr>))}</tbody>
                        </table>
                    </div>
                </div>
                
                <div className="card summary-card">
                    <h2 className="section-title">Orçamento Final</h2>
                    <div className="form-group">
                        <label>Desconto</label>
                        <select value={discountPercentage} onChange={(e) => setDiscountPercentage(Number(e.target.value))} className="form-input-style">
                            <option value="0">Sem desconto</option><option value="5">5%</option><option value="10">10%</option>
                        </select>
                    </div>
                    <div className="summary-details">
                        <div className="summary-item"><span>Subtotal (Materiais):</span><span>{formatCurrency(totals.subtotal)}</span></div>
                        <div className="summary-item"><span>Ajudante:</span><span>{formatCurrency(totals.finalHelperCost)}</span></div>
                        <div className="summary-item"><span>Frete:</span><span>{formatCurrency(totals.finalDeliveryFee)}</span></div>
                        <hr className="summary-divider" />
                        
                        <div className="summary-item">
                            <span>Valor Calculado pelo Algoritmo (Custo + Lucro):</span>
                            <span>{formatCurrency(totals.grandTotal)}</span>
                        </div>

                        {/* Este campo agora funciona como o SUB-TOTAL antes do desconto */}
                        <div className="form-group grand-total-input">
                            <label htmlFor="finalBudgetPrice">VALOR TOTAL DO ORÇAMENTO (R$)</label>
                                <input 
                                    type="number"
                                    id="finalBudgetPrice"
                                    className="form-input-style final-price-input"
                                    value={finalBudgetPrice}
                                    onChange={(e) => {
                                        setFinalBudgetPrice(e.target.value);
                                        setIsPriceManuallySet(true); 
                                    }}
                                    placeholder="Digite o valor total"
                                />
                        </div>
                        
                        {/* Exibição do desconto calculado sobre o valor manual */}
                        {totals.finalDiscountAmount > 0 && (
                             <div className="summary-item">
                                <span>Desconto ({discountPercentage}%):</span>
                                <span style={{ color: '#dc2626', fontWeight: '500' }}>
                                    - {formatCurrency(totals.finalDiscountAmount)}
                                </span>
                            </div>
                        )}

                        {/* O NOVO TOTAL FINAL, com desconto aplicado */}
                        <div className="summary-item grand-total">
                            <span>VALOR TOTAL:</span>
                            <span>{formatCurrency(totals.finalValue)}</span>
                        </div>
                    </div>
                    <div className="summary-buttons">
                        <button onClick={handleCancelBudget} className="btn btn-back">Cancelar Orçamento</button>
                        <button onClick={handleGeneratePdf} className="btn btn-print-open">Gerar PDF</button>
                        <button onClick={handleSaveBudget} className="btn btn-save">{editingId ? 'Atualizar Orçamento' : 'Salvar Orçamento'}</button>
                    </div>
                </div>
            </main>

            <Modal 
                isOpen={modalState.isOpen} 
                onClose={closeModal} 
                onConfirm={modalState.onConfirm} 
                title={modalState.title} 
                confirmButtonClass={modalState.confirmButtonClass}
            >
                <p>{modalState.message}</p>
            </Modal>

            {/* Modal para confirmar a restauração do rascunho - VERSÃO CORRIGIDA */}
            <Modal 
                isOpen={draftModalState.isOpen} 
                onClose={handleDiscardDraft} 
                title="Rascunho Encontrado"
                footer={
                    <div className="modal-actions">
                    <button onClick={handleDiscardDraft} className="btn btn-novo">
                        Começar um Novo
                    </button>
                    <button onClick={handleRestoreDraft} className="btn btn-restaurar">
                        Sim, Restaurar Rascunho
                    </button>
                    </div>
                }
                >
                <p>Encontramos um orçamento não salvo. Deseja restaurá-lo ou começar um novo?</p>
                </Modal>
        </div>
    );
};

export default BudgetCalculator;