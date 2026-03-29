import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from '../icons';
import { formatCurrency } from '../../utils/helpers';
import { maskMeasure, unmaskNumber } from '../../utils/masks';
import Modal from '../Modal';

// === TYPESCRIPT ===
interface Sheet { id: string; name: string; [key: string]: any; }
interface Piece { id: string | null; name: string; length: string | number; width: string | number; qty: string | number; sheetId: string; bandL1: boolean; bandL2: boolean; bandW1: boolean; bandW2: boolean; totalCost?: number; }

interface PieceManagerProps {
    pieces: Piece[]; setPieces: React.Dispatch<React.SetStateAction<Piece[]>>;
    sheets: Sheet[]; pieceForm: Piece; setPieceForm: React.Dispatch<React.SetStateAction<Piece>>;
    initialPieceForm: Piece; onEdit: (piece: any) => void; onDelete: (id: string) => void;
}

const PieceManager: React.FC<PieceManagerProps> = ({ pieces, setPieces, sheets, pieceForm, setPieceForm, initialPieceForm, onEdit, onDelete }) => {
    const formRef = useRef<HTMLDivElement>(null);
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, piece: Piece | null }>({ isOpen: false, piece: null });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let val: string | number = value;
        if (name === 'length' || name === 'width' || name === 'qty') val = maskMeasure(value);
        setPieceForm(p => ({ ...p, [name]: val }));
    };

    const toggleEdge = (edge: 'bandL1' | 'bandL2' | 'bandW1' | 'bandW2') => { setPieceForm(prev => ({ ...prev, [edge]: !prev[edge] })); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pieceForm.sheetId) return toast.error("Selecione a chapa!");
        const finalPiece: Piece = { ...pieceForm, length: unmaskNumber(pieceForm.length), width: unmaskNumber(pieceForm.width), qty: unmaskNumber(pieceForm.qty), id: pieceForm.id || crypto.randomUUID() };
        if (pieceForm.id) setPieces(prev => prev.map(p => p.id === pieceForm.id ? finalPiece : p));
        else setPieces(prev => [...prev, finalPiece]);
        setPieceForm({ ...initialPieceForm, sheetId: pieceForm.sheetId });
    };

    const handleModalEdit = () => {
        if (!actionModal.piece) return;
        let p = { ...actionModal.piece };
        p.length = maskMeasure(p.length); p.width = maskMeasure(p.width); p.qty = maskMeasure(p.qty);
        onEdit(p);
        if (formRef.current) { const y = formRef.current.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top: y, behavior: 'smooth' }); }
        setActionModal({ isOpen: false, piece: null });
    };

    const handleModalDelete = () => { if (actionModal.piece && actionModal.piece.id) { onDelete(actionModal.piece.id); } setActionModal({ isOpen: false, piece: null }); };

    return (
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 mt-6" ref={formRef}>
            <h2 className="text-xl font-extrabold text-gray-800 border-b-2 border-gray-50 pb-3 mb-5 tracking-tight">2. Peças do Projeto (mm)</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                
                {/* Seleção de Chapa (DROPDOWN ESTILIZADO TOP) */}
                <div className="flex flex-col gap-1 w-full relative">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widePr-10">Chapa Destino</label>
                    <div className="relative w-full">
                        <select 
                            name="sheetId" value={pieceForm.sheetId} onChange={handleChange} required 
                            className="h-14 w-full px-4 Pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-gray-700 appearance-none cursor-pointer"
                        >
                            <option value="">-- Selecione do Catálogo --</option>
                            {sheets.map(s => (<option key={s.id} value={s.id}>{s.name} ({s.length}x{s.width}mm)</option>))}
                        </select>
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome / Identificação</label>
                    <input type="text" name="name" value={pieceForm.name} onChange={handleChange} placeholder="Lateral Esquerda, Base..." required className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium" />
                </div>

                {/* Grid de Medidas com SUFFIX OVERLAY */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                    <div className="flex flex-col gap-1 w-full relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center Pr-16">Comp. (mm)</label>
                        <div className="relative w-full">
                            <input type="tel" name="length" value={pieceForm.length} onChange={handleChange} required placeholder="0" className="h-14 w-full px-4 Pr-16 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-center font-bold text-lg" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">mm</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 w-full relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center Pr-16">Larg. (mm)</label>
                        <div className="relative w-full">
                            <input type="tel" name="width" value={pieceForm.width} onChange={handleChange} required placeholder="0" className="h-14 w-full px-4 Pr-16 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-center font-bold text-lg" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">mm</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 w-full col-span-2 md:col-span-1 relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center Pr-14">Quantidade</label>
                        <div className="relative w-full">
                            <input type="tel" name="qty" value={pieceForm.qty} onChange={handleChange} required placeholder="1" className="h-14 w-full px-4 Pr-14 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold text-blue-700 text-lg" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-blue-400 select-none pointer-events-none">un</span>
                        </div>
                    </div>
                </div>
                {/* (Seletor de fitas e lista de peças permanecem iguais visualmente pois já usavam boxes fixos) */}
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 mt-2 flex flex-col items-center"> <label className="text-sm font-bold text-gray-600 mb-6 text-center">Marcar onde aplicar Fita de Borda<br/><span className="text-xs text-gray-400 font-normal">(Toque nas laterais do desenho)</span></label> <div className="relative w-48 h-48 sm:w-56 sm:h-56 select-none"> <div className="absolute inset-5 bg-amber-100 border-2 border-amber-300 rounded-lg flex items-center justify-center pointer-events-none shadow-inner"><span className="text-amber-700/50 font-black text-xl rotate-45">MDF</span></div> <div onClick={() => toggleEdge('bandL1')} className={`absolute top-0 left-5 right-5 h-6 rounded-t-xl cursor-pointer transition-all flex items-center justify-center ${pieceForm.bandL1 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105 z-10' : 'bg-gray-300 hover:bg-gray-400'}`}><span className="text-[10px] font-bold text-white uppercase">C1</span></div> <div onClick={() => toggleEdge('bandL2')} className={`absolute bottom-0 left-5 right-5 h-6 rounded-b-xl cursor-pointer transition-all flex items-center justify-center ${pieceForm.bandL2 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105 z-10' : 'bg-gray-300 hover:bg-gray-400'}`}><span className="text-[10px] font-bold text-white uppercase">C2</span></div> <div onClick={() => toggleEdge('bandW1')} className={`absolute left-0 top-5 bottom-5 w-6 rounded-l-xl cursor-pointer transition-all flex items-center justify-center ${pieceForm.bandW1 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105 z-10' : 'bg-gray-300 hover:bg-gray-400'}`}><span className="text-[10px] font-bold text-white uppercase -rotate-90">L1</span></div> <div onClick={() => toggleEdge('bandW2')} className={`absolute right-0 top-5 bottom-5 w-6 rounded-r-xl cursor-pointer transition-all flex items-center justify-center ${pieceForm.bandW2 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105 z-10' : 'bg-gray-300 hover:bg-gray-400'}`}><span className="text-[10px] font-bold text-white uppercase rotate-90">L2</span></div> </div> </div>
                <button type="submit" className="w-full h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] text-lg mt-2"> {pieceForm.id ? 'Atualizar Peça Salva' : '+ Adicionar Peça'} </button>
            </form>

            <div className="mt-8 border-t-2 border-gray-50 pt-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4 tracking-tight">Lista de Peças ({pieces.length})</h3>
                <div className="flex flex-col gap-3 md:hidden">
                    {pieces.map(p => (
                        <div key={p.id} onClick={() => setActionModal({ isOpen: true, piece: p })} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform border-l-4 border-l-amber-500 flex justify-between items-center cursor-pointer">
                            <div className="flex flex-col">
                                <strong className="text-gray-900 font-bold text-lg leading-tight">{p.name}</strong>
                                <span className="text-sm text-gray-600 font-medium mt-1">{p.length} x {p.width} mm</span>
                                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-1 rounded-md w-fit mt-1.5">x{p.qty} un</span>
                            </div>
                            <div className="font-extrabold text-gray-950 text-right">{formatCurrency(p.totalCost || 0)}</div>
                        </div>
                    ))}
                </div>
                {pieces.length === 0 && ( <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300"> <p className="text-gray-400 font-medium">Nenhuma peça adicionada ainda.</p> </div> )}
            </div>

            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, piece: null })} title={`Opções: ${actionModal.piece?.name || ''}`} footer={<button onClick={() => setActionModal({ isOpen: false, piece: null })} className="w-full py-3 bg-gray-100 font-bold rounded-xl transition-colors">Fechar</button>}>
                <div className="flex flex-col gap-3 pb-2"><button onClick={handleModalEdit} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-orange-50 border-l-4 border-l-orange-500 text-orange-700 transition-all shadow-sm"><div className="w-6 h-6 mr-3"><EditIcon /></div> Editar Peça</button><button onClick={handleModalDelete} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-red-50 border-l-4 border-l-red-500 text-red-700 mt-1 transition-all shadow-sm"><div className="w-6 h-6 mr-3"><TrashIcon /></div> Excluir Peça</button></div>
            </Modal>
        </div>
    );
};

export default PieceManager;