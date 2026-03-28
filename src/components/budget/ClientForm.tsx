import React, { useEffect } from 'react';
import { maskCurrency, maskMeasure } from '../../utils/masks';

// === TYPESCRIPT INTERFACES ===
interface ClientFormProps {
    clientName: string;
    setClientName: (val: string) => void;
    clientPhone: string;
    setClientPhone: (val: string) => void;
    projectName: string;
    setProjectName: (val: string) => void;
    profitMargin: string | number;
    setProfitMargin: (val: string) => void;
    helperCost: string | number;
    setHelperCost: (val: string) => void;
    deliveryFee: string | number;
    setDeliveryFee: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ 
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
            setHelperCost(maskCurrency((helperCost as number).toFixed(2)));
        }
        if (deliveryFee && typeof deliveryFee === 'number') {
            setDeliveryFee(maskCurrency((deliveryFee as number).toFixed(2)));
        }
    }, [profitMargin, helperCost, deliveryFee, setProfitMargin, setHelperCost, setDeliveryFee]);

    return (
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-800 border-b-2 border-gray-50 pb-3 mb-5">
                1. Dados do Projeto
            </h2>
            
            <div className="flex flex-col gap-5">
                {/* Linha 1: Cliente e Lucro */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome do Cliente</label>
                        <input 
                            type="text" 
                            value={clientName} 
                            onChange={e => setClientName(e.target.value)} 
                            placeholder="Ex: João da Silva" 
                            className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-gray-800"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Lucro Desejado (%)</label>
                        <input 
                            type="tel" 
                            value={profitMargin} 
                            onChange={e => setProfitMargin(maskMeasure(e.target.value, '%'))} 
                            placeholder="Ex: 180%" 
                            className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-bold text-emerald-600"
                        />
                    </div>
                </div>
                
                {/* Linha 2: Telefone e Custos Extras */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Telefone</label>
                        <input 
                            type="text" 
                            value={clientPhone} 
                            onChange={e => setClientPhone(e.target.value)} 
                            placeholder="(XX) 9XXXX-XXXX" 
                            className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-gray-800"
                        />
                    </div>
                    
                    {/* Custos Extras divididos em 2 colunas mesmo no mobile para economizar espaço vertical */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ajudante (R$)</label>
                            <input 
                                type="tel" 
                                value={helperCost} 
                                onChange={e => setHelperCost(maskCurrency(e.target.value))} 
                                placeholder="R$ 0,00" 
                                className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-red-600"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Frete (R$)</label>
                            <input 
                                type="tel" 
                                value={deliveryFee} 
                                onChange={e => setDeliveryFee(maskCurrency(e.target.value))} 
                                placeholder="R$ 0,00" 
                                className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-red-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Linha 3: Projeto */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome do Projeto</label>
                    <input 
                        type="text" 
                        value={projectName} 
                        onChange={e => setProjectName(e.target.value)} 
                        placeholder="Ex: Cozinha Planejada Branca" 
                        className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-bold text-gray-800"
                    />
                </div>

                {/* Linha 4: Observações */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Observações</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="Detalhes sobre acabamento, endereço de entrega, medidas especiais..." 
                        className="min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-gray-700 resize-y"
                    />
                </div>
            </div>
        </div>
    );
};

export default ClientForm;