import React, { useState, useMemo, useEffect } from 'react';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
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
// IMPORTANTE: Garantindo que todas as máscaras estão importadas
import { unmaskMoney, unmaskNumber, maskCurrency } from '../utils/masks'; 
import generateBudgetPdf from '../utils/pdfGenerator';
import { qrCodeBase64 } from '../utils/qrCodeImage';
import { cuttingOptimizer } from '../utils/cuttingOptimizer';

const BudgetCalculator = ({ setCurrentPage, budgetToEdit, db, DADOS_DA_EMPRESA, logoDaEmpresa }) => {
    
    // === ESTADOS ===
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    
    // Valores financeiros e taxas
    const [profitMargin, setProfitMargin] = useState(180);
    const [helperCost, setHelperCost] = useState('');
    const [deliveryFee, setDeliveryFee] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [finalBudgetPrice, setFinalBudgetPrice] = useState('');
    
    // Arrays de dados
    const [sheets, setSheets] = useState([]);
    const [pieces, setPieces] = useState([]);
    const [borderTapes, setBorderTapes] = useState([]);
    const [unitItems, setUnitItems] = useState([]);
    const [hardware, setHardware] = useState([]);
    
    // Catálogos
    const [catalogSheets, setCatalogSheets] = useState([]);
    const [catalogEdgeBands, setCatalogEdgeBands] = useState([]);
    const [catalogUnitItems, setCatalogUnitItems] = useState([]);
    const [catalogHardware, setCatalogHardware] = useState([]);

    // Controles de UI/Edição
    const [editingId, setEditingId] = useState(null);
    const [budgetId, setBudgetId] = useState('');
    const [isLoadingPlan, setIsLoadingPlan] = useState(false);
    const [landscapePlan, setLandscapePlan] = useState(null);
    const [portraitPlan, setPortraitPlan] = useState(null);
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const initialPieceForm = useMemo(() => ({
        name: "", length: "", width: "", qty: 1, sheetId: '', 
        bandL1: false, bandL2: false, bandW1: false, bandW2: false, id: null
    }), []);
    const [pieceForm, setPieceForm] = useState(initialPieceForm);

    // === NAVEGAÇÃO ===
    const handleBack = () => {
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
                const all = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));

                setCatalogSheets(all.filter(m => m.type === 'sheet'));
                setCatalogEdgeBands(all.filter(m => m.type === 'edge_band'));
                setCatalogUnitItems(all.filter(m => m.type === 'unitary_item'));
                setCatalogHardware(all.filter(m => m.type === 'hardware_box'));
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
            
            // Aplica máscara visual no valor manual se existir
            setFinalBudgetPrice(budgetToEdit.finalBudgetPrice ? maskCurrency(budgetToEdit.finalBudgetPrice.toFixed(2)) : '');
            
            if (budgetToEdit.sheets && budgetToEdit.sheets.length > 0) {
                setSheets(budgetToEdit.sheets);
            } else {
                setSheets(catalogSheets);
            }

            setPieces(budgetToEdit.pieces || []);
            setHardware(budgetToEdit.hardware || []);
            setUnitItems(budgetToEdit.unitItems || []);
            setBorderTapes(budgetToEdit.borderTapes || []);
        } else {
            const fetchId = async () => {
                try {
                    const snap = await getDoc(doc(db, "counters", "budgets"));
                    setBudgetId(String((snap.data()?.lastId || 0) + 1).padStart(3, '0'));
                } catch (e) { console.error(e); }
            };
            fetchId();
            setSheets(catalogSheets);
        }
    }, [budgetToEdit, catalogSheets, db]);

    // === CÁLCULOS E TOTAIS (CORRIGIDO E BLINDADO) ===
    const totals = useMemo(() => {
        // Função auxiliar para garantir que números formatados (ex: "2,75" ou "2.750,00") sejam lidos corretamente
        // Isso resolve o problema de inputs com vírgula que quebravam o cálculo
        const safeParseFloat = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            // Remove 'R$', espaços e outros caracteres não numéricos, exceto vírgula e ponto
            // Troca vírgula por ponto para o padrão JS
            const strStr = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
            return parseFloat(strStr) || 0;
        };

        // 1. Limpa entradas financeiras globais
        const cleanMargin = unmaskNumber(profitMargin); 
        const cleanHelper = unmaskMoney(helperCost);
        const cleanDelivery = unmaskMoney(deliveryFee);
        const cleanDiscount = unmaskNumber(discountPercentage);
        const cleanFinalPrice = unmaskMoney(finalBudgetPrice); 

        const marginMultiplier = 1 + (cleanMargin || 0) / 100;
        
        // 2. Cálculo das Peças (BLINDADO CONTRA ERRO DE ESCALA)
        const totalPiecesPrice = pieces.reduce((acc, p) => { 
            const s = sheets.find(s => s.id === p.sheetId); 
            if (!s) return acc;

            // --- CORREÇÃO DE UNIDADES ---
            let sLength = safeParseFloat(s.length);
            let sWidth = safeParseFloat(s.width);
            const sPrice = safeParseFloat(s.price);

            // AUTO-CORREÇÃO: Se a chapa tiver medida < 100 (ex: 2.75m), converte para mm (2750mm)
            if (sLength > 0 && sLength < 100) sLength *= 1000;
            if (sWidth > 0 && sWidth < 100) sWidth *= 1000;

            const sArea = sLength * sWidth; // Área em mm²

            if (sArea <= 0) return acc; // Evita divisão por zero

            const ppsmm = sPrice / sArea; // Preço por mm²
            
            // Medidas da peça
            const pLength = safeParseFloat(p.length);
            const pWidth = safeParseFloat(p.width);
            const pQty = safeParseFloat(p.qty);
            const pArea = pLength * pWidth; 
            
            // Preço desta peça
            let price = pArea * ppsmm * pQty * marginMultiplier;
            
            p.totalCost = price; // Salva o custo individual para exibir na tabela
            
            return acc + price; 
        }, 0);

        // Hardware
        const totalHardwarePrice = hardware.reduce((acc, i) => {
            const price = safeParseFloat(i.boxPrice);
            const boxQty = safeParseFloat(i.boxQty) || 1;
            const usedQty = safeParseFloat(i.usedQty);
            
            const cost = (price / boxQty * usedQty * marginMultiplier);
            i.totalCost = cost;
            return acc + cost;
        }, 0);

        // Itens Unitários
        const totalUnitItemsPrice = unitItems.reduce((acc, i) => {
            const unitPrice = safeParseFloat(i.unitPrice);
            const qty = safeParseFloat(i.qty);
            
            const cost = (unitPrice * qty * marginMultiplier);
            i.totalCost = cost;
            return acc + cost;
        }, 0);
        
        // Fitas de Borda
        const totalTapeMm = pieces.reduce((acc, p) => {
            let perim = 0;
            const len = safeParseFloat(p.length);
            const wid = safeParseFloat(p.width);
            const qty = safeParseFloat(p.qty);

            if(p.bandL1) perim += len; if(p.bandL2) perim += len;
            if(p.bandW1) perim += wid; if(p.bandW2) perim += wid;
            return acc + (perim * qty);
        }, 0);
        
        let totalBorderTapePrice = 0;
        if (borderTapes.length > 0) {
            const tape = borderTapes[0];
            const rollPrice = safeParseFloat(tape.rollPrice);
            const rollLength = safeParseFloat(tape.rollLength) || 1;

            tape.usedLength = (totalTapeMm / 1000).toFixed(2);
            // Multiplica o uso (em metros) pelo preço por metro
            totalBorderTapePrice = (parseFloat(tape.usedLength) * (rollPrice / rollLength)) * marginMultiplier;
            tape.totalCost = totalBorderTapePrice;
        }

        // Soma Final
        const subtotalMaterialsPrice = totalPiecesPrice + totalHardwarePrice + totalUnitItemsPrice + totalBorderTapePrice;
        
        // Custo Real (Sem Margem) para a "Visão do Dono"
        const rawMaterialCost = marginMultiplier > 0 ? subtotalMaterialsPrice / marginMultiplier : 0;
        const extrasCost = (cleanHelper||0) + (cleanDelivery||0);
        const totalProjectCost = rawMaterialCost + extrasCost;

        const grandTotal = subtotalMaterialsPrice + extrasCost;
        
        // Se houver valor manual, usa ele. Se não, usa o calculado.
        const valorBase = cleanFinalPrice || grandTotal;
        const finalValue = valorBase - (valorBase * (cleanDiscount/100));
        const estimatedProfit = finalValue - totalProjectCost;

        return { 
            grandTotal, 
            subtotal: subtotalMaterialsPrice, 
            finalValue, 
            finalHelperCost: cleanHelper||0, 
            finalDeliveryFee: cleanDelivery||0,
            totalProjectCost,
            estimatedProfit
        };
    }, [pieces, sheets, profitMargin, helperCost, deliveryFee, finalBudgetPrice, discountPercentage, hardware, unitItems, borderTapes]);

    // === HANDLERS ===
    const handleSave = async () => {
        if (!clientName) return toast.error('Nome do cliente obrigatório.');
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
            setCurrentPage('saved');
        } catch (e) { toast.error('Erro ao salvar.', { id: toastId }); }
    };

    const handlePdf = async () => {
        if (!clientName) return toast.error('Nome obrigatório.');
        try {
            const logo = await getImageBase64(logoDaEmpresa);
            const data = { ...totals, budgetId, clientName, clientPhone, projectName, description, discountPercentage: unmaskNumber(discountPercentage), pieces, hardware, unitItems, borderTapes, createdAt: new Date().toISOString(), finalBudgetPrice: unmaskMoney(finalBudgetPrice) || totals.finalValue, qrCodeImage: qrCodeBase64 };
            generateBudgetPdf(data, DADOS_DA_EMPRESA, logo);
        } catch (e) { toast.error("Erro no PDF."); }
    };

    const handlePlan = () => {
        if (!pieces.length) return toast.error("Sem peças.");
        setIsLoadingPlan(true);
        setTimeout(() => {
            const pArr = pieces.map(p => ({...p, length: parseFloat(p.length), width: parseFloat(p.width), qty: parseInt(p.qty)})).flatMap(p => Array.from({length: p.qty}, (_, i) => ({...p, uniqueId: `${p.id}-${i}`})));
            setLandscapePlan(cuttingOptimizer([...pArr], sheets.map(s=>({...s}))));
            setPortraitPlan(cuttingOptimizer([...pArr], sheets.map(s=>({...s, length: s.width, width: s.length, name: s.name+' (Vert)'}))));
            setIsLoadingPlan(false);
        }, 100);
    };

    return (
        <div>
            <header className="app-header">
                <h1>{editingId ? `Editando Orçamento ${budgetId}` : `Novo Orçamento`}</h1>
                <img src={logoDaEmpresa} alt="Logo" className="app-logo" style={{marginTop: '10px'}} />
                <p>MVMóveis</p>
                <button onClick={handleBack} className="btn btn-secondary btn-small-back" style={{marginTop: '15px'}}>Voltar</button>
            </header>

            <main className="main-content">
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
                    pieces={pieces} setPieces={setPieces}
                    sheets={sheets}
                    pieceForm={pieceForm} setPieceForm={setPieceForm}
                    initialPieceForm={initialPieceForm}
                    onEdit={setPieceForm}
                    onDelete={(id) => setPieces(p => p.filter(i => i.id !== id))}
                />

                <ExtrasManager 
                    borderTapes={borderTapes} setBorderTapes={setBorderTapes} catalogEdgeBands={catalogEdgeBands}
                    unitItems={unitItems} setUnitItems={setUnitItems} catalogUnitItems={catalogUnitItems}
                    hardware={hardware} setHardware={setHardware} catalogHardware={catalogHardware}
                />

                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <h2 className="section-title">Plano de Corte</h2>
                    <button onClick={handlePlan} className="btn btn-secondary" disabled={isLoadingPlan} style={{width: '100%'}}>{isLoadingPlan ? 'Calculando...' : 'Gerar Plano'}</button>
                    {(landscapePlan || portraitPlan) && <div className="cutting-plan-results-container" style={{marginTop: '1rem'}}>{landscapePlan && <CuttingPlanCanvas cuttingPlan={landscapePlan} />}</div>}
                </div>

                <div className="card summary-card" style={{ marginTop: '1.5rem' }}>
                    <h2 className="section-title">Resumo Financeiro</h2>
                    <div className="summary-details">
                        <div className="summary-item"><span>Venda de Materiais:</span><span>{formatCurrency(totals.subtotal)}</span></div>
                        <div className="summary-item"><span>Ajudante + Frete:</span><span>{formatCurrency(totals.finalHelperCost + totals.finalDeliveryFee)}</span></div>
                        <hr className="summary-divider" />
                        
                        {/* VISÃO DO DONO (Custos vs Lucro) */}
                        <div className="profit-breakdown">
                            <div className="breakdown-row cost">
                                <span><span className="dot red"></span> Custo Estimado:</span>
                                <strong>{formatCurrency(totals.totalProjectCost)}</strong>
                            </div>
                            <div className="breakdown-row profit">
                                <span><span className="dot green"></span> Lucro Previsto:</span>
                                <strong>{formatCurrency(totals.estimatedProfit)}</strong>
                            </div>
                        </div>
                        
                        <hr className="summary-divider" />
                        <div className="summary-item grand-total"><span>VALOR FINAL:</span><span>{formatCurrency(totals.finalValue)}</span></div>
                    </div>
                    <div className="form-group" style={{marginTop: '1rem'}}>
                        <label>Valor Manual (Opcional)</label>
                        <input 
                            type="tel" 
                            className="form-input-style final-price-input" 
                            value={finalBudgetPrice} 
                            onChange={e => setFinalBudgetPrice(maskCurrency(e.target.value))} 
                            placeholder="R$ 0,00" 
                        />
                    </div>
                    
                    <div className="budget-bottom-actions">
                        <button onClick={handleBack} className="btn btn-action-cancel">Cancelar Orçamento</button>
                        <button onClick={handlePdf} className="btn btn-action-pdf">Gerar PDF</button>
                        <button onClick={handleSave} className="btn btn-action-save">{editingId ? 'Atualizar Orçamento' : 'Salvar Orçamento'}</button>
                    </div>
                </div>
            </main>
            <Modal isOpen={modalState.isOpen} onClose={() => setModalState({isOpen: false})} onConfirm={modalState.onConfirm} title={modalState.title}><p>{modalState.message}</p></Modal>
        </div>
    );
};

export default BudgetCalculator;