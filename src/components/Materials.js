// NOVO: Importar o useMemo
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from './icons';
import { formatCurrency } from '../utils/helpers';
import Modal from './Modal';

const MaterialForm = ({ formState, setFormState, onSubmit, labels, title, gridCols }) => {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit(formState);
    };

    return (
        <>
            <h3 className="subsection-title">{title.plural}</h3>
            <form onSubmit={handleFormSubmit}>
                <div className={`form-grid-inputs-${gridCols || Object.keys(labels).length}`}>
                    {Object.keys(labels).map(key => (
                        <div className="form-group" key={key}>
                            <label>{labels[key].label}</label>
                            <input
                                type={labels[key].type || 'text'}
                                step="0.01"
                                name={key}
                                value={formState[key] || ''}
                                onChange={handleChange}
                                placeholder={labels[key].placeholder}
                                required
                            />
                        </div>
                    ))}
                </div>
                <button type="submit" className={`btn form-submit-button ${formState.id ? 'btn-save' : 'btn-add'}`}>
                    {formState.id ? 'Salvar Alterações' : '+ Adicionar ao Catálogo'}
                </button>
            </form>
        </>
    );
};


const Materials = ({ db, setCurrentPage }) => {
    // Estados para as listas de materiais
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
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [activeTab, setActiveTab] = useState('sheets');

    // CORREÇÃO DEFINITIVA: Usando useMemo para evitar que a referência da coleção seja recriada a cada renderização.
    // Isso quebra o loop infinito.
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
            toast.error("Falha ao carregar os materiais.");
        } finally {
            setLoading(false);
        }
    }, [materialsCollectionRef]); // Agora 'materialsCollectionRef' é uma dependência estável.

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

    const handleFormSubmit = async (formData, type, formFields, singularTitle) => {
        const requiredFields = { ...formFields };
        delete requiredFields.id;
        if (Object.keys(requiredFields).some(key => !formData[key])) {
            toast.error("Por favor, preencha todos os campos.");
            return;
        }

        const isEditing = !!formData.id;
        const toastId = toast.loading(isEditing ? `Atualizando ${singularTitle}...` : `Adicionando ${singularTitle}...`);

        try {
            const dataToSave = { ...formData, type };
            Object.keys(dataToSave).forEach(key => {
                if (key !== 'id' && key !== 'name' && key !== 'type') {
                    dataToSave[key] = parseFloat(dataToSave[key]);
                }
            });

            if (isEditing) {
                await updateDoc(doc(db, "materials", formData.id), dataToSave);
            } else {
                delete dataToSave.id;
                await addDoc(materialsCollectionRef, dataToSave);
            }
            
            toast.success(`${singularTitle} ${isEditing ? 'atualizado(a)!' : 'adicionado(a)!'}`, { id: toastId });
            if (type === 'sheet') setSheetForm(initialSheetForm);
            if (type === 'edge_band') setEdgeBandForm(initialEdgeBandForm);
            if (type === 'unitary_item') setUnitaryItemForm(initialUnitaryItemForm);
            if (type === 'hardware_box') setHardwareBoxForm(initialHardwareBoxForm);
            
            fetchMaterials();
        } catch (error) {
            toast.error("Erro ao salvar.", { id: toastId });
        }
    };

    const editMaterial = (material) => {
        // Popula o formulário correto (esta parte já estava certa)
        if (material.type === 'sheet') setSheetForm(material);
        if (material.type === 'edge_band') setEdgeBandForm(material);
        if (material.type === 'unitary_item') setUnitaryItemForm(material);
        if (material.type === 'hardware_box') setHardwareBoxForm(material);
        
        let tabNameToActivate;
        switch (material.type) {
            case 'sheet':
                tabNameToActivate = 'sheets';
                break;
            case 'edge_band':
                tabNameToActivate = 'edgeBands'; // Nome corrigido
                break;
            case 'unitary_item':
                tabNameToActivate = 'unitaryItems'; // Nome corrigido
                break;
            case 'hardware_box':
                tabNameToActivate = 'hardwareBoxes'; // Nome corrigido
                break;
            default:
                // Valor padrão para segurança
                tabNameToActivate = 'sheets';
        }
        setActiveTab(tabNameToActivate);
        
        // Rola a página para o topo
        window.scrollTo(0, 0);
    };
    const closeModal = () => setModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const handleDeleteConfirm = async (id) => {
        const toastId = toast.loading('Excluindo item...');
        try {
            await deleteDoc(doc(db, "materials", id));
            toast.success('Item removido!', { id: toastId });
            closeModal();
            fetchMaterials();
        } catch (error) {
            toast.error("Erro ao excluir.", { id: toastId });
        }
    };
    
    const deleteMaterial = (id, name) => {
        setModalState({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir "${name}" do seu catálogo?`,
            onConfirm: () => handleDeleteConfirm(id),
            confirmButtonClass: 'btn-delete-action'
        });
    };

    const NoMaterialsMessage = () => (
        <div className="no-materials-message">
            <p>Ainda não tem nenhum material cadastrado aqui.</p>
        </div>
    );

    return (
        <main className="main-content">
            <div className="card">
                <div className="card-header-with-button">
                    <h2 className="section-title">Catálogo de Materiais</h2>
                    <button onClick={() => setCurrentPage('home')} className="btn btn-secondary btn-small-back">
                        Voltar à Página Inicial
                    </button>
                </div>
                
                <div className="tabs-container">
                    <button onClick={() => setActiveTab('sheets')} className={`tab-button ${activeTab === 'sheets' ? 'active' : ''}`}>Chapas</button>
                    <button onClick={() => setActiveTab('edgeBands')} className={`tab-button ${activeTab === 'edgeBands' ? 'active' : ''}`}>Fitas de Borda</button>
                    <button onClick={() => setActiveTab('unitaryItems')} className={`tab-button ${activeTab === 'unitaryItems' ? 'active' : ''}`}>Itens Unitários</button>
                    <button onClick={() => setActiveTab('hardwareBoxes')} className={`tab-button ${activeTab === 'hardwareBoxes' ? 'active' : ''}`}>Ferragens (Caixa)</button>
                </div>

                <div className="tab-content">
                    {activeTab === 'sheets' && <MaterialForm formState={sheetForm} setFormState={setSheetForm} onSubmit={(data) => handleFormSubmit(data, 'sheet', initialSheetForm, 'Chapa')} labels={{ name: { label: 'Nome da Chapa', placeholder: 'Ex: MDF Branco 18mm' }, price: { label: 'Preço (R$)', placeholder: 'Ex: 350.00', type: 'number' }, length: { label: 'Comp. (mm)', placeholder: 'Ex: 2750', type: 'number' }, width: { label: 'Larg. (mm)', placeholder: 'Ex: 1850', type: 'number' } }} title={{ singular: 'Chapa', plural: 'Chapas de Madeira' }} gridCols={4} />}
                    {activeTab === 'edgeBands' && <MaterialForm formState={edgeBandForm} setFormState={setEdgeBandForm} onSubmit={(data) => handleFormSubmit(data, 'edge_band', initialEdgeBandForm, 'Fita de Borda')} labels={{ name: { label: 'Nome da Fita', placeholder: 'Ex: Branco TX 22mm' }, rollPrice: { label: 'Preço do Rolo (R$)', placeholder: 'Ex: 75.00', type: 'number' }, rollLength: { label: 'Metros no Rolo', placeholder: 'Ex: 50', type: 'number' } }} title={{ singular: 'Fita de Borda', plural: 'Fitas de Borda' }} gridCols={3} />}
                    {activeTab === 'unitaryItems' && <MaterialForm formState={unitaryItemForm} setFormState={setUnitaryItemForm} onSubmit={(data) => handleFormSubmit(data, 'unitary_item', initialUnitaryItemForm, 'Item Unitário')} labels={{ name: { label: 'Nome do Item', placeholder: 'Ex: Puxador Concha' }, unitPrice: { label: 'Preço por Unidade (R$)', placeholder: 'Ex: 15.00', type: 'number' } }} title={{ singular: 'Item Unitário', plural: 'Itens Unitários (Puxadores, Dobradiças, etc.)' }} gridCols={2} />}
                    {activeTab === 'hardwareBoxes' && <MaterialForm formState={hardwareBoxForm} setFormState={setHardwareBoxForm} onSubmit={(data) => handleFormSubmit(data, 'hardware_box', initialHardwareBoxForm, 'Caixa de Ferragem')} labels={{ name: { label: 'Nome da Ferragem', placeholder: 'Ex: Parafuso 3.5x40' }, boxPrice: { label: 'Preço da Caixa (R$)', placeholder: 'Ex: 45.00', type: 'number' }, boxQty: { label: 'Unidades na Caixa', placeholder: 'Ex: 500', type: 'number' } }} title={{ singular: 'Caixa de Ferragem', plural: 'Ferragens Vendidas por Caixa' }} gridCols={3} />}
                </div>

                {loading ? <p>Carregando materiais...</p> : (
                    <div className="table-container">
                        {activeTab === 'sheets' && (sheets.length > 0 ? (
                            <table>
                                <thead><tr><th className="th-name">Nome</th><th>Preço</th><th>Medidas</th><th className="th-actions">Ações</th></tr></thead>
                                <tbody>{sheets.map(s => (<tr key={s.id}><td>{s.name}</td><td>{formatCurrency(s.price)}</td><td>{s.length}mm x {s.width}mm</td><td className="actions"><button onClick={() => editMaterial(s)} className="icon-button edit" title="Editar"><EditIcon /></button><button onClick={() => deleteMaterial(s.id, s.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button></td></tr>))}</tbody>
                            </table>
                        ) : <NoMaterialsMessage />)}

                        {activeTab === 'edgeBands' && (edgeBands.length > 0 ? (
                             <table>
                                <thead><tr><th className="th-name">Nome</th><th>Preço do Rolo</th><th>Metragem</th><th>Preço/m</th><th className="th-actions">Ações</th></tr></thead>
                                <tbody>{edgeBands.map(b => (<tr key={b.id}><td>{b.name}</td><td>{formatCurrency(b.rollPrice)}</td><td>{b.rollLength} m</td><td>{formatCurrency(b.rollPrice / b.rollLength)}</td><td className="actions"><button onClick={() => editMaterial(b)} className="icon-button edit" title="Editar"><EditIcon /></button><button onClick={() => deleteMaterial(b.id, b.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button></td></tr>))}</tbody>
                            </table>
                        ) : <NoMaterialsMessage />)}

                        {activeTab === 'unitaryItems' && (unitaryItems.length > 0 ? (
                             <table>
                                <thead><tr><th className="th-name">Nome</th><th>Preço Unitário</th><th className="th-actions">Ações</th></tr></thead>
                                <tbody>{unitaryItems.map(i => (<tr key={i.id}><td>{i.name}</td><td>{formatCurrency(i.unitPrice)}</td><td className="actions"><button onClick={() => editMaterial(i)} className="icon-button edit" title="Editar"><EditIcon /></button><button onClick={() => deleteMaterial(i.id, i.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button></td></tr>))}</tbody>
                            </table>
                        ) : <NoMaterialsMessage />)}

                        {activeTab === 'hardwareBoxes' && (hardwareBoxes.length > 0 ? (
                             <table>
                                <thead><tr><th className="th-name">Nome</th><th>Preço da Caixa</th><th>Unidades/Caixa</th><th>Preço/Unid.</th><th className="th-actions">Ações</th></tr></thead>
                                <tbody>{hardwareBoxes.map(h => (<tr key={h.id}><td>{h.name}</td><td>{formatCurrency(h.boxPrice)}</td><td>{h.boxQty}</td><td>{formatCurrency(h.boxPrice / h.boxQty)}</td><td className="actions"><button onClick={() => editMaterial(h)} className="icon-button edit" title="Editar"><EditIcon /></button><button onClick={() => deleteMaterial(h.id, h.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button></td></tr>))}</tbody>
                            </table>
                        ) : <NoMaterialsMessage />)}
                    </div>
                )}
            </div>
            
            <Modal isOpen={modalState.isOpen} onClose={closeModal} onConfirm={modalState.onConfirm} title={modalState.title} confirmButtonClass={modalState.confirmButtonClass}>
                <p>{modalState.message}</p>
            </Modal>
        </main>
    );
};

export default Materials;