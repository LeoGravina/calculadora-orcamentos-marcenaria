// ARQUIVO COMPLETO E ATUALIZADO: src/utils/pdfGenerator.js

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './helpers';

const drawLabeledBox = (doc, label, value, x, y, boxWidth, boxHeight, options = {}) => {
    const {
        labelFontSize = 7,
        valueFontSize = 10,
        align = 'left',
        isBold = false
    } = options;

    const labelColor = '#888888';
    const valueColor = '#000000';
    const borderColor = '#CCCCCC';

    doc.setDrawColor(borderColor);
    doc.rect(x, y, boxWidth, boxHeight);

    doc.setFontSize(labelFontSize);
    doc.setTextColor(labelColor);
    doc.text(label, x + 2, y + 4);

    doc.setFontSize(valueFontSize);
    doc.setTextColor(valueColor);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');

    const splitValue = doc.splitTextToSize(String(value), boxWidth - 4);
    
    let textX;
    if (align === 'right') {
        textX = x + boxWidth - 2;
    } else if (align === 'center') {
        textX = x + boxWidth / 2;
    } else {
        textX = x + 2;
    }
    
    doc.text(splitValue, textX, y + 10, { align });
};


const generateBudgetPdf = (budget, companyInfo, companyLogo) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let cursorY = 15;
    const contentWidth = pageWidth - (margin * 2);

    // --- SEÇÃO 1: CABEÇALHO ---
    doc.addImage(companyLogo, 'PNG', margin, cursorY, 35, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(companyInfo.companyName.toUpperCase(), pageWidth - margin, cursorY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`CNPJ: ${companyInfo.companyCnpj}`, pageWidth - margin, cursorY + 11, { align: 'right' });
    doc.text(companyInfo.companyAddress, pageWidth - margin, cursorY + 16, { align: 'right' });
    doc.text(companyInfo.companyCityStateZip, pageWidth - margin, cursorY + 21, { align: 'right' });
    doc.text(`Contato: ${companyInfo.companyPhone}`, pageWidth - margin, cursorY + 26, { align: 'right' });
    doc.text(`Email: ${companyInfo.companyEmail}`, pageWidth - margin, cursorY + 31, { align: 'right' });
    cursorY += 40;

    // --- SEÇÃO 2: DADOS DO ORÇAMENTO (em caixas) ---
    const budgetDate = new Date(budget.createdAt);
    const validUntilDate = new Date(budgetDate);
    validUntilDate.setDate(budgetDate.getDate() + 15);
    const boxWidthThird = contentWidth / 3 - 2;
    
    drawLabeledBox(doc, 'ORÇAMENTO Nº', budget.budgetId, margin, cursorY, boxWidthThird, 15);
    drawLabeledBox(doc, 'EMITIDO EM', budgetDate.toLocaleDateString('pt-BR'), margin + boxWidthThird + 3, cursorY, boxWidthThird, 15);
    drawLabeledBox(doc, 'VÁLIDO ATÉ', validUntilDate.toLocaleDateString('pt-BR'), margin + (boxWidthThird * 2) + 6, cursorY, boxWidthThird, 15);
    cursorY += 20;

    // --- SEÇÃO 3: DADOS DO CLIENTE (em caixas) ---
    doc.setFillColor('#F2F2F2');
    doc.rect(margin, cursorY, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#333333');
    doc.text('DADOS DO CLIENTE', margin + 2, cursorY + 5);
    cursorY += 7;
    const boxWidthHalf = contentWidth / 2 - 1.5;
    drawLabeledBox(doc, 'CLIENTE', budget.clientName, margin, cursorY, contentWidth, 15);
    cursorY += 15;
    drawLabeledBox(doc, 'TELEFONE', budget.clientPhone, margin, cursorY, boxWidthHalf, 15);
    drawLabeledBox(doc, 'PROJETO', budget.projectName, margin + boxWidthHalf + 3, cursorY, boxWidthHalf, 15);
    cursorY += 20;

    // --- SEÇÃO 4: TABELA DE ITENS ---
    doc.setFillColor('#F2F2F2');
    doc.rect(margin, cursorY, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#333333');
    doc.text('DESCRIÇÃO DOS ITENS', margin + 2, cursorY + 5); // Título mais apropriado
    cursorY += 7;
    
    // CABEÇALHO SIMPLIFICADO: Removemos as colunas de preço
    const tableHead = [['ITEM', 'PRODUTO/SERVIÇO', 'QTD.']];
    const tableBody = [];
    let itemCounter = 1;

    // CORPO DA TABELA SIMPLIFICADO: Mostra apenas o que o item é, não quanto custa individualmente
    // Adicionamos todos os tipos de itens em uma única lista para um tratamento unificado
    const allItems = [
        ...budget.pieces.map(p => ({ desc: `${p.name} (${p.length}x${p.width}mm)`, qty: p.qty })),
        ...budget.borderTapes.map(t => ({ desc: `${t.name} (Acabamento de borda)`, qty: `(aprox. ${t.usedLength}m)` })),
        ...budget.unitItems.map(i => ({ desc: i.name, qty: i.qty })),
        ...budget.hardware.map(h => ({ desc: h.name, qty: h.usedQty }))
    ];

    allItems.forEach(item => {
        tableBody.push([
            String(itemCounter++).padStart(2, '0'),
            item.desc,
            item.qty
        ]);
    });

    autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: cursorY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: '#CCCCCC', lineWidth: 0.1, },
        headStyles: { fillColor: '#F2F2F2', textColor: '#333333', fontStyle: 'bold', halign: 'center', lineColor: '#CCCCCC' },
        // ESTILOS DE COLUNA ATUALIZADOS
        columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' }},
        margin: { left: margin, right: margin }
    });
    
    let finalY = doc.lastAutoTable.finalY + 5;
    
// --- SEÇÃO 5: TOTAIS (em caixas) ---
    // Lógica de fallback para garantir compatibilidade com orçamentos antigos
    const subTotalFinal = budget.finalBudgetPrice || budget.grandTotal;
    const descontoFinal = budget.finalDiscountAmount || budget.finalDiscount || 0;
    const totalFinal = budget.finalValue || budget.grandTotal;

    const discountLabel = `DESCONTO (${budget.discountPercentage || 0}%)`;

    // Caixa 1: O valor que seu pai digitou
    drawLabeledBox(doc, 'SUB-TOTAL', formatCurrency(subTotalFinal), margin, finalY, boxWidthThird, 15, { align: 'right' });
    
    // Caixa 2: O desconto calculado sobre o valor que seu pai digitou
    drawLabeledBox(doc, discountLabel, `- ${formatCurrency(descontoFinal)}`, margin + boxWidthThird + 3, finalY, boxWidthThird, 15, { align: 'right' });

    // Caixa 3: O valor final com desconto
    drawLabeledBox(doc, 'TOTAL GERAL', formatCurrency(totalFinal), margin + (boxWidthThird * 2) + 6, finalY, boxWidthThird, 15, { align: 'right', isBold: true });
    finalY += 20;

    // --- SEÇÃO 6: OBSERVAÇÕES E QR CODE ---
    const obsText = `${budget.description || ''}`;
    const qrCodeWidth = 40;
    const obsWidth = contentWidth - qrCodeWidth - 3;
    drawLabeledBox(doc, 'OBSERVAÇÕES', obsText, margin, finalY, obsWidth, 40, { valueFontSize: 8 });
    const qrX = margin + obsWidth + 3;
    doc.setDrawColor('#CCCCCC');
    doc.rect(qrX, finalY, qrCodeWidth, 40);
    if (budget.qrCodeImage) {
       doc.addImage(budget.qrCodeImage, 'PNG', qrX + 5, finalY + 5, 30, 30);
    }

    // --- SEÇÃO 7: ASSINATURAS ---
    const signatureY = doc.internal.pageSize.getHeight() - 25;
    doc.setDrawColor('#CCCCCC');
    doc.line(margin, signatureY, margin + 80, signatureY);
    doc.text(companyInfo.companyName, margin + 40, signatureY + 5, { align: 'center' });
    
    doc.line(pageWidth - margin - 80, signatureY, pageWidth - margin, signatureY);
    doc.text(budget.clientName, pageWidth - margin - 40, signatureY + 5, { align: 'center' });
    
    // --- SALVAR O ARQUIVO ---
    doc.save(`Orcamento_${budget.budgetId}_${budget.clientName.replace(/\s/g, '-')}.pdf`);
};

export default generateBudgetPdf;