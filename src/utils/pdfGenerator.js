import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './helpers'; // Usando nossa função de helper

const generateBudgetPdf = (budget, companyInfo, companyLogo) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let cursorY = 20;

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
    cursorY += 45;

    // --- SEÇÃO 2: DADOS DO ORÇAMENTO (Nº, Data, Validade) ---
    const budgetDate = new Date(budget.createdAt);
    const validUntilDate = new Date(budgetDate);
    validUntilDate.setDate(budgetDate.getDate() + 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`ORÇAMENTO Nº ${budget.budgetId}`, margin, cursorY);
    doc.text(`EMITIDO EM: ${budgetDate.toLocaleDateString('pt-BR')}`, pageWidth / 2, cursorY, { align: 'center' });
    doc.text(`VÁLIDO ATÉ: ${validUntilDate.toLocaleDateString('pt-BR')}`, pageWidth - margin, cursorY, { align: 'right' });
    cursorY += 4;
    doc.setLineWidth(0.2);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 10;

    // --- SEÇÃO 3: DADOS DO CLIENTE ---
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, cursorY, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('DADOS DO CLIENTE', margin + 2, cursorY + 5.5);
    cursorY += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`CLIENTE: ${budget.clientName || 'Não informado'}`, margin, cursorY);
    doc.text(`TELEFONE: ${budget.clientPhone || 'Não informado'}`, pageWidth / 2, cursorY);
    cursorY += 6;
    doc.text(`PROJETO: ${budget.projectName || 'Não informado'}`, margin, cursorY);
    cursorY += 12;

    // --- SEÇÃO 4: TABELA DE ITENS ---
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, cursorY, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('ORÇAMENTO', margin + 2, cursorY + 5.5);
    cursorY += 8;

    const tableHead = [['ITEM', 'PRODUTO/SERVIÇO', 'QTD.', 'VALOR UNIT.', 'SUB-TOTAL']];
    const tableBody = [];
    let itemCounter = 1;

    budget.pieces.forEach(p => { tableBody.push([ String(itemCounter++).padStart(2, '0'), `${p.name} (${p.length}x${p.width}mm)`, p.qty, formatCurrency(p.totalCost / p.qty), formatCurrency(p.totalCost) ]); });
    budget.hardware.forEach(h => { tableBody.push([ String(itemCounter++).padStart(2, '0'), h.name, h.usedQty, formatCurrency(h.totalCost / h.usedQty), formatCurrency(h.totalCost) ]); });
    budget.borderTapes.forEach(t => { tableBody.push([ String(itemCounter++).padStart(2, '0'), `${t.name} (${t.usedLength}m)`, 1, formatCurrency(t.totalCost), formatCurrency(t.totalCost) ]); });

    autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: cursorY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [51, 51, 51], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' },
        },
    });

    let finalY = doc.lastAutoTable.finalY;

    // MELHORIA: Verifica se o conteúdo restante cabe na página, se não, adiciona uma nova.
    const remainingSpace = pageHeight - finalY;
    if (remainingSpace < 80) { // Se tiver menos de 8cm sobrando, vira a página
        doc.addPage();
        finalY = margin; // Reseta a posição inicial para a margem da nova página
    }

    // --- SEÇÃO 5: TOTAIS ---
    const totalsX = pageWidth - margin - 80;
    const valueX = pageWidth - margin;
    let totalsY = finalY + 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // MELHORIA: Detalhando os custos
    doc.text('Sub-total (Materiais):', totalsX, totalsY, { align: 'right' });
    doc.text(formatCurrency(budget.subtotal), valueX, totalsY, { align: 'right' });
    totalsY += 5;
    doc.text('Custo Ajudante:', totalsX, totalsY, { align: 'right' });
    doc.text(formatCurrency(budget.finalHelperCost), valueX, totalsY, { align: 'right' });
    totalsY += 5;
    doc.text('Frete:', totalsX, totalsY, { align: 'right' });
    doc.text(formatCurrency(budget.finalDeliveryFee), valueX, totalsY, { align: 'right' });
    totalsY += 5;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL GERAL:', totalsX, totalsY + 4, { align: 'right' });
    doc.text(formatCurrency(budget.grandTotal), valueX, totalsY + 4, { align: 'right' });

    cursorY = totalsY + 15;

    // --- SEÇÃO 6: OBSERVAÇÕES ---
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, cursorY, pageWidth - (margin * 2), 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('OBSERVAÇÕES', margin + 2, cursorY + 5.5);
    cursorY += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.rect(margin, cursorY, pageWidth - (margin * 2), 30, 'S');
    cursorY += 5;

    const obsText = `Forma de Pagamento: A combinar.\n${budget.description || ''}`;
    const splitDescription = doc.splitTextToSize(obsText, pageWidth - (margin * 2) - 4);
    doc.text(splitDescription, margin + 2, cursorY);

    // --- SEÇÃO 7: RODAPÉ E ASSINATURAS ---
    const signatureY = pageHeight - 30;
    doc.setLineWidth(0.5);
    doc.line(margin, signatureY, margin + 70, signatureY);
    doc.text(companyInfo.companyName, margin + 35, signatureY + 5, { align: 'center' });
    doc.line(pageWidth - margin - 70, signatureY, pageWidth - margin, signatureY);
    doc.text(budget.clientName, pageWidth - margin - 35, signatureY + 5, { align: 'center' });

    // --- SALVAR O ARQUIVO ---
    doc.save(`Orcamento_${budget.budgetId}_${budget.clientName.replace(/\s/g, '-')}.pdf`);
};

export default generateBudgetPdf;