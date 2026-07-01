import React, { useRef, useEffect, useState } from 'react';
import { drawSheet, colorForLabel } from '../utils/cuttingPlanRenderer';
import { repackSheetAround } from '../utils/cuttingOptimizer';
import generateCuttingPlanPdf, { buildCuttingPlanDoc, cuttingPlanFileName } from '../utils/cuttingPlanPdf';

interface CuttingPlanProps {
    cuttingPlan: {
        usedSheets: any[];
        legend?: any[];
        summary?: any[];
        totals?: { sheetCount: number; pieceCount: number; edgeBandingMeters: number };
    } | null;
    meta?: { projectName?: string; clientName?: string; clientPhone?: string; budgetId?: string };
}

const CANVAS_H = 460;

const normalizePhone = (raw?: string) => {
    const d = (raw || '').replace(/\D/g, '');
    if (!d) return '';
    return d.length <= 11 ? `55${d}` : d;
};

const CuttingPlanCanvas: React.FC<CuttingPlanProps> = ({ cuttingPlan, meta = {} }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [planState, setPlanState] = useState<any>(cuttingPlan);
    const [current, setCurrent] = useState(0);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });
    const [editMode, setEditMode] = useState(false);
    const [showCutOrder, setShowCutOrder] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const lastPinchDist = useRef<number | null>(null);
    const dragRef = useRef<{ id: string; dx: number; dy: number; ox: number; oy: number } | null>(null);

    // Cópia editável (arrastar peças não muta o plano original)
    useEffect(() => {
        setPlanState(cuttingPlan ? JSON.parse(JSON.stringify(cuttingPlan)) : null);
        setCurrent(0);
        setSelectedId(null);
    }, [cuttingPlan]);

    const sheets = planState?.usedSheets || [];
    const sheet = sheets[current];

    const getTouchDist = (touches: React.TouchList) => Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );
    const clampScale = (s: number) => Math.min(Math.max(0.02, s), 6);

    const screenToSheet = (clientX: number, clientY: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (clientX - rect.left - transform.x) / transform.scale,
            y: (clientY - rect.top - transform.y) / transform.scale,
        };
    };

    const pieceAt = (sx: number, sy: number) => {
        if (!sheet) return null;
        for (let i = sheet.pieces.length - 1; i >= 0; i--) {
            const p = sheet.pieces[i];
            if (sx >= p.x && sx <= p.x + p.placedLength && sy >= p.y && sy <= p.y + p.placedWidth) return p;
        }
        return null;
    };

    // Durante o arraste: a peça segue o dedo livremente (só trava na chapa).
    const movePiece = (id: string, nx: number, ny: number) => {
        setPlanState((prev: any) => {
            if (!prev) return prev;
            const s = prev.usedSheets[current];
            if (!s) return prev;
            const piece = s.pieces.find((p: any) => p.uniqueId === id);
            if (!piece) return prev;
            const x = Math.round(Math.max(0, Math.min(s.width - piece.placedLength, nx)));
            const y = Math.round(Math.max(0, Math.min(s.height - piece.placedWidth, ny)));
            if (x === piece.x && y === piece.y) return prev;
            return {
                ...prev,
                usedSheets: prev.usedSheets.map((sh: any, idx: number) => idx !== current ? sh : {
                    ...sh,
                    pieces: sh.pieces.map((p: any) => p.uniqueId === id ? { ...p, x, y } : p)
                })
            };
        });
    };

    // Ao soltar: fixa a peça no destino e reacomoda as que ocupavam o espaço.
    // Se não houver espaço, volta a peça pro ponto de origem.
    const reflowAround = (id: string, ox: number, oy: number) => {
        setPlanState((prev: any) => {
            if (!prev) return prev;
            const s = prev.usedSheets[current];
            if (!s) return prev;
            const repacked = repackSheetAround(s, id);
            const updated = repacked
                ? { pieces: repacked.pieces, offcuts: repacked.offcuts }
                : { pieces: s.pieces.map((p: any) => p.uniqueId === id ? { ...p, x: ox, y: oy } : p), offcuts: s.offcuts };
            return {
                ...prev,
                usedSheets: prev.usedSheets.map((sh: any, idx: number) => idx !== current ? sh : { ...sh, ...updated })
            };
        });
    };

    // Interação de um ponteiro (mouse ou 1 dedo)
    const beginPointer = (clientX: number, clientY: number) => {
        if (editMode) {
            const { x, y } = screenToSheet(clientX, clientY);
            const p = pieceAt(x, y);
            if (p) {
                dragRef.current = { id: p.uniqueId, dx: x - p.x, dy: y - p.y, ox: p.x, oy: p.y };
                setSelectedId(p.uniqueId);
                return;
            }
        }
        setIsDragging(true);
        setStartPan({ x: clientX - transform.x, y: clientY - transform.y });
    };
    const movePointer = (clientX: number, clientY: number) => {
        if (dragRef.current) {
            const { x, y } = screenToSheet(clientX, clientY);
            movePiece(dragRef.current.id, x - dragRef.current.dx, y - dragRef.current.dy);
        } else if (isDragging) {
            setTransform(prev => ({ ...prev, x: clientX - startPan.x, y: clientY - startPan.y }));
        }
    };
    const endPointer = () => {
        const drag = dragRef.current;
        dragRef.current = null;
        setIsDragging(false);
        if (drag) reflowAround(drag.id, drag.ox, drag.oy);
    };

    // Volta a chapa pro arranjo calculado originalmente (desfaz os arrastes)
    const resetPlan = () => {
        setPlanState(cuttingPlan ? JSON.parse(JSON.stringify(cuttingPlan)) : null);
        setSelectedId(null);
    };

    const fitView = () => {
        if (!sheet || !containerRef.current) return;
        const cw = containerRef.current.clientWidth;
        const fitScale = (cw / sheet.width) * 0.92;
        const drawH = sheet.height * fitScale;
        setTransform({ x: cw * 0.04, y: Math.max(16, (CANVAS_H - drawH) / 2), scale: fitScale });
    };

    useEffect(() => {
        fitView();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current, planState?.usedSheets?.length]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !sheet) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = container.clientWidth;
        canvas.height = CANVAS_H;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);
        drawSheet(ctx, sheet, { showCutOrder, selectedId: editMode ? selectedId : null });
        ctx.restore();
    }, [sheet, transform, showCutOrder, selectedId, editMode]);

    const handleWheel = (e: React.WheelEvent) => {
        setTransform(prev => ({ ...prev, scale: clampScale(prev.scale + (-e.deltaY * 0.0015)) }));
    };

    const shareWhatsApp = async () => {
        const doc = buildCuttingPlanDoc(planState, meta, { showCutOrder });
        if (!doc) return;
        const fileName = cuttingPlanFileName(meta);
        const shareText = `Plano de corte${meta.clientName ? ` - ${meta.clientName}` : ''}`;
        const nav: any = navigator;
        try {
            const blob = doc.output('blob');
            const file = new File([blob], fileName, { type: 'application/pdf' });
            if (nav.canShare && nav.canShare({ files: [file] })) {
                await nav.share({ files: [file], title: 'Plano de Corte', text: shareText });
                return;
            }
        } catch (e) {
            return; // usuário cancelou o compartilhamento
        }
        // Fallback (desktop / navegador sem Web Share de arquivos)
        doc.save(fileName);
        const phone = normalizePhone(meta.clientPhone);
        const txt = encodeURIComponent(`${shareText} — PDF salvo no aparelho, anexe aqui na conversa.`);
        window.open(phone ? `https://wa.me/${phone}?text=${txt}` : `https://wa.me/?text=${txt}`, '_blank');
    };

    if (!sheet) return null;

    const totals = planState?.totals;
    const summary = planState?.summary || [];
    const legend = planState?.legend || [];
    const orderedPieces = [...sheet.pieces].sort((a: any, b: any) => (a.seq || 0) - (b.seq || 0));

    return (
        <div className="flex flex-col gap-4">
            {/* === RESUMO === */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 text-center">
                    <div className="text-2xl font-black text-indigo-700 tabular-nums">{totals?.sheetCount ?? sheets.length}</div>
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Chapas</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                    <div className="text-2xl font-black text-emerald-700 tabular-nums">{totals?.pieceCount ?? 0}</div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">Peças</div>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3 text-center">
                    <div className="text-2xl font-black text-orange-700 tabular-nums">{(totals?.edgeBandingMeters ?? 0).toFixed(1)}<span className="text-sm">m</span></div>
                    <div className="text-[10px] font-bold text-orange-500 uppercase tracking-wide">Fita</div>
                </div>
            </div>

            {/* Aproveitamento por material */}
            <div className="flex flex-col gap-2">
                {summary.map((s: any) => (
                    <div key={s.material} className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-gray-800 text-sm truncate pr-2">{s.material}</span>
                            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">{s.sheetCount} chapa{s.sheetCount > 1 ? 's' : ''} • {s.efficiency}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${Math.min(100, parseFloat(s.efficiency))}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* === MODOS === */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => { setEditMode(m => !m); setSelectedId(null); }}
                    className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border ${editMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >Mover peças {editMode ? 'ON' : 'OFF'}</button>
                <button
                    onClick={() => setShowCutOrder(v => !v)}
                    className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 border ${showCutOrder ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200'}`}
                >Sequência {showCutOrder ? 'ON' : 'OFF'}</button>
            </div>

            {/* === PAGINADOR === */}
            <div className="flex items-center justify-between gap-2">
                <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 font-bold text-gray-700 disabled:opacity-40 active:scale-95 transition-all">←</button>
                <div className="flex flex-col items-center">
                    <span className="font-extrabold text-gray-800 text-sm">Chapa {current + 1} de {sheets.length}</span>
                    <span className="text-xs text-gray-500 font-medium truncate max-w-[180px]">{sheet.materialName} • {sheet.efficiency}%</span>
                </div>
                <button onClick={() => setCurrent(c => Math.min(sheets.length - 1, c + 1))} disabled={current === sheets.length - 1}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 font-bold text-gray-700 disabled:opacity-40 active:scale-95 transition-all">→</button>
            </div>

            {/* === DESENHO === */}
            <div
                ref={containerRef}
                className={`w-full overflow-hidden border rounded-2xl relative bg-gray-50 shadow-inner ${editMode ? 'border-blue-300' : 'border-gray-200'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                style={{ height: CANVAS_H, touchAction: 'none' }}
                onWheel={handleWheel}
                onMouseDown={(e) => beginPointer(e.clientX, e.clientY)}
                onMouseMove={(e) => movePointer(e.clientX, e.clientY)}
                onMouseUp={endPointer}
                onMouseLeave={endPointer}
                onTouchStart={(e) => {
                    if (e.touches.length === 2) { setIsDragging(false); dragRef.current = null; lastPinchDist.current = getTouchDist(e.touches); }
                    else { const t = e.touches[0]; beginPointer(t.clientX, t.clientY); }
                }}
                onTouchMove={(e) => {
                    if (e.touches.length === 2 && lastPinchDist.current != null) {
                        const dist = getTouchDist(e.touches);
                        const factor = dist / lastPinchDist.current;
                        lastPinchDist.current = dist;
                        setTransform(prev => ({ ...prev, scale: clampScale(prev.scale * factor) }));
                    } else { const t = e.touches[0]; movePointer(t.clientX, t.clientY); }
                }}
                onTouchEnd={(e) => { if (e.touches.length < 2) lastPinchDist.current = null; if (e.touches.length === 0) endPointer(); }}
            >
                <div className="absolute top-3 right-3 z-10 flex gap-2">
                    <button onClick={resetPlan} className="bg-white/80 hover:bg-white text-gray-800 px-3 py-2 rounded-lg backdrop-blur-sm text-xs font-bold transition-all shadow-md active:scale-95 border border-gray-200">
                        Restaurar
                    </button>
                    <button onClick={fitView} className="bg-gray-900/70 hover:bg-gray-900 text-white px-3 py-2 rounded-lg backdrop-blur-sm text-xs font-bold transition-all shadow-md active:scale-95">
                        Centralizar
                    </button>
                </div>
                <p className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-gray-500 rounded-lg pointer-events-none border border-gray-100 shadow-sm">
                    {editMode ? 'Toque e arraste uma peça' : 'Pinça p/ zoom • arraste p/ mover'}
                </p>
                <canvas ref={canvasRef} className="block" />
            </div>

            {/* === SEQUÊNCIA DE CORTE (lista de passos) === */}
            {showCutOrder && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">Ordem de corte — Chapa {current + 1}</h3>
                    <div className="flex flex-col gap-1.5">
                        {orderedPieces.map((p: any) => (
                            <div key={p.uniqueId} className="flex items-center gap-2.5 text-sm">
                                <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs shrink-0">{p.seq}</span>
                                <span className="font-bold text-gray-700">#{p.label}</span>
                                <span className="text-gray-500">{Math.round(p.placedLength)}x{Math.round(p.placedWidth)}mm</span>
                                <span className="text-gray-400 text-xs ml-auto">x={Math.round(p.x)} y={Math.round(p.y)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === LEGENDA === */}
            {legend.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Legenda das Peças</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {legend.map((l: any) => (
                            <div key={l.label} className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-3 py-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-gray-800 text-sm shrink-0" style={{ backgroundColor: colorForLabel(l.label) }}>
                                    {l.label}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-gray-800 text-sm truncate">{l.name}</span>
                                    <span className="text-xs text-gray-500">{l.length}x{l.width}mm • {l.qty}un{l.grainLock ? ' • veio↕' : ''}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* === EXPORTAR / COMPARTILHAR === */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => generateCuttingPlanPdf(planState, meta, { showCutOrder })}
                    className="py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                >Salvar PDF</button>
                <button
                    onClick={shareWhatsApp}
                    className="py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                >WhatsApp</button>
            </div>
        </div>
    );
};

export default CuttingPlanCanvas;
