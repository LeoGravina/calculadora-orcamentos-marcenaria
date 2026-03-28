import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from '../icons';
import { formatCurrency } from '../../utils/helpers';
import { maskMeasure, unmaskNumber } from '../../utils/masks';
import Modal from '../Modal';

// === TYPESCRIPT INTERFACES ===
interface Sheet {
    id: string;
    name: string;
    [key: string]: any;
}

interface Piece {
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

interface PieceManagerProps {
    pieces: Piece[];
    setPieces: React.Dispatch<React.SetStateAction<Piece[]>>;
    sheets: Sheet[];
    pieceForm: Piece;
    setPieceForm: React.Dispatch<React.SetStateAction<Piece>>;
    initialPieceForm: Piece;
    onEdit: (piece: Piece) => void;
    onDelete: (id: string) => void;
}

const PieceManager: React.FC<PieceManagerProps> = ({ 
    pieces, setPieces, sheets, pieceForm, setPieceForm, initialPieceForm, onEdit, onDelete 
}) => {
    const formRef = useRef<HTMLDivElement>(null);
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, piece: Piece | null }>({ isOpen: false, piece: null });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let val: string | number = value;
        
        if (name === 'length' || name === 'width') val = maskMeasure(value, 'mm');
        if (name === 'qty') val = maskMeasure(value, 'un');
        
        setPieceForm(p => ({ ...p, [name]: val }));
    };

    const toggleEdge = (edge: 'bandL1' | 'bandL2' | 'bandW1' | 'bandW2') => {
        setPieceForm(prev => ({ ...prev, [edge]: !prev[edge] }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pieceForm.sheetId) {
            toast.error("Selecione uma chapa primeiro!");
            return;
        }
        
        const finalPiece: Piece = {
            ...pieceForm,
            length: unmaskNumber(pieceForm.length),
            width: unmaskNumber(pieceForm.width),
            qty: unmaskNumber(pieceForm.qty),
            id: pieceForm.id || crypto.randomUUID()
        };

        if (pieceForm.id) {
            setPieces(prev => prev.map(p => p.id === pieceForm.id ? finalPiece : p));
            toast.success('Peça atualizada!');
        } else {
            setPieces(prev => [...prev, finalPiece]);
            toast.success('Peça adicionada!');
        }
        
        // Reseta o form mantendo a chapa para agilizar a próxima digitação
        setPieceForm({ ...initialPieceForm, sheetId: pieceForm.sheetId });
    };

    const handleModalEdit = () => {
        if (!actionModal.piece) return;
        let p = { ...actionModal.piece };
        p.length = maskMeasure(p.length, 'mm');
        p.width = maskMeasure(p.width, 'mm');
        p.qty = maskMeasure(p.qty, 'un');
        
        onEdit(p);
        // Scroll suave com uma leve margem para não colar no topo
        if (formRef.current) {
            const y = formRef.current.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
        setActionModal({ isOpen: false, piece: null });
    };

    const handleModalDelete = () => {
        if (actionModal.piece && actionModal.piece.id) {
            onDelete(actionModal.piece.id);
            toast.success('Peça removida!');
        }
        setActionModal({ isOpen: false, piece: null });
    };

    return (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mt-6" ref={formRef}>
            <h2 className="text-xl font-extrabold text-gray-800 border-b-2 border-gray-50 pb-3 mb-5">2. Peças e Cortes</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                
                {/* Seleção de Chapa */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Chapa de Destino</label>
                    <select 
                        name="sheetId" 
                        value={pieceForm.sheetId} 
                        onChange={handleChange} 
                        required 
                        className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-gray-700 w-full"
                    >
                        <option value="">-- Selecione a Chapa --</option>
                        {sheets.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                </div>

                {/* Nome da Peça */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome / Identificação</label>
                    <input 
                        type="text" 
                        name="name" 
                        value={pieceForm.name} 
                        onChange={handleChange} 
                        placeholder="Ex: Lateral Esquerda, Base..." 
                        required 
                        className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full" 
                    />
                </div>

                {/* Grid de Medidas (Ajustado para o polegar) */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Comp. (mm)</label>
                        <input type="tel" name="length" value={pieceForm.length} onChange={handleChange} required placeholder="0 mm" className="h-14 px-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-center font-bold text-lg" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Larg. (mm)</label>
                        <input type="tel" name="width" value={pieceForm.width} onChange={handleChange} required placeholder="0 mm" className="h-14 px-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none text-center font-bold text-lg" />
                    </div>
                    {/* A quantidade ocupa a linha toda no mobile para facilitar a finalização */}
                    <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Quantidade</label>
                        <input type="tel" name="qty" value={pieceForm.qty} onChange={handleChange} required placeholder="1 un" className="h-14 px-2 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-bold text-blue-700 text-lg" />
                    </div>
                </div>

                {/* === NOVO SELETOR DE FITA DE BORDA (TAPPABLE ZONES) === */}
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4 mt-2 flex flex-col items-center">
                    <label className="text-sm font-bold text-gray-600 mb-6 text-center">
                        Onde aplicar Fita de Borda?<br/>
                        <span className="text-xs text-gray-400 font-normal">(Toque nas laterais do desenho para marcar)</span>
                    </label>
                    
                    {/* Container do Desenho Visual */}
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 select-none">
                        
                        {/* Centro (A peça de madeira) */}
                        <div className="absolute inset-5 bg-amber-100 border-2 border-amber-300 rounded-lg flex items-center justify-center pointer-events-none shadow-inner">
                            <span className="text-amber-700/50 font-black text-xl rotate-45">MDF</span>
                        </div>

                        {/* Topo (Comprimento 1) */}
                        <div 
                            onClick={() => toggleEdge('bandL1')} 
                            className={`absolute top-0 left-5 right-5 h-6 rounded-t-xl cursor-pointer transition-all flex items-center justify-center ${pieceForm.bandL1 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105 z-10' : 'bg-gray-300 hover:bg-gray-400'}`}
                        >
                            <span className="text-[10px] font-bold text-white uppercase">Comp. 1</span>
                        </div>

                        {/* Base (Comprimento 2) */}
                        <div 
                            onClick={() => toggleEdge('bandL2')} 
                            className={`absolute bottom-0 left-5 right-5 h-6 rounded-b-xl cursor-pointer transition-all flex items-center justify-center ${pieceForm.bandL2 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105 z-10' : 'bg-gray-300 hover:bg-gray-400'}`}
                        >
                            <span className="text-[10px] font-bold text-white uppercase">Comp. 2</span>
                        </div>

                        {/* Esquerda (Largura 1) */}
                        <div 
                            onClick={() => toggleEdge('bandW1')} 
                            className={`absolute left-0 top-5 bottom-5 w-6 rounded-l-xl cursor-pointer transition-all flex items-center justify-center ${pieceForm.bandW1 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105 z-10' : 'bg-gray-300 hover:bg-gray-400'}`}
                        >
                            <span className="text-[10px] font-bold text-white uppercase -rotate-90 whitespace-nowrap">Larg. 1</span>
                        </div>

                        {/* Direita (Largura 2) */}
                        <div 
                            onClick={() => toggleEdge('bandW2')} 
                            className={`absolute right-0 top-5 bottom-5 w-6 rounded-r-xl cursor-pointer transition-all flex items-center justify-center ${pieceForm.bandW2 ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-105 z-10' : 'bg-gray-300 hover:bg-gray-400'}`}
                        >
                            <span className="text-[10px] font-bold text-white uppercase rotate-90 whitespace-nowrap">Larg. 2</span>
                        </div>
                    </div>
                </div>

                {/* Botão Salvar (Gigante para celular) */}
                <button type="submit" className="w-full h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98] text-lg mt-2">
                    {pieceForm.id ? 'Atualizar Peça Salva' : '+ Adicionar à Lista'}
                </button>
            </form>

            {/* === LISTA DE PEÇAS === */}
            <div className="mt-8 border-t-2 border-gray-50 pt-5">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Lista de Peças ({pieces.length})</h3>
                
                {/* Tabela Desktop */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left border-collapse bg-white">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="p-4 border-b border-gray-200">Peça</th>
                                <th className="p-4 border-b border-gray-200">Medidas</th>
                                <th className="p-4 border-b border-gray-200">Fitas</th>
                                <th className="p-4 border-b border-gray-200 text-center">Qtd</th>
                                <th className="p-4 border-b border-gray-200 text-right">Custo Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {pieces.map(p => (
                                <tr key={p.id} onClick={() => setActionModal({ isOpen: true, piece: p })} className="hover:bg-amber-50 cursor-pointer transition-colors group">
                                    <td className="p-4 font-bold text-gray-900 border-l-4 border-transparent group-hover:border-amber-500">{p.name}</td>
                                    <td className="p-4 text-gray-600">{p.length} x {p.width} mm</td>
                                    <td className="p-4 font-medium text-orange-600">{(p.bandL1 || p.bandL2 ? 'C ' : '') + (p.bandW1 || p.bandW2 ? 'L' : '') || '-'}</td>
                                    <td className="p-4 text-center font-bold text-blue-600">{p.qty}</td>
                                    <td className="p-4 font-extrabold text-gray-900 text-right">{formatCurrency(p.totalCost || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Cards Mobile */}
                <div className="flex flex-col gap-3 md:hidden">
                    {pieces.map(p => (
                        <div key={p.id} onClick={() => setActionModal({ isOpen: true, piece: p })} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform border-l-4 border-l-amber-500">
                            <div className="flex justify-between items-start mb-2">
                                <strong className="text-gray-900 font-bold text-lg">{p.name}</strong>
                                <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-2.5 py-1 rounded-full">x{p.qty}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm text-gray-600 font-medium">{p.length} x {p.width} mm</span>
                                <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-lg">
                                    Fita: {(p.bandL1 || p.bandL2 ? 'C ' : '') + (p.bandW1 || p.bandW2 ? 'L' : '') || 'Nenhuma'}
                                </span>
                            </div>
                            <div className="flex justify-between items-end border-t border-gray-100 pt-2 mt-1">
                                <span className="text-xs font-bold text-amber-600 uppercase">Tocar p/ Opções</span>
                                <span className="font-extrabold text-gray-900">{formatCurrency(p.totalCost || 0)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {pieces.length === 0 && (
                    <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-400 font-medium">Nenhuma peça adicionada ainda.</p>
                        <p className="text-xs text-gray-400 mt-1">Preencha o formulário acima para começar.</p>
                    </div>
                )}
            </div>

            {/* === MODAL DE OPÇÕES === */}
            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, piece: null })} title={`Peça: ${actionModal.piece?.name || ''}`} footer={<button onClick={() => setActionModal({ isOpen: false, piece: null })} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors">Fechar</button>}>
                <div className="flex flex-col gap-3 pb-2">
                    <button onClick={handleModalEdit} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-orange-50 border-l-4 border-l-orange-500 text-orange-700 transition-all shadow-sm">
                        <div className="w-6 h-6 mr-3"><EditIcon /></div> Editar Peça
                    </button>
                    <button onClick={handleModalDelete} className="flex items-center p-4 w-full text-left font-bold border border-gray-200 rounded-xl bg-white hover:bg-red-50 border-l-4 border-l-red-500 text-red-700 mt-1 transition-all shadow-sm">
                        <div className="w-6 h-6 mr-3"><TrashIcon /></div> Excluir Peça
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default PieceManager;