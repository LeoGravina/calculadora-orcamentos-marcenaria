import React, { useEffect } from 'react';
import { maskCurrency, maskMeasure, maskPhone, unmaskPhone } from '../../utils/masks';

// === TYPESCRIPT INTERFACES ===
interface ClientFormProps {
    clientName: string; clientPhone: string; projectName: string; description: string;
    profitMargin: string | number; helperCost: string | number; deliveryFee: string | number;
    setClientName: (val: string) => void; setClientPhone: (val: string) => void;
    setProjectName: (val: string) => void; setDescription: (val: string) => void;
    setProfitMargin: (val: string) => void; setHelperCost: (val: string) => void;
    setDeliveryFee: (val: string) => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ 
    clientName, clientPhone, projectName, description,
    profitMargin, helperCost, deliveryFee,
    setClientName, setClientPhone, setProjectName, setDescription,
    setProfitMargin, setHelperCost, setDeliveryFee
}) => {

    useEffect(() => {
        if (profitMargin && typeof profitMargin === 'number') { setProfitMargin(String(profitMargin)); }
        if (helperCost && typeof helperCost === 'number') { setHelperCost(maskCurrency((helperCost as number).toFixed(2))); }
        if (deliveryFee && typeof deliveryFee === 'number') { setDeliveryFee(maskCurrency((deliveryFee as number).toFixed(2))); }
        if (clientPhone && unmaskPhone(clientPhone).length <= 11) { setClientPhone(maskPhone(clientPhone)); }
    }, [profitMargin, helperCost, deliveryFee, clientPhone, setProfitMargin, setHelperCost, setDeliveryFee, setClientPhone]);

    return (
        <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 mt-6">
            <h2 className="text-xl font-extrabold text-gray-800 border-b-2 border-gray-50 pb-3 mb-5">
                1. Dados do Projeto
            </h2>
            
            <div className="flex flex-col gap-5">
                {/* Linha 1: Cliente e Lucro (Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1 w-full md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome do Cliente</label>
                        <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João da Silva" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-gray-800" />
                    </div>
                    {/* Lucro com Suffix Overlay (%) */}
                    <div className="flex flex-col gap-1 w-full">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide text-center">Lucro (%)</label>
                        <div className="relative w-full">
                            <input type="tel" value={profitMargin} onChange={e => setProfitMargin(maskMeasure(e.target.value))} placeholder="0" className="h-14 w-full px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-lg text-emerald-600 text-center" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-emerald-600 select-none pointer-events-none">%</span>
                        </div>
                    </div>
                </div>
                
                {/* Linha 2: Telefone Br e Custos Extras (Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Telefone com Suffix Overlay (Br) e Máscara Automática */}
                    <div className="flex flex-col gap-1 w-full relative">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide pr-10">Telefone Br</label>
                        <div className="relative w-full">
                            <input type="tel" value={clientPhone} onChange={e => setClientPhone(maskPhone(e.target.value))} placeholder="(XX) 9XXXX-XXXX" className="h-14 px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-bold text-lg text-gray-800 tracking-wider" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 select-none pointer-events-none">Br</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1 w-full relative">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide pr-12">Ajudante (R$)</label>
                            <input type="tel" value={helperCost} onChange={e => setHelperCost(maskCurrency(e.target.value))} placeholder="R$ 0,00" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none w-full font-medium text-red-600" />
                        </div>
                        <div className="flex flex-col gap-1 w-full relative">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide pr-12">Frete (R$)</label>
                            <input type="tel" value={deliveryFee} onChange={e => setDeliveryFee(maskCurrency(e.target.value))} placeholder="R$ 0,00" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none w-full font-medium text-red-600" />
                        </div>
                    </div>
                </div>

                {/* Linha 3: Projeto */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nome do Projeto</label>
                    <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Ex: Cozinha Branca" className="h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-bold text-gray-800" />
                </div>

                {/* Linha 4: Observações */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Observações</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes..." className="min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none w-full font-medium text-gray-700 resize-y" />
                </div>
            </div>
        </div>
    );
};

export default ClientForm;