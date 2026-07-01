import React, { useState, useMemo, useEffect } from 'react';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs, Firestore } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Componentes
import ClientForm from './budget/ClientForm';
import PieceManager from './budget/PieceManager';
import SheetManager from './budget/SheetManager';
import ExtrasManager from './budget/ExtrasManager';
import CuttingPlanCanvas from './CuttingPlanCanvas';

// Utils
import { getImageBase64, formatCurrency, safeParseFloat, calcPieceRawCost } from '../utils/helpers';
import { unmaskMoney, unmaskNumber, maskCurrency } from '../utils/masks';
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';
import { generateCuttingPlan } from '../utils/cuttingOptimizer';

// === TYPESCRIPT INTERFACES ===
export interface Sheet { 
    id: string | null; 
    name: string; 
    price: string | number; 
    length: string | number; 
    width: string | number; 
    type?: string;
    isLocal?: boolean;
    isOverride?: boolean;
    [key: string]: any; 
}
export interface Piece { 
    id: string | null; 
    name: string; 
    length: string | number; 
    width: string | number; 
    qty: string | number; 
    sheetId: string; 
    bandL1: boolean;
    bandL2: boolean;
    bandW1: boolean;
    bandW2: boolean;
    grainLock?: boolean;
    totalCost?: number;
}
export interface Hardware { id: string; name: string; boxPrice: string | number; boxQty: string | number; usedQty: string | number; totalCost?: number; [key: string]: any; }
export interface UnitItem { id: string; name: string; unitPrice: string | number; qty: string | number; totalCost?: number; [key: string]: any; }
export interface BorderTape { id: string; name: string; rollPrice: string | number; rollLength: string | number; usedLength?: string | number; totalCost?: number; [key: string]: any; }

interface BudgetCalculatorProps {
    setCurrentPage: (page: string) => void;
    budgetToEdit: any | null;
    clearEditingBudget: () => void;
    db: Firestore | null;
    DADOS_DA_EMPRESA: any;
    logoDaEmpresa: string;
}

const DRAFT_KEY = 'mvmoveis_orcamento_rascunho';
// Só vale a pena restaurar se tiver cliente ou peças (não só o catálogo de chapas)
const draftHasContent = (d: any) => !!d && (
    !!(d.clientName && String(d.clientName).trim()) ||
    (Array.isArray(d.pieces) && d.pieces.length > 0)
);

const BudgetCalculator: React.FC<BudgetCalculatorProps> = ({
    setCurrentPage, budgetToEdit, clearEditingBudget, db, DADOS_DA_EMPRESA, logoDaEmpresa
}) => {
    
    // === ESTADOS ===
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    
    const [profitMargin, setProfitMargin] = useState<string | number>(180);
    const [helperCost, setHelperCost] = useState<string | number>('');
    const [deliveryFee, setDeliveryFee] = useState<string | number>('');
    const [discountPercentage, setDiscountPercentage] = useState<string | number>(0);
    const [finalBudgetPrice, setFinalBudgetPrice] = useState<string>('');
    
    const [sheets, setSheets] = useState<Sheet[]>([]);
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [borderTapes, setBorderTapes] = useState<BorderTape[]>([]);
    const [unitItems, setUnitItems] = useState<UnitItem[]>([]);
    const [hardware, setHardware] = useState<Hardware[]>([]);
    
    const [catalogSheets, setCatalogSheets] = useState<Sheet[]>([]);
    const [catalogEdgeBands, setCatalogEdgeBands] = useState<BorderTape[]>([]);
    const [catalogUnitItems, setCatalogUnitItems] = useState<UnitItem[]>([]);
    const [catalogHardware, setCatalogHardware] = useState<Hardware[]>([]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [budgetId, setBudgetId] = useState('');
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);
    const [cuttingPlan, setCuttingPlan] = useState<any>(null);
    const [cuttingGap, setCuttingGap] = useState<number>(3);
    const [draftFound, setDraftFound] = useState<any>(null);
    const [autosaveOn, setAutosaveOn] = useState(false);

    const initialPieceForm: Piece = useMemo(() => ({
        name: "", length: "", width: "", qty: 1, sheetId: '',
        bandL1: false, bandL2: false, bandW1: false, bandW2: false, grainLock: false, id: null
    }), []);
    const [pieceForm, setPieceForm] = useState<Piece>(initialPieceForm);

    const handleBack = () => {
        clearEditingBudget();
        if (editingId) {
            setCurrentPage('saved');
        } else {
            setCurrentPage('home');
        }
    };

    const continueDraft = () => {
        const d = draftFound;
        if (d) {
            setClientName(d.clientName || '');
            setClientPhone(d.clientPhone || '');
            setProjectName(d.projectName || '');
            setDescription(d.description || '');
            setProfitMargin(d.profitMargin ?? 180);
            setHelperCost(d.helperCost ?? '');
            setDeliveryFee(d.deliveryFee ?? '');
            setDiscountPercentage(d.discountPercentage ?? 0);
            setFinalBudgetPrice(d.finalBudgetPrice || '');
            setSheets(d.sheets || []);
            setPieces(d.pieces || []);
            setBorderTapes(d.borderTapes || []);
            setUnitItems(d.unitItems || []);
            setHardware(d.hardware || []);
            setCuttingGap(d.cuttingGap ?? 3);
        }
        setDraftFound(null);
        setAutosaveOn(true);
    };

    const discardDraft = () => {
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignora */ }
        setDraftFound(null);
        setAutosaveOn(true);
        setSheets([]);
    };

    // === CARREGAR CATÁLOGOS ===
    useEffect(() => {
        const loadCatalog = async () => {
            if (!db) return;
            try {
                const querySnapshot = await getDocs(collection(db, "materials"));
                const all = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
                setCatalogSheets(all.filter((m: any) => m.type === 'sheet'));
                setCatalogEdgeBands(all.filter((m: any) => m.type === 'edge_band'));
                setCatalogUnitItems(all.filter((m: any) => m.type === 'unitary_item'));
                setCatalogHardware(all.filter((m: any) => m.type === 'hardware_box'));
            } catch (error) { toast.error("Erro ao carregar catálogo."); }
        };
        loadCatalog();
    }, [db]);

    // === CARREGAR ORÇAMENTO PARA EDIÇÃO ===
   // === CARREGAR ORÇAMENTO PARA EDIÇÃO ===
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
            setFinalBudgetPrice(budgetToEdit.finalBudgetPrice ? maskCurrency(budgetToEdit.finalBudgetPrice.toFixed(2)) : '');
            
            // Carrega os itens salvos do orçamento
            setSheets(budgetToEdit.sheets || []);
            setPieces(budgetToEdit.pieces || []);
            setHardware(budgetToEdit.hardware || []);
            setUnitItems(budgetToEdit.unitItems || []);
            setBorderTapes(budgetToEdit.borderTapes || []);
        } else {
            const fetchId = async () => {
                if(!db) return;
                try {
                    const snap = await getDoc(doc(db, "counters", "budgets"));
                    setBudgetId(String((snap.data()?.lastId || 0) + 1).padStart(3, '0'));
                } catch (e) { console.error(e); }
            };
            fetchId();

            // Procura um rascunho local não salvo
            let hasDraft = false;
            try {
                const raw = localStorage.getItem(DRAFT_KEY);
                if (raw) {
                    const draft = JSON.parse(raw);
                    if (draftHasContent(draft)) { setDraftFound(draft); hasDraft = true; }
                    else { localStorage.removeItem(DRAFT_KEY); }
                }
            } catch (e) { /* localStorage indisponível */ }

            // Sem rascunho: começa vazio e já liga o autosave
            if (!hasDraft) { setAutosaveOn(true); setSheets([]); }
        }
    }, [budgetToEdit, db]);

    // === SALVAMENTO AUTOMÁTICO LOCAL (RASCUNHO) ===
    useEffect(() => {
        if (!autosaveOn || editingId) return; // não cria rascunho ao editar um orçamento salvo
        const draft = {
            clientName, clientPhone, projectName, description,
            profitMargin, helperCost, deliveryFee, discountPercentage, finalBudgetPrice,
            sheets, pieces, borderTapes, unitItems, hardware, cuttingGap,
            savedAt: Date.now()
        };
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* ignora */ }
    }, [autosaveOn, editingId, clientName, clientPhone, projectName, description,
        profitMargin, helperCost, deliveryFee, discountPercentage, finalBudgetPrice,
        sheets, pieces, borderTapes, unitItems, hardware, cuttingGap]);

    // === SINCRONIZAR NOVOS ITENS DO CATÁLOGO (A MÁGICA) ===
    useEffect(() => {
        if (catalogSheets.length > 0) {
            setSheets(prevSheets => {
                const merged = [...prevSheets];
                catalogSheets.forEach(catSheet => {
                    // Se a chapa do catálogo não existir na lista do orçamento, adiciona ela!
                    if (!merged.find(s => s.id === catSheet.id)) {
                        merged.push(catSheet);
                    }
                });
                return merged;
            });
        }
    }, [catalogSheets]);

    // === CÁLCULOS BLINDADOS (PUROS, SEM MUTAR O ESTADO) ===
    const totals = useMemo(() => {
        const cleanMargin = unmaskNumber(profitMargin);
        const cleanHelper = unmaskMoney(helperCost);
        const cleanDelivery = unmaskMoney(deliveryFee);
        const cleanDiscount = unmaskNumber(discountPercentage);
        const cleanFinalPrice = unmaskMoney(finalBudgetPrice);

        // 1. CUSTO REAL DOS MATERIAIS (Sem lucro)
        const rawPiecesCost = pieces.reduce((acc, p) => {
            const s = sheets.find(sheet => sheet.id === p.sheetId);
            return acc + calcPieceRawCost(p, s);
        }, 0);

        const rawHardwareCost = hardware.reduce((acc, i) =>
            acc + (safeParseFloat(i.boxPrice) / (safeParseFloat(i.boxQty) || 1) * safeParseFloat(i.usedQty)), 0);

        const rawUnitItemsCost = unitItems.reduce((acc, i) =>
            acc + (safeParseFloat(i.unitPrice) * safeParseFloat(i.qty)), 0);

        const totalTapeMm = pieces.reduce((acc, p) => {
            let perim = 0;
            const len = safeParseFloat(p.length);
            const wid = safeParseFloat(p.width);
            if(p.bandL1) perim += len; if(p.bandL2) perim += len;
            if(p.bandW1) perim += wid; if(p.bandW2) perim += wid;
            return acc + (perim * safeParseFloat(p.qty));
        }, 0);
        const tapeMeters = totalTapeMm / 1000;

        let rawBorderTapeCost = 0;
        if (borderTapes.length > 0) {
            const tape = borderTapes[0];
            rawBorderTapeCost = tapeMeters * (safeParseFloat(tape.rollPrice) / (safeParseFloat(tape.rollLength) || 1));
        }

        // --- MATEMÁTICA CLARA ---
        const totalRawMaterialCost = rawPiecesCost + rawHardwareCost + rawUnitItemsCost + rawBorderTapeCost;
        const extrasCost = (cleanHelper||0) + (cleanDelivery||0);

        // O que realmente sai do bolso do seu pai (Custo Total do Projeto)
        const totalProjectCost = totalRawMaterialCost + extrasCost;

        // Aplica o lucro APENAS em cima da madeira/ferragens
        const materialComLucro = totalRawMaterialCost * (1 + (cleanMargin / 100));

        // Preço sugerido pelo sistema (Material com lucro + Frete/Ajudante secos)
        const grandTotal = materialComLucro + extrasCost;

        // Se "Forçar Preço Final" tiver valor, ele É o valor final (ignora o cálculo
        // automático, inclusive o desconto). O desconto % só age no preço sugerido.
        const subtotalBeforeDiscount = cleanFinalPrice > 0 ? cleanFinalPrice : grandTotal;
        const discountAmount = cleanFinalPrice > 0 ? 0 : grandTotal * (cleanDiscount / 100);
        const finalValue = subtotalBeforeDiscount - discountAmount;

        // O lucro limpo é o que o cliente pagou de fato, menos o que custou pra fazer
        const estimatedProfit = finalValue - totalProjectCost;

        return {
            grandTotal,
            subtotal: materialComLucro,
            rawMaterialCost: totalRawMaterialCost,
            finalHelperCost: cleanHelper||0,
            finalDeliveryFee: cleanDelivery||0,
            totalProjectCost,
            estimatedProfit,
            finalValue,
            subtotalBeforeDiscount,
            discountAmount,
            tapeMeters
        };
    }, [pieces, sheets, profitMargin, helperCost, deliveryFee, finalBudgetPrice, discountPercentage, hardware, unitItems, borderTapes]);

    // === HANDLERS ===
    const handleSave = async () => {
        if (!clientName) return toast.error('Nome do cliente obrigatório.');
        if (!db) return;
        const toastId = toast.loading('Salvando...');
        try {
            const data = { 
                budgetId, clientName, clientPhone, projectName, description, 
                profitMargin: unmaskNumber(profitMargin), 
                discountPercentage: unmaskNumber(discountPercentage),
                sheets, pieces, hardware, unitItems, borderTapes, 
                createdAt: new Date().toISOString(), status: budgetToEdit?.status || 'Pendente', 
                ...totals, 
                finalBudgetPrice: unmaskMoney(finalBudgetPrice) || totals.finalValue
            };
            
            if (editingId) await updateDoc(doc(db, "budgets", editingId), data);
            else await addDoc(collection(db, "budgets"), data);
            
            try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignora */ }
            toast.success('Salvo!', { id: toastId });
            clearEditingBudget();
            setCurrentPage('saved');
        } catch (e) { toast.error('Erro ao salvar.', { id: toastId }); }
    };

    const handlePdf = async () => {
        if (!clientName) return toast.error('Nome obrigatório.');
        try {
            const logo = await getImageBase64(logoDaEmpresa);
            // Injeta o comprimento de fita usado (calculado em totals) para exibir no PDF
            const tapesForPdf = borderTapes.map((t, idx) => idx === 0
                ? { ...t, usedLength: totals.tapeMeters.toFixed(2) }
                : t);
            const data = {
                ...totals, budgetId, clientName, clientPhone, projectName, description,
                discountPercentage: unmaskNumber(discountPercentage), pieces, hardware,
                unitItems, borderTapes: tapesForPdf, createdAt: new Date().toISOString(),
                finalBudgetPrice: unmaskMoney(finalBudgetPrice) || totals.finalValue,
                qrCodeImage: qrCodeBase64
            };
            generateBudgetPdf(data, DADOS_DA_EMPRESA, logo);
        } catch (e) { toast.error("Erro no PDF."); }
    };

    const handlePlan = () => {
        if (!pieces.length) return toast.error("Sem peças para calcular.");
        setIsLoadingPlan(true);
        setTimeout(() => {
            const pArr = pieces.map(p => ({
                ...p,
                length: parseFloat(String(p.length)),
                width: parseFloat(String(p.width)),
                qty: Math.max(1, parseInt(String(p.qty)) || 1)
            })).flatMap(p => Array.from({length: p.qty}, (_, i) => ({...p, uniqueId: `${p.id}-${i}`})));

            const plan = generateCuttingPlan(pArr, sheets, cuttingGap);
            if (plan.error) {
                toast.error(plan.error);
                setCuttingPlan(null);
            } else {
                setCuttingPlan(plan);
            }
            setIsLoadingPlan(false);
        }, 100);
    };

    return (
        <div className="flex flex-col items-center pb-24 w-full bg-gray-50 min-h-screen">
            
            <header className="flex flex-col items-center pt-8 pb-6 px-4 w-full bg-white shadow-sm mb-6 rounded-b-3xl border-b border-gray-100">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">
                    {editingId ? `Orçamento #${budgetId}` : `Novo Orçamento`}
                </h1>
                <p className="text-gray-500 font-medium text-sm mb-4">Marcenaria MVMóveis</p>
                <button 
                    onClick={handleBack} 
                    className="flex items-center justify-center px-6 py-2.5 bg-gray-100 text-gray-700 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors w-full max-w-xs"
                >
                    ← Voltar sem salvar
                </button>
            </header>

            <main className="flex flex-col gap-6 w-full max-w-3xl px-4">

                {draftFound && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 flex flex-col gap-3 shadow-sm">
                        <div>
                            <h3 className="font-extrabold text-amber-900 text-lg tracking-tight">Orçamento em andamento</h3>
                            <p className="text-sm text-amber-700 font-medium mt-0.5">
                                Encontramos um rascunho não salvo
                                {draftFound.clientName ? ` de "${draftFound.clientName}"` : ''}
                                {draftFound.savedAt ? ` (${new Date(draftFound.savedAt).toLocaleString('pt-BR')})` : ''}.
                                Deseja continuar de onde parou?
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={continueDraft} className="py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-colors active:scale-[0.98]">
                                Continuar
                            </button>
                            <button onClick={discardDraft} className="py-3 bg-white border border-amber-200 text-amber-700 font-bold rounded-2xl hover:bg-amber-100 transition-colors active:scale-[0.98]">
                                Descartar
                            </button>
                        </div>
                    </div>
                )}

                <ClientForm
                    clientName={clientName} setClientName={setClientName} 
                    clientPhone={clientPhone} setClientPhone={setClientPhone} 
                    projectName={projectName} setProjectName={setProjectName} 
                    profitMargin={profitMargin} setProfitMargin={setProfitMargin} 
                    helperCost={helperCost} setHelperCost={setHelperCost} 
                    deliveryFee={deliveryFee} setDeliveryFee={setDeliveryFee} 
                    description={description} setDescription={setDescription} 
                />
                
                <SheetManager sheets={sheets} setSheets={setSheets} catalogSheets={catalogSheets} />
                
                <PieceManager
                    pieces={pieces as any} setPieces={setPieces as any}
                    sheets={sheets as any} pieceForm={pieceForm as any}
                    setPieceForm={setPieceForm as any} initialPieceForm={initialPieceForm as any}
                    profitMargin={profitMargin}
                    onEdit={(piece: any) => setPieceForm(piece)}
                    onDelete={(id: string) => setPieces(p => p.filter(i => i.id !== id))}
                />
                
                <ExtrasManager 
                    borderTapes={borderTapes} setBorderTapes={setBorderTapes} catalogEdgeBands={catalogEdgeBands} 
                    unitItems={unitItems} setUnitItems={setUnitItems} catalogUnitItems={catalogUnitItems} 
                    hardware={hardware} setHardware={setHardware} catalogHardware={catalogHardware} 
                />

                {/* --- PLANO DE CORTE --- */}
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                    <h2 className="text-xl font-extrabold text-gray-800 tracking-tight">Plano de Corte</h2>

                    {/* Folga de serra (kerf) */}
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-700">Folga de serra</span>
                            <span className="text-xs text-gray-400">Espessura do disco (perda por corte)</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <input
                                type="number" min={0} max={20} step={1}
                                value={cuttingGap}
                                onChange={e => setCuttingGap(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                                className="w-16 h-11 text-center font-bold text-gray-800 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <span className="font-bold text-gray-400 text-sm">mm</span>
                        </div>
                    </div>

                    <button
                        onClick={handlePlan}
                        disabled={isLoadingPlan}
                        className="w-full py-4 bg-indigo-50 text-indigo-700 font-bold rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-colors active:scale-95"
                    >
                        {isLoadingPlan ? 'Calculando a melhor rota...' : 'Gerar Visualização de Corte'}
                    </button>
                    {cuttingPlan && cuttingPlan.usedSheets && cuttingPlan.usedSheets.length > 0 && (
                        <div className="mt-2">
                            <CuttingPlanCanvas
                                cuttingPlan={cuttingPlan}
                                meta={{ projectName, clientName, clientPhone, budgetId }}
                            />
                        </div>
                    )}
                </div>

                {/* --- RESUMO FINANCEIRO À PROVA DE CONFUSÃO --- */}
                <div className="bg-white p-6 md:p-7 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col gap-4 relative overflow-hidden mt-2">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 via-blue-600 to-emerald-500"></div>
                    
                    <h2 className="text-2xl font-black text-gray-950 mb-3 tracking-tighter">Resumo Financeiro</h2>
                    
                    <div className="flex flex-col gap-4">
                        {/* 1. O PASSO A PASSO DO CÁLCULO */}
                        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 flex flex-col gap-3">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Extrato do Projeto:</span>
                            
                            <div className="flex justify-between items-center text-gray-700 font-medium">
                                <span>1. Custo Real (Balcão Madeireira):</span>
                                <span className="text-red-600 font-bold">{formatCurrency(totals.rawMaterialCost)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-gray-700 font-medium">
                                <span>2. Materiais com Lucro ({profitMargin}%):</span>
                                <span className="text-gray-900 font-bold">{formatCurrency(totals.subtotal)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-gray-700 font-medium border-b border-gray-200 pb-3">
                                <span>3. Ajudante + Frete:</span>
                                <span className="text-gray-900 font-bold">{formatCurrency(totals.finalHelperCost + totals.finalDeliveryFee)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center pt-1">
                                <span className="font-extrabold text-blue-700 uppercase tracking-tight text-sm">Valor Sugerido ao Cliente:</span>
                                <span className="font-black text-blue-700 text-lg">{formatCurrency(totals.grandTotal)}</span>
                            </div>
                        </div>
                        
                        {/* 2. VISÃO DO CLIENTE */}
                        <div className="flex flex-col items-center bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl border border-blue-200 shadow-lg shadow-blue-500/30">
                            <span className="text-blue-100 font-bold uppercase tracking-wider text-sm mb-1 text-center">Valor Final para o Cliente</span>
                            <span className="text-5xl font-black text-white tracking-tighter tabular-nums text-center break-all">{formatCurrency(totals.finalValue)}</span>
                        </div>
                        
                        {/* 3. VISÃO DO DONO (LUCRO LIMPO) */}
                        <div className="flex flex-col items-center bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl p-5 mt-1">
                            <span className="text-emerald-800 font-bold uppercase tracking-wider text-xs mb-1 text-center">Seu Lucro Líquido Real (Limpo)</span>
                            <span className="text-3xl font-extrabold text-emerald-700 tracking-tight tabular-nums text-center">{formatCurrency(totals.estimatedProfit)}</span>
                        </div>
                    </div>

                    {/* Input de Negociação Manual */}
                    <div className="mt-5 flex flex-col gap-2 border-t-2 border-gray-50 pt-4">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Forçar Preço Final (Opcional)</label>
                        <div className="relative w-full">
                            <input 
                                type="tel" 
                                className="w-full h-14 px-5 pr-12 text-lg font-bold text-gray-950 bg-amber-50 border-2 border-amber-200 rounded-2xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none" 
                                value={finalBudgetPrice} 
                                onChange={e => setFinalBudgetPrice(maskCurrency(e.target.value))} 
                                placeholder="R$ 0,00" 
                            />
                             <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-amber-500 select-none pointer-events-none">R$</span>
                        </div>
                        <p className="text-xs text-gray-400 text-center mt-1">Para dar um desconto ou arredondar, digite o novo valor acima. Isso irá ignorar o cálculo automático.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-4 mb-10">
                    <button onClick={handleSave} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] text-lg">
                        {editingId ? 'Atualizar Orçamento' : 'Salvar Orçamento'}
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleBack} className="py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm hover:bg-gray-50 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handlePdf} className="py-4 bg-orange-100 border border-orange-200 text-orange-700 font-bold rounded-2xl shadow-sm hover:bg-orange-200 transition-colors">
                            Gerar PDF
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BudgetCalculator;