// ARQUIVO COMPLETO PARA: src/App.js

import React, { useState } from 'react';

// Importações do Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

// Importação do Provedor de Notificações
import { Toaster } from 'react-hot-toast';

// Importação dos componentes e estilos
import HomePage from './components/HomePage';
import BudgetCalculator from './components/BudgetCalculator';
import SavedBudgets from './components/SavedBudgets';
import './App.css'; 

// Importação da logo
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
    companyCnpj: 'XX.XXX.XXX/0001-XX',
    companyEmail: 'mvmoveis@gmail.com',
    companyPhone: '(32) 99173-3610',
    companyAddress: 'Rua Gumercino Campos,n° 121',
    companyCityStateZip: 'Ubá, MG - 36.501-272'
};

export default function App() {
    const [currentPage, setCurrentPage] = useState('home');
    const [budgetToEdit, setBudgetToEdit] = useState(null);

    const handleEditBudget = (budget) => {
        setBudgetToEdit(budget);
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
                    db={db}
                    DADOS_DA_EMPRESA={DADOS_DA_EMPRESA}
                    logoDaEmpresa={logoDaEmpresa}
                />;
            default:
                return <HomePage
                    setCurrentPage={setCurrentPage}
                    logoDaEmpresa={logoDaEmpresa}
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