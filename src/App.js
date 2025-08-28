import React, { useState, useMemo, useEffect } from 'react';
import minhalogo from './minhalogo.png';

// Componente principal da aplicação
export default function App() {
    // --- ESTADO DA APLICAÇÃO ---
    
    // Detalhes Gerais
    const [clientName, setClientName] = useState('');
    const [projectName, setProjectName] = useState('');
    const [sheetPrice, setSheetPrice] = useState('');
    const [sheetLength, setSheetLength] = useState(2750);
    const [sheetWidth, setSheetWidth] = useState(1850);
    const [profitMargin, setProfitMargin] = useState(180); // Lucro manual, padrão 180%
    const [deliveryFee, setDeliveryFee] = useState(''); // Frete

    // Listas de Itens
    const [pieces, setPieces] = useState([]);
    const [hardware, setHardware] = useState([]);
    const [borderTapes, setBorderTapes] = useState([]);
    
    // Estados dos Formulários
    const [pieceForm, setPieceForm] = useState({ id: null, name: '', length: '', width: '', qty: 1 });
    const [hardwareForm, setHardwareForm] = useState({ id: null, name: '', boxQty: '', boxPrice: '', usedQty: '' });
    const [borderTapeForm, setBorderTapeForm] = useState({ id: null, name: '', rollPrice: '', rollLength: '', usedLength: '' });

    // Controle do Modal e Notificações
    const [notification, setNotification] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Efeito para limpar a notificação após 3 segundos
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Efeito para gerenciar o título do documento para impressão
    useEffect(() => {
        const originalTitle = "Calculadora de Orçamento";
        if (isModalOpen) {
            document.title = `Orçamento-${clientName || 'Novo Cliente'}`;
        }
        // Função de limpeza que restaura o título original quando o modal fecha
        return () => {
            document.title = originalTitle;
        };
    }, [isModalOpen, clientName]);


    // --- FUNÇÕES DE FORMATAÇÃO E CÁLCULO ---

    const formatCurrency = (value) => {
        if (isNaN(value)) return 'R$ 0,00';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const totals = useMemo(() => {
        const margin = 1 + (parseFloat(profitMargin) || 0) / 100;

        // CÁLCULO DAS PEÇAS
        const sheetArea = (sheetLength || 1) * (sheetWidth || 1);
        const pricePerSqMm = sheetArea > 0 ? (sheetPrice || 0) / sheetArea : 0;
        
        let rawPiecesCost = 0;
        const totalPiecesCost = pieces.reduce((acc, piece) => {
            const pieceArea = (piece.length || 0) * (piece.width || 0);
            const rawCost = pieceArea * pricePerSqMm * (piece.qty || 0);
            rawPiecesCost += rawCost;
            const finalCost = rawCost * margin;
            piece.totalCost = finalCost;
            piece.rawCost = rawCost; // Guarda o custo bruto para o modal
            return acc + finalCost;
        }, 0);

        // CÁLCULO DAS FERRAGENS
        let rawHardwareCost = 0;
        const totalHardwareCost = hardware.reduce((acc, item) => {
            const boxQty = parseFloat(item.boxQty) || 1;
            const boxPrice = parseFloat(item.boxPrice) || 0;
            const usedQty = parseFloat(item.usedQty) || 0;
            
            const unitPrice = boxPrice / boxQty;
            const rawCost = unitPrice * usedQty;
            rawHardwareCost += rawCost;
            const finalCost = rawCost * margin;

            item.unitPrice = unitPrice;
            item.totalCost = finalCost;
            item.rawCost = rawCost; // Guarda o custo bruto para o modal
            return acc + finalCost;
        }, 0);
        
        // CÁLCULO DA FITA DE BORDA (sem margem de lucro)
        const totalBorderTapeCost = borderTapes.reduce((acc, tape) => {
            const pricePerMeter = (tape.rollLength || 1) > 0 ? (tape.rollPrice || 0) / (tape.rollLength || 1) : 0;
            const cost = (tape.usedLength || 0) * pricePerMeter;
            tape.totalCost = cost;
            tape.pricePerMeter = pricePerMeter;
            return acc + cost;
        }, 0);

        const subtotal = totalPiecesCost + totalHardwareCost + totalBorderTapeCost;
        const finalDeliveryFee = parseFloat(deliveryFee) || 0;
        const grandTotal = subtotal + finalDeliveryFee;

        return { 
            totalPiecesCost, 
            totalHardwareCost, 
            totalBorderTapeCost, 
            grandTotal,
            rawPiecesCost,
            rawHardwareCost,
            subtotal,
            finalDeliveryFee
        };
    }, [pieces, hardware, borderTapes, sheetPrice, sheetLength, sheetWidth, profitMargin, deliveryFee]);

    // --- MANIPULADORES DE EVENTOS (HANDLERS) ---
    const handlePieceFormChange = (e) => setPieceForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleHardwareFormChange = (e) => setHardwareForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleBorderTapeFormChange = (e) => setBorderTapeForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePieceSubmit = (e) => {
        e.preventDefault();
        if (pieceForm.id) {
            setPieces(pieces.map(p => p.id === pieceForm.id ? { ...pieceForm, id: p.id } : p));
        } else {
            setPieces([...pieces, { ...pieceForm, id: crypto.randomUUID() }]);
        }
        setPieceForm({ id: null, name: '', length: '', width: '', qty: 1 });
    };

    const handleHardwareSubmit = (e) => {
        e.preventDefault();
        if (hardwareForm.id) {
            setHardware(hardware.map(h => h.id === hardwareForm.id ? { ...hardwareForm, id: h.id } : h));
        } else {
            setHardware([...hardware, { ...hardwareForm, id: crypto.randomUUID() }]);
        }
        setHardwareForm({ id: null, name: '', boxQty: '', boxPrice: '', usedQty: '' });
    };

    const handleBorderTapeSubmit = (e) => {
        e.preventDefault();
        if (borderTapeForm.id) {
            setBorderTapes(borderTapes.map(t => t.id === borderTapeForm.id ? { ...borderTapeForm, id: t.id } : t));
        } else {
            setBorderTapes([...borderTapes, { ...borderTapeForm, id: crypto.randomUUID() }]);
        }
        setBorderTapeForm({ id: null, name: '', rollPrice: '', rollLength: '', usedLength: '' });
    };

    const editPiece = (piece) => setPieceForm(piece);
    const deletePiece = (id) => setPieces(pieces.filter(p => p.id !== id));
    const editHardware = (item) => setHardwareForm(item);
    const deleteHardware = (id) => setHardware(hardware.filter(h => h.id !== id));
    const editBorderTape = (tape) => setBorderTapeForm(tape);
    const deleteBorderTape = (id) => setBorderTapes(borderTapes.filter(t => t.id !== id));
    
    // --- FUNÇÕES DE SALVAR, CARREGAR E MODAL ---
    const handleSave = () => {
        const budgetData = {
            clientName, projectName, sheetPrice, sheetLength, sheetWidth, profitMargin, deliveryFee, pieces, hardware, borderTapes,
        };
        localStorage.setItem('marcenariaOrcamento', JSON.stringify(budgetData));
        setNotification('Orçamento salvo com sucesso!');
    };

    const handleLoad = () => {
        const savedData = localStorage.getItem('marcenariaOrcamento');
        if (savedData) {
            const budgetData = JSON.parse(savedData);
            setClientName(budgetData.clientName || '');
            setProjectName(budgetData.projectName || '');
            setSheetPrice(budgetData.sheetPrice || '');
            setSheetLength(budgetData.sheetLength || 2750);
            setSheetWidth(budgetData.sheetWidth || 1850);
            setProfitMargin(budgetData.profitMargin || 180);
            setDeliveryFee(budgetData.deliveryFee || '');
            setPieces(budgetData.pieces || []);
            setHardware(budgetData.hardware || []);
            setBorderTapes(budgetData.borderTapes || []);
            setNotification('Orçamento carregado com sucesso!');
        } else {
            setNotification('Nenhum orçamento salvo encontrado.');
        }
    };
    
    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);


    // CSS embutido dentro de uma tag <style>
    const styles = `
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background-color: #f3f4f6;
            color: #1f2937;
        }
        
        .app-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .app-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .app-logo {
            height: 120px;
            width: 120px;
            border-radius: 50%;
            object-fit: cover;
            margin-bottom: 1rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 3px solid white;
        }
        
        .app-header h1 {
            font-size: 2.25rem;
            font-weight: bold;
            color: #111827;
        }
        
        .app-header p {
            color: #4b5563;
            margin-top: 0.5rem;
        }
        
        .main-content {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        
        .card {
            background-color: white;
            padding: 1.5rem;
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .subsection-title {
            font-size: 1.125rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
            color: #374151;
        }
        
        .grid-2-cols {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 1.5rem;
        }
        
        @media (min-width: 768px) {
            .grid-2-cols {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        
        .form-grid-inputs-4, .form-grid-inputs-5 {
            display: grid;
            grid-template-columns: repeat(1, 1fr);
            gap: 1rem;
            align-items: flex-end;
        }
        
        @media (min-width: 640px) {
            .form-grid-inputs-4 { grid-template-columns: repeat(2, 1fr); }
            .form-grid-inputs-5 { grid-template-columns: repeat(2, 1fr); }
        }
        
        @media (min-width: 768px) {
            .form-grid-inputs-4 { grid-template-columns: repeat(4, 1fr); }
            .form-grid-inputs-5 { grid-template-columns: repeat(4, 1fr); }
        }

        @media (min-width: 900px) {
            .form-grid-inputs-5 { grid-template-columns: repeat(4, 1fr); }
        }
        
        .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .form-group label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #4b5563;
        }
        
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            background-color: #f9fafb;
            box-sizing: border-box;
        }
        
        .form-group input:focus {
            outline: 2px solid transparent;
            outline-offset: 2px;
            border-color: #4f46e5;
            box-shadow: 0 0 0 2px #c7d2fe;
        }
        
        .btn {
            padding: 0.75rem 1rem;
            font-weight: 600;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: background-color 0.2s ease-in-out;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .form-submit-button {
            width: auto;
            min-width: 150px;
            margin-top: 1.5rem;
        }
        
        .btn-add { background-color: #4f46e5; }
        .btn-add:hover { background-color: #4338ca; }
        
        .btn-secondary { background-color: #2563eb; }
        .btn-secondary:hover { background-color: #1d4ed8; }
        
        .btn-tertiary { background-color: #0d9488; }
        .btn-tertiary:hover { background-color: #0f766e; }
        
        .btn-save { background-color: #16a34a; }
        .btn-save:hover { background-color: #15803d; }
        
        .btn-print-open { background-color: #d97706; margin-top: 1.5rem; width: 100%; }
        .btn-print-open:hover { background-color: #b45309; }
        
        .btn-edit, .btn-delete {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.25rem;
            font-weight: 500;
        }
        .btn-edit { color: #4f46e5; }
        .btn-edit:hover { text-decoration: underline; }
        .btn-delete { color: #dc2626; }
        .btn-delete:hover { text-decoration: underline; }
        
        .table-container {
            margin-top: 1.5rem;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
        }
        
        thead {
            background-color: #f9fafb;
        }
        
        th {
            font-size: 0.75rem;
            font-weight: 500;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        tbody tr:hover {
            background-color: #f9fafb;
        }
        
        .empty-table {
            text-align: center;
            padding: 1rem;
            color: #6b7280;
        }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
        }
        
        .summary-card { }
        
        .summary-details {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            font-size: 1.125rem;
        }
        
        .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .summary-item span:first-child {
            color: #374151;
        }
        
        .summary-item span:last-child {
            font-weight: 600;
            color: #111827;
        }
        
        .summary-divider {
            margin: 0.5rem 0;
            border: 0;
            border-top: 2px dashed #d1d5db;
        }
        
        .grand-total {
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .grand-total span:last-child {
            color: #4f46e5;
        }
        .storage-buttons {
            display: flex;
            gap: 1rem;
        }
        .notification {
            text-align: center;
            padding: 0.75rem;
            margin-top: 1rem;
            border-radius: 0.5rem;
            background-color: #d1fae5;
            color: #065f46;
            font-weight: 500;
        }

        /* Estilos do Modal */
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal-content {
            background-color: white;
            padding: 2rem;
            border-radius: 1rem;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start; /* Alinhado ao topo para a logo não esticar */
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 1rem;
            margin-bottom: 1rem;
            gap: 1rem;
        }
        .modal-header-text h2 {
            margin: 0;
            font-size: 1.5rem;
        }
        .modal-header-text p {
            margin: 0;
        }
        .modal-logo {
            height: 60px;
            width: 60px;
            border-radius: 50%;
            object-fit: cover;
        }
        .modal-body p {
            margin: 0.5rem 0;
        }
        .modal-body strong {
            color: #111827;
        }
        .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 2rem;
        }
        .modal-footer .btn-close {
            background-color: #6b7280;
        }
        .modal-footer .btn-print {
            background-color: #16a34a;
        }
        .modal-table {
            width: 100%;
            margin-top: 1.5rem;
            border-collapse: collapse;
        }
        .modal-table th, .modal-table td {
            padding: 0.5rem;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
        }
        .modal-table th {
            background-color: #f9fafb;
        }

        @media print {
            body * {
                visibility: hidden;
            }
            .modal-print-area, .modal-print-area * {
                visibility: visible;
            }
            .modal-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            .modal-footer {
                display: none;
            }
        }
    `;

    return (
        <div className="app-container">
            <style>{styles}</style>
            <header className="app-header">
                <img src={minhalogo} alt="Logo da Marcenaria" className="app-logo" />
                <h1>Calculadora de Orçamento</h1>
                <p>Marcenaria Simplificada</p>
            </header>

            <main className="main-content">
                {/* Seção 1: Detalhes Gerais */}
                <div className="card">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
                        <h2 className="section-title" style={{border: 'none', margin: 0}}>1. Detalhes Gerais</h2>
                        <div className="storage-buttons">
                            <button onClick={handleSave} className="btn btn-save">Salvar</button>
                            <button onClick={handleLoad} className="btn btn-secondary">Carregar</button>
                        </div>
                    </div>
                    {notification && <div className="notification">{notification}</div>}
                    <hr style={{margin: '1rem 0'}} />
                    <div className="grid-2-cols">
                        <div>
                            <h3 className="subsection-title">Projeto</h3>
                            <div className="form-group">
                                <label htmlFor="clientName">Nome do Cliente</label>
                                <input type="text" id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="projectName">Nome do Móvel</label>
                                <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <h3 className="subsection-title">Matéria-Prima (Chapa)</h3>
                            <div className="form-group">
                                <label htmlFor="sheetPrice">Preço da Chapa (R$)</label>
                                <input type="number" id="sheetPrice" value={sheetPrice} onChange={(e) => setSheetPrice(e.target.value)} placeholder="Ex: 350.00" />
                            </div>
                            <div className="grid-2-cols">
                                <div className="form-group">
                                    <label htmlFor="sheetLength">Comp. (mm)</label>
                                    <input type="number" id="sheetLength" value={sheetLength} onChange={(e) => setSheetLength(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="sheetWidth">Larg. (mm)</label>
                                    <input type="number" id="sheetWidth" value={sheetWidth} onChange={(e) => setSheetWidth(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="form-group" style={{marginTop: '1rem'}}>
                        <label htmlFor="profitMargin">Lucro sobre Peças e Ferragens (%)</label>
                        <input type="number" id="profitMargin" value={profitMargin} onChange={(e) => setProfitMargin(e.target.value)} />
                    </div>
                </div>

                {/* Seção 2: Peças de Madeira */}
                <div className="card">
                    <h2 className="section-title">2. Peças de Madeira</h2>
                    <form onSubmit={handlePieceSubmit}>
                        <div className="form-grid-inputs-5">
                            <div className="form-group">
                                <label>Peça</label>
                                <input type="text" name="name" value={pieceForm.name} onChange={handlePieceFormChange} placeholder="Ex: Porta" required />
                            </div>
                            <div className="form-group">
                                <label>Comp. (mm)</label>
                                <input type="number" name="length" value={pieceForm.length} onChange={handlePieceFormChange} placeholder="Ex: 650" required />
                            </div>
                            <div className="form-group">
                                <label>Larg. (mm)</label>
                                <input type="number" name="width" value={pieceForm.width} onChange={handlePieceFormChange} placeholder="Ex: 90" required />
                            </div>
                            <div className="form-group">
                                <label>Qtd.</label>
                                <input type="number" name="qty" value={pieceForm.qty} onChange={handlePieceFormChange} required />
                            </div>
                        </div>
                        <button type="submit" className={`btn form-submit-button ${pieceForm.id ? 'btn-save' : 'btn-add'}`}>
                            {pieceForm.id ? 'Salvar' : 'Adicionar'}
                        </button>
                    </form>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Peça</th>
                                    <th>Medidas</th>
                                    <th>Qtd</th>
                                    <th className="text-right">Valor Final</th>
                                    <th className="text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pieces.length === 0 ? (
                                    <tr><td colSpan="5" className="empty-table">Nenhuma peça adicionada.</td></tr>
                                ) : (
                                    pieces.map(piece => (
                                        <tr key={piece.id}>
                                            <td>{piece.name}</td>
                                            <td>{piece.length}mm x {piece.width}mm</td>
                                            <td>{piece.qty}</td>
                                            <td className="text-right">{formatCurrency(piece.totalCost)}</td>
                                            <td className="actions">
                                                <button onClick={() => editPiece(piece)} className="btn-edit">Editar</button>
                                                <button onClick={() => deletePiece(piece.id)} className="btn-delete">Excluir</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Seção 3: Ferragens */}
                <div className="card">
                    <h2 className="section-title">3. Ferragens e Acessórios</h2>
                    <form onSubmit={handleHardwareSubmit}>
                        <div className="form-grid-inputs-4">
                            <div className="form-group">
                                <label>Item</label>
                                <input type="text" name="name" value={hardwareForm.name} onChange={handleHardwareFormChange} placeholder="Ex: Parafuso" required />
                            </div>
                            <div className="form-group">
                                <label>Qtd na Caixa</label>
                                <input type="number" name="boxQty" value={hardwareForm.boxQty} onChange={handleHardwareFormChange} placeholder="Ex: 500" required />
                            </div>
                            <div className="form-group">
                                <label>Preço da Caixa (R$)</label>
                                <input type="number" step="0.01" name="boxPrice" value={hardwareForm.boxPrice} onChange={handleHardwareFormChange} placeholder="Ex: 50.00" required />
                            </div>
                            <div className="form-group">
                                <label>Qtd. Usada</label>
                                <input type="number" name="usedQty" value={hardwareForm.usedQty} onChange={handleHardwareFormChange} placeholder="Ex: 10" required />
                            </div>
                        </div>
                        <button type="submit" className={`btn form-submit-button ${hardwareForm.id ? 'btn-save' : 'btn-secondary'}`}>
                            {hardwareForm.id ? 'Salvar' : 'Adicionar'}
                        </button>
                    </form>
                     <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qtd Usada</th>
                                    <th>Preço Uni. (calc)</th>
                                    <th className="text-right">Valor Final</th>
                                    <th className="text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hardware.length === 0 ? (
                                    <tr><td colSpan="5" className="empty-table">Nenhuma ferragem adicionada.</td></tr>
                                ) : (
                                    hardware.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.name}</td>
                                            <td>{item.usedQty}</td>
                                            <td>{formatCurrency(item.unitPrice)}</td>
                                            <td className="text-right">{formatCurrency(item.totalCost)}</td>
                                            <td className="actions">
                                                <button onClick={() => editHardware(item)} className="btn-edit">Editar</button>
                                                <button onClick={() => deleteHardware(item.id)} className="btn-delete">Excluir</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Seção 4: Fita de Borda */}
                <div className="card">
                    <h2 className="section-title">4. Fita de Borda</h2>
                    <form onSubmit={handleBorderTapeSubmit}>
                        <div className="form-grid-inputs-5">
                            <div className="form-group">
                                <label>Descrição</label>
                                <input type="text" name="name" value={borderTapeForm.name} onChange={handleBorderTapeFormChange} placeholder="Ex: Fita Branca 22mm" required />
                            </div>
                            <div className="form-group">
                                <label>Preço do Rolo (R$)</label>
                                <input type="number" step="0.01" name="rollPrice" value={borderTapeForm.rollPrice} onChange={handleBorderTapeFormChange} placeholder="Ex: 75.00" required />
                            </div>
                            <div className="form-group">
                                <label>Metros no Rolo</label>
                                <input type="number" step="0.1" name="rollLength" value={borderTapeForm.rollLength} onChange={handleBorderTapeFormChange} placeholder="Ex: 50" required />
                            </div>
                            <div className="form-group">
                                <label>Metros Usados</label>
                                <input type="number" step="0.1" name="usedLength" value={borderTapeForm.usedLength} onChange={handleBorderTapeFormChange} placeholder="Ex: 20" required />
                            </div>
                        </div>
                        <button type="submit" className={`btn form-submit-button ${borderTapeForm.id ? 'btn-save' : 'btn-tertiary'}`}>
                            {borderTapeForm.id ? 'Salvar' : 'Adicionar'}
                        </button>
                    </form>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Preço/m</th>
                                    <th>Metros Usados</th>
                                    <th className="text-right">Valor Final</th>
                                    <th className="text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {borderTapes.length === 0 ? (
                                    <tr><td colSpan="5" className="empty-table">Nenhuma fita de borda adicionada.</td></tr>
                                ) : (
                                    borderTapes.map(tape => (
                                        <tr key={tape.id}>
                                            <td>{tape.name}</td>
                                            <td>{formatCurrency(tape.pricePerMeter)}</td>
                                            <td>{tape.usedLength} m</td>
                                            <td className="text-right">{formatCurrency(tape.totalCost)}</td>
                                            <td className="actions">
                                                <button onClick={() => editBorderTape(tape)} className="btn-edit">Editar</button>
                                                <button onClick={() => deleteBorderTape(tape.id)} className="btn-delete">Excluir</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Seção de Resumo */}
                <div className="card summary-card">
                    <h2 className="section-title">Resumo do Orçamento</h2>
                    <div className="summary-details">
                        <div className="summary-item">
                            <span>Total Peças:</span>
                            <span>{formatCurrency(totals.totalPiecesCost)}</span>
                        </div>
                        <div className="summary-item">
                            <span>Total Ferragens:</span>
                            <span>{formatCurrency(totals.totalHardwareCost)}</span>
                        </div>
                         <div className="summary-item">
                            <span>Total Fita de Borda:</span>
                            <span>{formatCurrency(totals.totalBorderTapeCost)}</span>
                        </div>
                        <div className="form-group" style={{marginTop: '1rem'}}>
                            <label htmlFor="deliveryFee">Frete (R$)</label>
                            <input type="number" step="0.01" id="deliveryFee" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="Ex: 50.00" />
                        </div>
                        <hr className="summary-divider" />
                        <div className="summary-item grand-total">
                            <span>VALOR TOTAL:</span>
                            <span>{formatCurrency(totals.grandTotal)}</span>
                        </div>
                    </div>
                    <button onClick={openModal} className="btn btn-print-open">
                        Gerar Orçamento para Cliente
                    </button>
                </div>
            </main>

            {isModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="modal-print-area">
                            <div className="modal-header">
                                <div className="modal-header-text">
                                    <h2>Orçamento</h2>
                                    <p><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                                </div>
                                <img src={minhalogo} alt="Logo" className="modal-logo" />
                            </div>
                            <div className="modal-body">
                                <p><strong>Cliente:</strong> {clientName || 'Não informado'}</p>
                                <p><strong>Projeto:</strong> {projectName || 'Não informado'}</p>
                                
                                <h3 style={{marginTop: '2rem'}}>Itens do Orçamento:</h3>
                                <table className="modal-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Detalhes</th>
                                            <th className="text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pieces.length > 0 && (
                                            <tr>
                                                <td>Material (Madeira)</td>
                                                <td>Custo total das peças</td>
                                                <td className="text-right">{formatCurrency(totals.rawPiecesCost * (1 + (profitMargin/100)))}</td>
                                            </tr>
                                        )}
                                        {hardware.length > 0 && (
                                             <tr>
                                                <td>Ferragens e Acessórios</td>
                                                <td>Custo total dos itens</td>
                                                <td className="text-right">{formatCurrency(totals.rawHardwareCost * (1 + (profitMargin/100)))}</td>
                                            </tr>
                                        )}
                                        {borderTapes.length > 0 && (
                                            <tr>
                                                <td>Fita de Borda</td>
                                                <td>Custo total da fita</td>
                                                <td className="text-right">{formatCurrency(totals.totalBorderTapeCost)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                
                                <div style={{marginTop: '2rem', textAlign: 'right'}}>
                                    <p><strong>Subtotal:</strong> {formatCurrency(totals.subtotal)}</p>
                                    <p><strong>Frete:</strong> {formatCurrency(totals.finalDeliveryFee)}</p>
                                    <h3 style={{fontSize: '1.25rem'}}><strong>Total Geral: {formatCurrency(totals.grandTotal)}</strong></h3>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={closeModal} className="btn btn-close">Fechar</button>
                            <button onClick={() => window.print()} className="btn btn-print">Imprimir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}