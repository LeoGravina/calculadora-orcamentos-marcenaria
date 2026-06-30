import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { drawSheet } from './cuttingPlanRenderer';

interface PlanPdfOptions { showCutOrder?: boolean; }

// Renderiza uma chapa para imagem PNG (canvas offscreen)
const sheetToImage = (sheet: any, opts: PlanPdfOptions, targetWidthPx = 1100) => {
    const scale = targetWidthPx / sheet.width;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sheet.width * scale));
    canvas.height = Math.max(1, Math.round(sheet.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return { dataUrl: '', w: canvas.width, h: canvas.height };
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    drawSheet(ctx, sheet, { showCutOrder: opts.showCutOrder });
    return { dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
};

const edgesLabel = (e: any) => {
    if (!e) return '—';
    const marks: string[] = [];
    if (e.L1) marks.push('C1');
    if (e.L2) marks.push('C2');
    if (e.W1) marks.push('L1');
    if (e.W2) marks.push('L2');
    return marks.length ? marks.join(' ') : '—';
};

interface PlanMeta { projectName?: string; clientName?: string; budgetId?: string; }

// Constrói o documento (sem salvar) — permite salvar OU compartilhar (blob).
export const buildCuttingPlanDoc = (plan: any, meta: PlanMeta = {}, opts: PlanPdfOptions = {}): jsPDF | null => {
    if (!plan || !plan.usedSheets || plan.usedSheets.length === 0) return null;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentW = pageW - margin * 2;
    let y = 14;

    // Cabeçalho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor('#0f172a');
    doc.text('Plano de Corte', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#475569');
    const sub = [
        meta.budgetId ? `Orçamento #${meta.budgetId}` : '',
        meta.clientName || '',
        meta.projectName || ''
    ].filter(Boolean).join('  •  ');
    if (sub) { doc.text(sub, margin, y + 5); }
    y += 12;

    // Resumo por material
    if (plan.summary && plan.summary.length) {
        autoTable(doc, {
            startY: y,
            head: [['Material', 'Chapas', 'Aproveitamento', 'Sobra (m²)']],
            body: plan.summary.map((s: any) => [
                s.material,
                String(s.sheetCount),
                `${s.efficiency}%`,
                s.offcutAreaM2.toFixed(2)
            ]),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.8 },
            headStyles: { fillColor: '#1e293b', textColor: '#ffffff', fontStyle: 'bold' },
            margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // Legenda das peças
    if (plan.legend && plan.legend.length) {
        autoTable(doc, {
            startY: y,
            head: [['Nº', 'Peça', 'Medida (mm)', 'Qtd', 'Veio', 'Fita de borda', 'Material']],
            body: plan.legend.map((l: any) => [
                String(l.label),
                l.name,
                `${l.length} x ${l.width}`,
                String(l.qty),
                l.grainLock ? 'Travado' : 'Livre',
                edgesLabel(l.edges),
                l.material
            ]),
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 1.6 },
            headStyles: { fillColor: '#334155', textColor: '#ffffff', fontStyle: 'bold' },
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'center', cellWidth: 12 } },
            margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Uma imagem por chapa
    plan.usedSheets.forEach((sheet: any, idx: number) => {
        const img = sheetToImage(sheet, opts);
        const aspect = img.h / img.w;
        let drawW = contentW;
        let drawH = drawW * aspect;
        const maxH = pageH - margin - 14; // espaço pro título da chapa

        // Quebra de página se não couber
        if (y + 8 + Math.min(drawH, maxH) > pageH - margin) {
            doc.addPage();
            y = 14;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor('#0f172a');
        doc.text(`Chapa ${idx + 1} de ${plan.usedSheets.length} — ${sheet.materialName} (${Math.round(sheet.displayLength)}x${Math.round(sheet.displayWidth)}mm) — ${sheet.efficiency}% aproveitado`, margin, y);
        y += 4;

        if (drawH > maxH) { drawH = maxH; drawW = drawH / aspect; }
        if (img.dataUrl) doc.addImage(img.dataUrl, 'PNG', margin, y, drawW, drawH);
        y += drawH + 8;
    });

    return doc;
};

export const cuttingPlanFileName = (meta: PlanMeta = {}) =>
    `Plano_Corte_${meta.budgetId || ''}_${(meta.clientName || 'projeto').replace(/\s+/g, '-')}.pdf`;

const generateCuttingPlanPdf = (plan: any, meta: PlanMeta = {}, opts: PlanPdfOptions = {}) => {
    const doc = buildCuttingPlanDoc(plan, meta, opts);
    if (doc) doc.save(cuttingPlanFileName(meta));
};

export default generateCuttingPlanPdf;
