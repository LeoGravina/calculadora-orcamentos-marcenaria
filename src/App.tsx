import React, { useState } from "react";
import { Toaster } from "react-hot-toast";


import { db } from "./config/firebase";

import HomePage from "./components/HomePage";
import BudgetCalculator from "./components/BudgetCalculator";
import SavedBudgets from "./components/SavedBudgets";
import Materials from "./components/Materials";
import Commissions from "./components/Commissions";

import logoDaEmpresa from "./assets/minha-logo.png";

const DADOS_DA_EMPRESA = {
  companyName: "MVMóveis",
  companyCnpj: "49.482.982/0001-94",
  companyEmail: "vmlrepresentacoesltda@yahoo.com.br",
  companyPhone: "(32) 9173-3610",
  companyAddress: "Rua Gumercino Campos, n° 121",
  companyCityStateZip: "Ubá, MG - 36.501-272",
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<any>("home");
  const [budgetToEdit, setBudgetToEdit] = useState<any>(null);

  const handleNewBudget = () => {
    setBudgetToEdit(null);
    setCurrentPage("calculator");
  };

  const handleEditBudget = (budget: any) => {
    setBudgetToEdit(budget);
    setCurrentPage("calculator");
  };

  const handleDuplicateBudget = (budget: any) => {
    const budgetCopy = { ...budget, isDuplicate: true };
    delete budgetCopy.id;
    setBudgetToEdit(budgetCopy);
    setCurrentPage("calculator");
  };

  const clearEditingBudget = () => {
    setBudgetToEdit(null);
  };

  const renderPage = () => {
        switch (currentPage) {
            case 'calculator':
                return <BudgetCalculator 
                            setCurrentPage={setCurrentPage as any} 
                            budgetToEdit={budgetToEdit} 
                            clearEditingBudget={clearEditingBudget as any} 
                            db={db} 
                            DADOS_DA_EMPRESA={DADOS_DA_EMPRESA} 
                            logoDaEmpresa={logoDaEmpresa} 
                        />;
            case 'saved':
                return <SavedBudgets 
                            setCurrentPage={setCurrentPage as any} 
                            handleEditBudget={handleEditBudget as any} 
                            handleDuplicateBudget={handleDuplicateBudget as any} 
                            db={db} 
                            DADOS_DA_EMPRESA={DADOS_DA_EMPRESA} 
                            logoDaEmpresa={logoDaEmpresa} 
                        />;
            case 'materials':
                return <Materials setCurrentPage={setCurrentPage as any} db={db} />;
            case 'commissions':
                return <Commissions setCurrentPage={setCurrentPage as any} db={db} />;
            default:
                return <HomePage 
                            setCurrentPage={setCurrentPage as any} 
                            logoDaEmpresa={logoDaEmpresa} 
                            handleNewBudget={handleNewBudget as any} 
                            db={db} 
                        />;
        }
    };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10 antialiased text-gray-900 selection:bg-amber-200 selection:text-amber-900">
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{ className: "font-bold rounded-xl shadow-lg" }}
      />
      {renderPage()}
    </div>
  );
}