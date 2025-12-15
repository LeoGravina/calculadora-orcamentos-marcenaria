import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from './icons';
import { formatCurrency } from '../utils/helpers';
// ADICIONADO: maskMeasure e unmaskNumber
import { maskCurrency, unmaskMoney, maskMeasure, unmaskNumber } from '../utils/masks'; 
import Modal from './Modal';

const Materials = ({ db, setCurrentPage }) => {
    const [sheets, setSheets] = useState([]);
    const [edgeBands, setEdgeBands] = useState([]);
    const [unitaryItems, setUnitaryItems] = useState([]); 
    const [hardwareBoxes, setHardwareBoxes] = useState([]);
    
    const initialSheetForm = { id: null, name: '', price: '', length: '', width: '' };
    const initialEdgeBandForm = { id: null, name: '', rollPrice: '', rollLength: '' };
    const initialUnitaryItemForm = { id: null, name: '', unitPrice: '' };
    const initialHardwareBoxForm = { id: null, name: '', boxPrice: '', boxQty: '' };

    const [sheetForm, setSheetForm] = useState(initialSheetForm);
    const [edgeBandForm, setEdgeBandForm] = useState(initialEdgeBandForm);
    const [unitaryItemForm, setUnitaryItemForm] = useState(initialUnitaryItemForm);
    const [hardwareBoxForm, setHardwareBoxForm] = useState(initialHardwareBoxForm);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sheets');
    
    const [actionModal, setActionModal] = useState({ isOpen: false, item: null, type: '' });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });

    const materialsCollectionRef = useMemo(() => collection(db, "materials"), [db]);

    const fetchMaterials = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(materialsCollectionRef);
            const allMaterials = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            setSheets(allMaterials.filter(item => item.type === 'sheet'));
            setEdgeBands(allMaterials.filter(item => item.type === 'edge_band'));
            setUnitaryItems(allMaterials.filter(item => item.type === 'unitary_item'));
            setHardwareBoxes(allMaterials.filter(item => item.type === 'hardware_box'));
        } catch (error) { 
            console.error(error);
            toast.error("Erro ao carregar materiais."); 
        } finally { 
            setLoading(false); 
        }
    }, [materialsCollectionRef]);

    useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

    // --- SALVAR (LIMPEZA DOS DADOS) ---
    const handleFormSubmit = async (e, formData, type, setForm, initialForm, title) => {
        e.preventDefault();
        const toastId = toast.loading('Salvando...');
        try {
            const dataToSave = { ...formData, type };

            // 1. Limpa Preços (R$ 1.000,00 -> 1000.00)
            if (dataToSave.price) dataToSave.price = unmaskMoney(dataToSave.price);
            if (dataToSave.rollPrice) dataToSave.rollPrice = unmaskMoney(dataToSave.rollPrice);
            if (dataToSave.unitPrice) dataToSave.unitPrice = unmaskMoney(dataToSave.unitPrice);
            if (dataToSave.boxPrice) dataToSave.boxPrice = unmaskMoney(dataToSave.boxPrice);

            // 2. Limpa Medidas e Quantidades (1.000 mm -> 1000)
            // Usamos unmaskNumber para tirar o sufixo e os pontos
            if (dataToSave.length) dataToSave.length = unmaskNumber(dataToSave.length);
            if (dataToSave.width) dataToSave.width = unmaskNumber(dataToSave.width);
            if (dataToSave.rollLength) dataToSave.rollLength = unmaskNumber(dataToSave.rollLength);
            if (dataToSave.boxQty) dataToSave.boxQty = unmaskNumber(dataToSave.boxQty);

            if (formData.id) {
                await updateDoc(doc(db, "materials", formData.id), dataToSave);
            } else {
                delete dataToSave.id;
                await addDoc(materialsCollectionRef, dataToSave);
            }
            toast.success(`${title} salvo!`, { id: toastId });
            setForm(initialForm);
            fetchMaterials();
        } catch (error) { toast.error("Erro ao salvar.", { id: toastId }); }
    };

    // --- PREPARAR EDIÇÃO (APLICA MÁSCARAS) ---
    const handleEditClick = (item, type) => {
        setActionModal({ isOpen: false, item: null, type: '' });
        
        let itemToEdit = { ...item };

        // Máscara de Preço
        if (itemToEdit.price) itemToEdit.price = maskCurrency(itemToEdit.price.toFixed(2));
        if (itemToEdit.rollPrice) itemToEdit.rollPrice = maskCurrency(itemToEdit.rollPrice.toFixed(2));
        if (itemToEdit.unitPrice) itemToEdit.unitPrice = maskCurrency(itemToEdit.unitPrice.toFixed(2));
        if (itemToEdit.boxPrice) itemToEdit.boxPrice = maskCurrency(itemToEdit.boxPrice.toFixed(2));

        // Máscara de Medidas e Qtd (Ao carregar para editar, já adiciona o sufixo)
        if (itemToEdit.length) itemToEdit.length = maskMeasure(itemToEdit.length, 'mm');
        if (itemToEdit.width) itemToEdit.width = maskMeasure(itemToEdit.width, 'mm');
        if (itemToEdit.rollLength) itemToEdit.rollLength = maskMeasure(itemToEdit.rollLength, 'm');
        if (itemToEdit.boxQty) itemToEdit.boxQty = maskMeasure(itemToEdit.boxQty, 'un');

        if (type === 'sheets') setSheetForm(itemToEdit);
        if (type === 'edgeBands') setEdgeBandForm(itemToEdit);
        if (type === 'unitaryItems') setUnitaryItemForm(itemToEdit);
        if (type === 'hardwareBoxes') setHardwareBoxForm(itemToEdit);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = () => {
        const item = actionModal.item;
        setActionModal({ isOpen: false, item: null, type: '' });
        setTimeout(() => setDeleteModal({ isOpen: true, item }), 100);
    };

    const handleDeleteConfirm = async () => {
        const toastId = toast.loading('Excluindo...');
        try {
            await deleteDoc(doc(db, "materials", deleteModal.item.id));
            toast.success('Item removido!', { id: toastId });
            setDeleteModal({ isOpen: false, item: null });
            fetchMaterials();
        } catch (error) { toast.error("Erro ao excluir.", { id: toastId }); }
    };

    return (
        <main className="main-content">
            <div className="card">
                <div className="card-header-with-button">
                    <h2 className="section-title">Catálogo de Materiais</h2>
                    <button onClick={() => setCurrentPage('home')} className="btn btn-secondary btn-small-back">Voltar</button>
                </div>
                
                <div className="tabs-container">
                    <button onClick={() => setActiveTab('sheets')} className={`tab-button ${activeTab === 'sheets' ? 'active' : ''}`}>Chapas</button>
                    <button onClick={() => setActiveTab('edgeBands')} className={`tab-button ${activeTab === 'edgeBands' ? 'active' : ''}`}>Fitas</button>
                    <button onClick={() => setActiveTab('unitaryItems')} className={`tab-button ${activeTab === 'unitaryItems' ? 'active' : ''}`}>Itens</button>
                    <button onClick={() => setActiveTab('hardwareBoxes')} className={`tab-button ${activeTab === 'hardwareBoxes' ? 'active' : ''}`}>Ferragens</button>
                </div>

                {/* --- 1. CHAPAS --- */}
                {activeTab === 'sheets' && (
                    <form onSubmit={(e) => handleFormSubmit(e, sheetForm, 'sheet', setSheetForm, initialSheetForm, 'Chapa')}>
                        <div className="form-grid-inputs-4">
                            <div className="form-group">
                                <label>Nome</label>
                                <input value={sheetForm.name} onChange={e => setSheetForm({...sheetForm, name:e.target.value})} placeholder="Ex: MDF Branco" required />
                            </div>
                            <div className="form-group">
                                <label>Preço (R$)</label>
                                <input type="tel" value={sheetForm.price} onChange={e => setSheetForm({...sheetForm, price: maskCurrency(e.target.value)})} placeholder="R$ 0,00" required />
                            </div>
                            <div className="form-group">
                                <label>Comp. (mm)</label>
                                {/* MÁSCARA MM */}
                                <input 
                                    type="tel" 
                                    value={sheetForm.length} 
                                    onChange={e => setSheetForm({...sheetForm, length: maskMeasure(e.target.value, 'mm')})} 
                                    placeholder="2750 mm" 
                                    required 
                                />
                            </div>
                            <div className="form-group">
                                <label>Larg. (mm)</label>
                                {/* MÁSCARA MM */}
                                <input 
                                    type="tel" 
                                    value={sheetForm.width} 
                                    onChange={e => setSheetForm({...sheetForm, width: maskMeasure(e.target.value, 'mm')})} 
                                    placeholder="1850 mm" 
                                    required 
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-add">{sheetForm.id ? 'Salvar Alteração' : '+ Adicionar ao Catálogo'}</button>
                    </form>
                )}

                {/* --- 2. FITAS --- */}
                {activeTab === 'edgeBands' && (
                    <form onSubmit={(e) => handleFormSubmit(e, edgeBandForm, 'edge_band', setEdgeBandForm, initialEdgeBandForm, 'Fita')}>
                        <div className="form-grid-inputs-3">
                            <div className="form-group"><label>Nome</label><input value={edgeBandForm.name} onChange={e => setEdgeBandForm({...edgeBandForm, name:e.target.value})} placeholder="Ex: Fita Branca" required /></div>
                            <div className="form-group">
                                <label>Preço Rolo</label>
                                <input type="tel" value={edgeBandForm.rollPrice} onChange={e => setEdgeBandForm({...edgeBandForm, rollPrice: maskCurrency(e.target.value)})} placeholder="R$ 0,00" required />
                            </div>
                            <div className="form-group">
                                <label>Metros</label>
                                {/* MÁSCARA METROS (m) */}
                                <input 
                                    type="tel" 
                                    value={edgeBandForm.rollLength} 
                                    onChange={e => setEdgeBandForm({...edgeBandForm, rollLength: maskMeasure(e.target.value, 'm')})} 
                                    placeholder="50 m" 
                                    required 
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-add">{edgeBandForm.id ? 'Salvar Alteração' : '+ Adicionar Fita'}</button>
                    </form>
                )}

                {/* --- 3. ITENS --- */}
                {activeTab === 'unitaryItems' && (
                    <form onSubmit={(e) => handleFormSubmit(e, unitaryItemForm, 'unitary_item', setUnitaryItemForm, initialUnitaryItemForm, 'Item')}>
                        <div className="grid-2-cols">
                            <div className="form-group"><label>Nome</label><input value={unitaryItemForm.name} onChange={e => setUnitaryItemForm({...unitaryItemForm, name:e.target.value})} placeholder="Ex: Puxador" required /></div>
                            <div className="form-group">
                                <label>Preço Unit.</label>
                                <input type="tel" value={unitaryItemForm.unitPrice} onChange={e => setUnitaryItemForm({...unitaryItemForm, unitPrice: maskCurrency(e.target.value)})} placeholder="R$ 0,00" required />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-add">{unitaryItemForm.id ? 'Salvar Alteração' : '+ Adicionar Item'}</button>
                    </form>
                )}

                {/* --- 4. FERRAGENS --- */}
                {activeTab === 'hardwareBoxes' && (
                    <form onSubmit={(e) => handleFormSubmit(e, hardwareBoxForm, 'hardware_box', setHardwareBoxForm, initialHardwareBoxForm, 'Ferragem')}>
                        <div className="form-grid-inputs-3">
                            <div className="form-group"><label>Nome</label><input value={hardwareBoxForm.name} onChange={e => setHardwareBoxForm({...hardwareBoxForm, name:e.target.value})} placeholder="Ex: Parafuso" required /></div>
                            <div className="form-group">
                                <label>Preço Caixa</label>
                                <input type="tel" value={hardwareBoxForm.boxPrice} onChange={e => setHardwareBoxForm({...hardwareBoxForm, boxPrice: maskCurrency(e.target.value)})} placeholder="R$ 0,00" required />
                            </div>
                            <div className="form-group">
                                <label>Qtd Caixa</label>
                                {/* MÁSCARA UNIDADES (un) */}
                                <input 
                                    type="tel" 
                                    value={hardwareBoxForm.boxQty} 
                                    onChange={e => setHardwareBoxForm({...hardwareBoxForm, boxQty: maskMeasure(e.target.value, 'un')})} 
                                    placeholder="1000 un" 
                                    required 
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-add">{hardwareBoxForm.id ? 'Salvar Alteração' : '+ Adicionar Ferragem'}</button>
                    </form>
                )}

                <div className="table-container" style={{marginTop: '2rem'}}>
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                {activeTab === 'sheets' && <><th>Preço</th><th>Medidas</th></>}
                                {activeTab === 'edgeBands' && <><th>Preço Rolo</th><th>Metros</th></>}
                                {activeTab === 'unitaryItems' && <th>Preço Unit.</th>}
                                {activeTab === 'hardwareBoxes' && <><th>Preço Caixa</th><th>Qtd/Caixa</th></>}
                            </tr>
                        </thead>
                        <tbody>
                            {(activeTab === 'sheets' ? sheets : activeTab === 'edgeBands' ? edgeBands : activeTab === 'unitaryItems' ? unitaryItems : hardwareBoxes).map(item => (
                                <tr key={item.id} onClick={() => setActionModal({ isOpen: true, item, type: activeTab })} title="Clique para editar/excluir">
                                    <td>{item.name}</td>
                                    {activeTab === 'sheets' && <>
                                        <td>{formatCurrency(item.price)}</td>
                                        <td>{item.length} x {item.width} mm</td>
                                    </>}
                                    {activeTab === 'edgeBands' && <>
                                        <td>{formatCurrency(item.rollPrice)}</td>
                                        <td>{item.rollLength} m</td>
                                    </>}
                                    {activeTab === 'unitaryItems' && <td>{formatCurrency(item.unitPrice)}</td>}
                                    {activeTab === 'hardwareBoxes' && <>
                                        <td>{formatCurrency(item.boxPrice)}</td>
                                        <td>{item.boxQty} un</td>
                                    </>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({ isOpen: false, item: null, type: '' })} title={`Opções: ${actionModal.item?.name}`} footer={<button onClick={() => setActionModal({ isOpen: false, item: null, type: '' })} className="btn btn-secondary" style={{width:'100%'}}>Fechar</button>}>
                <div className="action-menu-grid">
                    <button onClick={() => handleEditClick(actionModal.item, actionModal.type)} className="btn-action-menu edit"><EditIcon /> <span>Editar Item</span></button>
                    <button onClick={handleDeleteClick} className="btn-action-menu delete"><TrashIcon /> <span>Excluir do Catálogo</span></button>
                </div>
            </Modal>

            <Modal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, item: null })} title="Confirmar Exclusão" footer={<div className="modal-actions-grid"><button onClick={() => setDeleteModal({ isOpen: false, item: null })} className="btn-modal-cancel">Cancelar</button><button onClick={handleDeleteConfirm} className="btn-modal-confirm">Confirmar</button></div>}>
                <div className="delete-msg">Tem certeza que deseja excluir <strong>{deleteModal.item?.name}</strong> do catálogo?</div>
            </Modal>
        </main>
    );
};

export default Materials;