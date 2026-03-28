import React, { useState, useMemo, useEffect } from 'react';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs, Firestore } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Componentes
import ClientForm from './budget/ClientForm';
import PieceManager from './budget/PieceManager';
import SheetManager from './budget/SheetManager';
import ExtrasManager from './budget/ExtrasManager';
import Modal from './Modal';
import CuttingPlanCanvas from './CuttingPlanCanvas';

// Utils
import { getImageBase64, formatCurrency } from '../utils/helpers';
import { unmaskMoney, unmaskNumber, maskCurrency } from '../utils/masks'; 
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';
import { cuttingOptimizer } from '../utils/cuttingOptimizer';

// === TYPESCRIPT INTERFACES ===
// Garantindo que Sheet aceita qualquer propriedade extra do Firebase e se alinha com o SheetManager
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
    const [landscapePlan, setLandscapePlan] = useState<any>(null);
    const [portraitPlan, setPortraitPlan] = useState<any>(null);

    const initialPieceForm: Piece = useMemo(() => ({
        name: "", length: "", width: "", qty: 1, sheetId: '', 
        bandL1: false, bandL2: false, bandW1: false, bandW2: false, id: null
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
            
            setSheets(budgetToEdit.sheets?.length > 0 ? budgetToEdit.sheets : catalogSheets);
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
            setSheets(catalogSheets);
        }
    }, [budgetToEdit, catalogSheets, db]);

    // === CÁLCULOS BLINDADOS ===
    const totals = useMemo(() => {
        const safeParseFloat = (val: string | number | undefined | null) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const strStr = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
            return parseFloat(strStr) || 0;
        };

        const cleanMargin = unmaskNumber(profitMargin); 
        const cleanHelper = unmaskMoney(helperCost);
        const cleanDelivery = unmaskMoney(deliveryFee);
        const cleanDiscount = unmaskNumber(discountPercentage);
        const cleanFinalPrice = unmaskMoney(finalBudgetPrice); 

        const marginMultiplier = 1 + (cleanMargin || 0) / 100;
        
        const totalPiecesPrice = pieces.reduce((acc, p) => { 
            const s = sheets.find(sheet => sheet.id === p.sheetId); 
            if (!s) return acc;

            let sLength = safeParseFloat(s.length);
            let sWidth = safeParseFloat(s.width);
            const sPrice = safeParseFloat(s.price);

            if (sLength > 0 && sLength < 100) sLength *= 1000;
            if (sWidth > 0 && sWidth < 100) sWidth *= 1000;

            const sArea = sLength * sWidth; 
            if (sArea <= 0) return acc; 

            const ppsmm = sPrice / sArea; 
            const pArea = safeParseFloat(p.length) * safeParseFloat(p.width); 
            let price = pArea * ppsmm * safeParseFloat(p.qty) * marginMultiplier;
            
            p.totalCost = price; 
            return acc + price; 
        }, 0);

        const totalHardwarePrice = hardware.reduce((acc, i) => {
            const cost = (safeParseFloat(i.boxPrice) / (safeParseFloat(i.boxQty) || 1) * safeParseFloat(i.usedQty) * marginMultiplier);
            i.totalCost = cost;
            return acc + cost;
        }, 0);

        const totalUnitItemsPrice = unitItems.reduce((acc, i) => {
            const cost = (safeParseFloat(i.unitPrice) * safeParseFloat(i.qty) * marginMultiplier);
            i.totalCost = cost;
            return acc + cost;
        }, 0);
        
        const totalTapeMm = pieces.reduce((acc, p) => {
            let perim = 0;
            const len = safeParseFloat(p.length);
            const wid = safeParseFloat(p.width);
            if(p.bandL1) perim += len; if(p.bandL2) perim += len;
            if(p.bandW1) perim += wid; if(p.bandW2) perim += wid;
            return acc + (perim * safeParseFloat(p.qty));
        }, 0);
        
        let totalBorderTapePrice = 0;
        if (borderTapes.length > 0) {
            const tape = borderTapes[0];
            tape.usedLength = (totalTapeMm / 1000).toFixed(2);
            totalBorderTapePrice = (parseFloat(String(tape.usedLength)) * (safeParseFloat(tape.rollPrice) / (safeParseFloat(tape.rollLength) || 1))) * marginMultiplier;
            tape.totalCost = totalBorderTapePrice;
        }

        const subtotalMaterialsPrice = totalPiecesPrice + totalHardwarePrice + totalUnitItemsPrice + totalBorderTapePrice;
        const rawMaterialCost = marginMultiplier > 0 ? subtotalMaterialsPrice / marginMultiplier : 0;
        const extrasCost = (cleanHelper||0) + (cleanDelivery||0);
        const totalProjectCost = rawMaterialCost + extrasCost;
        const grandTotal = subtotalMaterialsPrice + extrasCost;
        
        const valorBase = cleanFinalPrice || grandTotal;
        const finalValue = valorBase - (valorBase * (cleanDiscount/100));
        const estimatedProfit = finalValue - totalProjectCost;

        return { 
            grandTotal, subtotal: subtotalMaterialsPrice, finalValue, 
            finalHelperCost: cleanHelper||0, finalDeliveryFee: cleanDelivery||0,
            totalProjectCost, estimatedProfit
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
            
            toast.success('Salvo!', { id: toastId });
            clearEditingBudget();
            setCurrentPage('saved');
        } catch (e) { toast.error('Erro ao salvar.', { id: toastId }); }
    };

    const handlePdf = async () => {
        if (!clientName) return toast.error('Nome obrigatório.');
        try {
            const logo = await getImageBase64(logoDaEmpresa);
            const data = { 
                ...totals, budgetId, clientName, clientPhone, projectName, description, 
                discountPercentage: unmaskNumber(discountPercentage), pieces, hardware, 
                unitItems, borderTapes, createdAt: new Date().toISOString(), 
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
                qty: parseInt(String(p.qty))
            })).flatMap(p => Array.from({length: p.qty}, (_, i) => ({...p, uniqueId: `${p.id}-${i}`})));
            
            setLandscapePlan(cuttingOptimizer([...pArr], sheets.map(s=>({...s}))));
            setPortraitPlan(cuttingOptimizer([...pArr], sheets.map(s=>({...s, length: s.width, width: s.length, name: s.name+' (Vert)'}))));
            setIsLoadingPlan(false);
        }, 100);
    };

    return (
        <div className="flex flex-col items-center pb-24 w-full bg-gray-50 min-h-screen">
            
            <header className="flex flex-col items-center pt-8 pb-6 px-4 w-full bg-white shadow-sm mb-6 rounded-b-3xl border-b border-gray-100">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
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
                
                <ClientForm {...{clientName, setClientName, clientPhone, setClientPhone, projectName, setProjectName, profitMargin, setProfitMargin, helperCost, setHelperCost, deliveryFee, setDeliveryFee, description, setDescription}} />
                
                <SheetManager sheets={sheets} setSheets={setSheets} catalogSheets={catalogSheets} />
                
                <PieceManager pieces={pieces as any} setPieces={setPieces as any} sheets={sheets as any} pieceForm={pieceForm as any} setPieceForm={setPieceForm as any} initialPieceForm={initialPieceForm as any} onEdit={(piece: any) => setPieceForm(piece)} onDelete={(id: string) => setPieces(p => p.filter(i => i.id !== id))} />
                
                <ExtrasManager {...{borderTapes, setBorderTapes, catalogEdgeBands, unitItems, setUnitItems, catalogUnitItems, hardware, setHardware, catalogHardware}} />

                {/* --- PLANO DE CORTE --- */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                    <h2 className="text-xl font-extrabold text-gray-800">Plano de Corte</h2>
                    <button 
                        onClick={handlePlan} 
                        disabled={isLoadingPlan} 
                        className="w-full py-4 bg-indigo-50 text-indigo-700 font-bold rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-colors active:scale-95"
                    >
                        {isLoadingPlan ? 'Calculando a melhor rota...' : 'Gerar Visualização de Corte'}
                    </button>
                    {(landscapePlan || portraitPlan) && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
                            {landscapePlan && <CuttingPlanCanvas cuttingPlan={landscapePlan} />}
                        </div>
                    )}
                </div>

                {/* --- RESUMO FINANCEIRO --- */}
                <div className="bg-white p-6 rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                    
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Resumo Financeiro</h2>
                    
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-gray-600 font-medium">
                            <span>Materiais & Ferragens:</span>
                            <span className="text-gray-900 font-bold">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600 font-medium">
                            <span>Ajudante + Frete:</span>
                            <span className="text-gray-900 font-bold">{formatCurrency(totals.finalHelperCost + totals.finalDeliveryFee)}</span>
                        </div>
                        
                        <hr className="border-gray-100 my-1" />
                        
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 my-2 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center text-sm font-bold text-slate-600 uppercase tracking-wide">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></span> Custo Real
                                </span>
                                <strong className="text-red-600 text-lg">{formatCurrency(totals.totalProjectCost)}</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center text-sm font-bold text-slate-600 uppercase tracking-wide">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span> Lucro Limpo
                                </span>
                                <strong className="text-emerald-600 text-lg">{formatCurrency(totals.estimatedProfit)}</strong>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center bg-blue-50 p-5 rounded-2xl border border-blue-100 mt-2">
                            <span className="text-blue-800 font-bold uppercase tracking-wider text-xs mb-1">Valor Final a Cobrar</span>
                            <span className="text-4xl font-black text-blue-700">{formatCurrency(totals.finalValue)}</span>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">Fechar negócio por (Opcional)</label>
                        <input 
                            type="tel" 
                            className="w-full h-14 px-5 text-lg font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-2xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none" 
                            value={finalBudgetPrice} 
                            onChange={e => setFinalBudgetPrice(maskCurrency(e.target.value))} 
                            placeholder="R$ 0,00" 
                        />
                        <p className="text-xs text-gray-400 text-center mt-1">Digite um valor para arredondar ou dar desconto.</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 mt-4 mb-10">
                    <button onClick={handleSave} className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] text-lg">
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