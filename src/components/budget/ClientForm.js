import React, { useEffect } from 'react';
import { maskCurrency, maskMeasure } from '../../utils/masks';

const ClientForm = ({ 
    clientName, setClientName, 
    clientPhone, setClientPhone, 
    projectName, setProjectName, 
    profitMargin, setProfitMargin, 
    helperCost, setHelperCost, 
    deliveryFee, setDeliveryFee, 
    description, setDescription 
}) => {

    // Aplica máscaras iniciais se os valores vierem puros do banco (Ex: 180 -> 180%)
    useEffect(() => {
        if (profitMargin && String(profitMargin).indexOf('%') === -1) {
            setProfitMargin(maskMeasure(profitMargin, '%'));
        }
        if (helperCost && typeof helperCost === 'number') {
            setHelperCost(maskCurrency(helperCost.toFixed(2)));
        }
        if (deliveryFee && typeof deliveryFee === 'number') {
            setDeliveryFee(maskCurrency(deliveryFee.toFixed(2)));
        }
    }, []); // Executa só na montagem

    return (
        <div className="card">
            <h2 className="section-title">1. Dados do Projeto</h2>
            <div className="grid-2-cols">
                <div className="form-group">
                    <label>Nome do Cliente</label>
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do Cliente" />
                </div>
                <div className="form-group">
                    <label>Lucro (%)</label>
                    <input 
                        type="tel" 
                        value={profitMargin} 
                        onChange={e => setProfitMargin(maskMeasure(e.target.value, '%'))} 
                        placeholder="Ex: 180%" 
                    />
                </div>
            </div>
            
            <div className="grid-2-cols">
                <div className="form-group">
                    <label>Telefone</label>
                    <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(XX) 9XXXX-XXXX" />
                </div>
                <div className="form-grid-inputs-2">
                    <div className="form-group">
                        <label>Ajudante (R$)</label>
                        <input 
                            type="tel" 
                            value={helperCost} 
                            onChange={e => setHelperCost(maskCurrency(e.target.value))} 
                            placeholder="R$ 0,00" 
                        />
                    </div>
                    <div className="form-group">
                        <label>Frete (R$)</label>
                        <input 
                            type="tel" 
                            value={deliveryFee} 
                            onChange={e => setDeliveryFee(maskCurrency(e.target.value))} 
                            placeholder="R$ 0,00" 
                        />
                    </div>
                </div>
            </div>

            <div className="form-group">
                <label>Nome do Projeto</label>
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Ex: Cozinha Planejada" />
            </div>

            <div className="form-group">
                <label>Observações</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes sobre acabamento, medidas especiais..." />
            </div>
        </div>
    );
};

export default ClientForm;