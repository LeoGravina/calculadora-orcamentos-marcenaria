import React, { useState } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';

// Importação dos componentes
import HomePage from './components/HomePage';
import BudgetCalculator from './components/BudgetCalculator';
import SavedBudgets from './components/SavedBudgets';
import Materials from './components/Materials'
import Commissions from './components/Commissions'; 

import './App.css'; 
import logoDaEmpresa from './minha-logo.png';

// --- CONFIGURAÇÃO SEGURA DO FIREBASE ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DADOS FIXOS DA EMPRESA ---
const DADOS_DA_EMPRESA = {
    companyName: 'MVMóveis',
    companyCnpj: '49.482.982/0001-94',
    companyEmail: 'vmlrepresentacoesltda@yahoo.com.br',
    companyPhone: '(32) 9173-3610',
    companyAddress: 'Rua Gumercino Campos,n° 121',
    companyCityStateZip: 'Ubá, MG - 36.501-272'
};

export default function App() {
    const [currentPage, setCurrentPage] = useState('home');
    const [budgetToEdit, setBudgetToEdit] = useState(null);

    // --- FUNÇÃO PARA NOVO ORÇAMENTO (LIMPA DADOS ANTIGOS) ---
    const handleNewBudget = () => {
        setBudgetToEdit(null); // <--- O SEGREDO ESTÁ AQUI: Limpa qualquer edição pendente
        setCurrentPage('calculator');
    };

    const handleEditBudget = (budget) => {
        setBudgetToEdit(budget);
        setCurrentPage('calculator');
    };

    const handleDuplicateBudget = (budget) => {
        const budgetCopy = { ...budget, isDuplicate: true };
        delete budgetCopy.id; 
        setBudgetToEdit(budgetCopy);
        setCurrentPage('calculator');
    };

    const clearEditingBudget = () => {
        setBudgetToEdit(null);
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'calculator':
                return <BudgetCalculator
                    setCurrentPage={setCurrentPage}
                    budgetToEdit={budgetToEdit}
                    clearEditingBudget={clearEditingBudget}
                    db={db}
                    DADOS_DA_EMPRESA={DADOS_DA_EMPRESA}
                    logoDaEmpresa={logoDaEmpresa}
                />;
            case 'saved':
                return <SavedBudgets
                    setCurrentPage={setCurrentPage}
                    handleEditBudget={handleEditBudget}
                    handleDuplicateBudget={handleDuplicateBudget}
                    db={db}
                    DADOS_DA_EMPRESA={DADOS_DA_EMPRESA}
                    logoDaEmpresa={logoDaEmpresa}
                />;
            case 'materials':
                return <Materials
                    setCurrentPage={setCurrentPage}
                    db={db}
                />;
            case 'commissions':
                return <Commissions
                    setCurrentPage={setCurrentPage}
                    db={db}
                />;
            default:
                return <HomePage
                    setCurrentPage={setCurrentPage}
                    logoDaEmpresa={logoDaEmpresa}
                    handleNewBudget={handleNewBudget}
                    db={db}
                />;
        }
    };

    return (
        <div className="app-container">
            <Toaster position="top-center" reverseOrder={false} />
            {renderPage()}
        </div>
    );
}