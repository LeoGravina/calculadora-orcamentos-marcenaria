import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { formatCurrency } from '../utils/helpers';
import { CalculatorIcon, ArchiveIcon, CashIcon, MaterialsIcon } from './icons'; 

const HomePage = ({ setCurrentPage, logoDaEmpresa, handleNewBudget, db }) => {
    // Estado para guardar os números do dashboard
    const [stats, setStats] = useState({ 
        pendingCount: 0, 
        approvedCount: 0, 
        totalValue: 0,
        loading: true 
    });

    // Busca os dados ao carregar a Home
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
                    // Garante que o valor seja numérico
                    const price = parseFloat(data.finalBudgetPrice || data.grandTotal || 0);

                    if (status === 'Pendente') {
                        pending++;
                    } else if (['Aprovado', 'Em Produção', 'Concluído', 'Pago'].includes(status)) {
                        // Consideramos tudo que não é pendente nem recusado como "Venda Fechada"
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
        <div className="home-container">
            <img src={logoDaEmpresa} alt="Logo da Empresa" className="app-logo" />
            <h1>Calculadora de Orçamentos</h1>
            <p>Marcenaria MVMóveis</p>

            {/* === NOVO DASHBOARD === */}
            <div className="dashboard-grid">
                {/* Card 1: Pendentes */}
                <div className="dash-card pending">
                    <span className="dash-label">Pendentes</span>
                    <div className="dash-value">
                        {stats.loading ? '-' : stats.pendingCount}
                    </div>
                </div>

                {/* Card 2: Aprovados */}
                <div className="dash-card approved">
                    <span className="dash-label">Aprovados</span>
                    <div className="dash-value">
                        {stats.loading ? '-' : stats.approvedCount}
                    </div>
                </div>

                {/* Card 3: Faturamento (Ocupa 2 colunas no mobile se quiser, ou linha inteira) */}
                <div className="dash-card total">
                    <span className="dash-label">Faturamento Total</span>
                    <div className="dash-value revenue">
                        {stats.loading ? '-' : formatCurrency(stats.totalValue)}
                    </div>
                </div>
            </div>
            {/* ====================== */}

            <div className="home-buttons">
                <button onClick={handleNewBudget} className="btn btn-add">
                    <CalculatorIcon /> Novo Orçamento
                </button>

                <button onClick={() => setCurrentPage('saved')} className="btn btn-secondary">
                    <ArchiveIcon /> Orçamentos Salvos
                </button>

                <button onClick={() => setCurrentPage('materials')} className="btn btn-secondary">
                    <MaterialsIcon /> Cadastrar Materiais
                </button>
                
                <button onClick={() => setCurrentPage('commissions')} className="btn btn-secondary">
                    <CashIcon /> Comissões
                </button>
            </div>
        </div>
    );
};

export default HomePage;