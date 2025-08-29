import React from 'react';
import { CalculatorIcon, ArchiveIcon } from './icons'; // Importa os ícones do novo arquivo

const HomePage = ({ setCurrentPage, logoDaEmpresa }) => {
    return (
        <div className="home-container">
            <img src={logoDaEmpresa} alt="Logo da Empresa" className="app-logo" />
            <h1>Calculadora de Orçamentos</h1>
            <p>Marcenaria MVMoveis</p>
            <div className="home-buttons">
                <button onClick={() => setCurrentPage('calculator')} className="btn btn-add">
                    <CalculatorIcon /> Novo Orçamento
                </button>
                <button onClick={() => setCurrentPage('saved')} className="btn btn-secondary">
                    <ArchiveIcon /> Orçamentos Salvos
                </button>
            </div>
        </div>
    );
};

export default HomePage;