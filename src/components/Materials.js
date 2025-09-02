import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EditIcon, TrashIcon } from './icons';
import { formatCurrency } from '../utils/helpers';
import Modal from './Modal';

const Materials = ({ db, setCurrentPage }) => {
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sheetForm, setSheetForm] = useState({ id: null, name: '', price: '', length: '', width: '' });
    const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const materialsCollectionRef = collection(db, "materials");

    const fetchSheets = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(materialsCollectionRef);
            const sheetsData = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(item => item.type === 'sheet'); // Filtramos para pegar apenas chapas
            setSheets(sheetsData);
        } catch (error) {
            console.error("Erro ao buscar materiais:", error);
            toast.error("Falha ao carregar os materiais.");
        } finally {
            setLoading(false);
        }
    }, [materialsCollectionRef]);

    useEffect(() => {
        fetchSheets();
    }, [fetchSheets]);

    const handleSheetFormChange = (e) => setSheetForm(p => ({ ...p, [e.target.name]: e.target.value }));

    const handleSheetSubmit = async (e) => {
        e.preventDefault();
        const { id, name, price, length, width } = sheetForm;
        if (!name || !price || !length || !width) {
            toast.error("Por favor, preencha todos os campos.");
            return;
        }

        const isEditing = !!id;
        const toastId = toast.loading(isEditing ? 'Atualizando chapa...' : 'Adicionando chapa...');

        try {
            const sheetData = {
                name,
                price: parseFloat(price),
                length: parseInt(length, 10),
                width: parseInt(width, 10),
                type: 'sheet' // Campo para identificar o tipo de material
            };

            if (isEditing) {
                const sheetDoc = doc(db, "materials", id);
                await updateDoc(sheetDoc, sheetData);
            } else {
                await addDoc(materialsCollectionRef, sheetData);
            }
            
            toast.success(isEditing ? 'Chapa atualizada!' : 'Chapa adicionada!', { id: toastId });
            setSheetForm({ id: null, name: '', price: '', length: '', width: '' });
            fetchSheets(); // Atualiza a lista
        } catch (error) {
            console.error("Erro ao salvar chapa:", error);
            toast.error("Erro ao salvar a chapa.", { id: toastId });
        }
    };

    const editSheet = (sheet) => {
        setSheetForm(sheet);
    };

    const closeModal = () => {
        setModalState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    };

    const handleDeleteConfirm = async (id) => {
        const toastId = toast.loading('Excluindo chapa...');
        try {
            const sheetDoc = doc(db, "materials", id);
            await deleteDoc(sheetDoc);
            toast.success('Chapa removida!', { id: toastId });
            closeModal();
            fetchSheets();
        } catch (error) {
            console.error("Erro ao excluir chapa:", error);
            toast.error("Erro ao excluir.", { id: toastId });
        }
    };
    
    const deleteSheet = (id, name) => {
        setModalState({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: `Tem certeza que deseja excluir a chapa "${name}" do seu catálogo?`,
            onConfirm: () => handleDeleteConfirm(id),
            confirmButtonClass: 'btn-delete-action'
        });
    };

    return (
        <main className="main-content">
            <div className="card">
                <div className="card-header-with-button">
                    <h2 className="section-title">Catálogo de Materiais</h2>
                    <button onClick={() => setCurrentPage('home')} className="btn btn-secondary btn-small-back">
                        Voltar à Página Inicial
                    </button>
                </div>
                
                <h3 className="subsection-title">Chapas de Madeira</h3>
                <form onSubmit={handleSheetSubmit}>
                    <div className="form-grid-inputs-4">
                        <div className="form-group"><label>Nome da Chapa</label><input type="text" name="name" value={sheetForm.name} onChange={handleSheetFormChange} placeholder="Ex: MDF Branco 18mm" required /></div>
                        <div className="form-group"><label>Preço (R$)</label><input type="number" step="0.01" name="price" value={sheetForm.price} onChange={handleSheetFormChange} placeholder="Ex: 350.00" required /></div>
                        <div className="form-group"><label>Comp. (mm)</label><input type="number" name="length" value={sheetForm.length} onChange={handleSheetFormChange} placeholder="Ex: 2750" required /></div>
                        <div className="form-group"><label>Larg. (mm)</label><input type="number" name="width" value={sheetForm.width} onChange={handleSheetFormChange} placeholder="Ex: 1850" required /></div>
                    </div>
                    <button type="submit" className={`btn form-submit-button ${sheetForm.id ? 'btn-save' : 'btn-add'}`}>{sheetForm.id ? 'Salvar Alterações' : '+ Adicionar ao Catálogo'}</button>
                </form>

                {loading ? <p>Carregando chapas...</p> : (
                    <div className="table-container">
                        <table>
                            <thead><tr><th className="th-name">Nome</th><th>Preço</th><th>Medidas</th><th className="th-actions">Ações</th></tr></thead>
                            <tbody>
                                {sheets.map(s => (
                                    <tr key={s.id}>
                                        <td className="td-name">{s.name}</td>
                                        <td>{formatCurrency(s.price)}</td>
                                        <td>{s.length}mm x {s.width}mm</td>
                                        <td className="actions">
                                            <button onClick={() => editSheet(s)} className="icon-button edit" title="Editar"><EditIcon /></button>
                                            <button onClick={() => deleteSheet(s.id, s.name)} className="icon-button delete" title="Excluir"><TrashIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <Modal
                isOpen={modalState.isOpen}
                onClose={closeModal}
                onConfirm={modalState.onConfirm}
                title={modalState.title}
                confirmButtonClass={modalState.confirmButtonClass}
            >
                <p>{modalState.message}</p>
            </Modal>
        </main>
    );
};

export default Materials;