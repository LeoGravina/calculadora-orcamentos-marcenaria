import React, { useState, useEffect } from 'react';
import { collection, getDocs, Firestore } from 'firebase/firestore';
import { formatCurrency } from '../utils/helpers';
import { CalculatorIcon, ArchiveIcon, CashIcon, MaterialsIcon } from './icons'; 

// 1. TYPESCRIPT: Definimos exatamente o que esse componente espera receber (Props)
interface HomePageProps {
    setCurrentPage: (page: string) => void;
    logoDaEmpresa: string;
    handleNewBudget: () => void;
    db: Firestore | null; // Tipagem nativa do Firebase
}

// 2. TYPESCRIPT: Definimos o formato exato do nosso estado de Dashboard
interface DashboardStats {
    pendingCount: number;
    approvedCount: number;
    totalValue: number;
    loading: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ setCurrentPage, logoDaEmpresa, handleNewBudget, db }) => {
    // 3. TYPESCRIPT: O useState agora sabe que só pode receber o formato DashboardStats
    const [stats, setStats] = useState<DashboardStats>({ 
        pendingCount: 0, 
        approvedCount: 0, 
        totalValue: 0,
        loading: true 
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (!db) return;
            try {
                const querySnapshot = await getDocs(collection(db, "budgets"));
                let pending = 0;
                let approved = 0;
                let totalVal = 0;

                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    const status = data.status || 'Pendente';
                    const price = parseFloat(data.finalBudgetPrice || data.grandTotal || 0);

                    if (status === 'Pendente') {
                        pending++;
                    } else if (['Aprovado', 'Em Produção', 'Concluído', 'Pago'].includes(status)) {
                        approved++;
                        totalVal += price;
                    }
                });

                setStats({ 
                    pendingCount: pending, 
                    approvedCount: approved, 
                    totalValue: totalVal, 
                    loading: false 
                });
            } catch (error) {
                console.error("Erro ao carregar dashboard:", error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        fetchStats();
    }, [db]);

    return (
        // 4. TAILWIND: Flexbox, centralização e background base da página
        <div className="flex flex-col items-center px-4 py-8 mx-auto w-full max-w-4xl text-gray-800">
            
            {/* Logo e Cabeçalho */}
            <img 
                src={logoDaEmpresa} 
                alt="Logo da Empresa" 
                className="w-28 h-28 rounded-full border-4 border-white shadow-md object-contain mb-4 bg-black" 
            />
            <h1 className="text-2xl font-extrabold text-gray-900 text-center">Calculadora de Orçamentos</h1>
            <p className="text-gray-500 font-medium mt-1">Marcenaria MVMóveis</p>

            {/* Dashboard Grid - Mobile First (Grid 2 colunas) */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-8 mb-8">
                
                {/* Card 1: Pendentes */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm flex flex-col justify-center transition-transform hover:-translate-y-1 border-b-4 border-b-amber-600">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-1">Pendentes</span>
                    <div className="text-3xl font-extrabold text-amber-600">
                        {stats.loading ? '-' : stats.pendingCount}
                    </div>
                </div>

                {/* Card 2: Aprovados */}
                <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm flex flex-col justify-center transition-transform hover:-translate-y-1 border-b-4 border-b-emerald-600">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-1">Aprovados</span>
                    <div className="text-3xl font-extrabold text-emerald-600">
                        {stats.loading ? '-' : stats.approvedCount}
                    </div>
                </div>

                {/* Card 3: Faturamento Total (Ocupa as 2 colunas) */}
                <div className="col-span-2 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-2xl p-5 text-center shadow-sm transition-transform hover:-translate-y-1 border-b-4 border-b-blue-600">
                    <span className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-1">Faturamento Total</span>
                    <div className="text-4xl font-extrabold text-blue-600 mt-1">
                        {stats.loading ? '-' : formatCurrency(stats.totalValue)}
                    </div>
                </div>
            </div>

            {/* Botões Principais - Grid 2x2 para o toque com o polegar ser perfeito */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                
                {/* Botão: Novo Orçamento */}
                <button 
                    onClick={handleNewBudget} 
                    className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-1 hover:brightness-110 font-bold gap-3"
                >
                    <div className="w-8 h-8"><CalculatorIcon /></div>
                    <span>Novo Orçamento</span>
                </button>

                {/* Botão: Orçamentos Salvos */}
                <button 
                    onClick={() => setCurrentPage('saved')} 
                    className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 hover:brightness-110 font-bold gap-3"
                >
                    <div className="w-8 h-8"><ArchiveIcon /></div>
                    <span className="text-center">Orçamentos Salvos</span>
                </button>

                {/* Botão: Cadastrar Materiais */}
                <button 
                    onClick={() => setCurrentPage('materials')} 
                    className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-1 hover:brightness-110 font-bold gap-3"
                >
                    <div className="w-8 h-8"><MaterialsIcon /></div>
                    <span className="text-center">Cadastrar Materiais</span>
                </button>
                
                {/* Botão: Comissões */}
                <button 
                    onClick={() => setCurrentPage('commissions')} 
                    className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:-translate-y-1 hover:brightness-110 font-bold gap-3"
                >
                    <div className="w-8 h-8"><CashIcon /></div>
                    <span>Comissões</span>
                </button>
            </div>
        </div>
    );
};

export default HomePage;