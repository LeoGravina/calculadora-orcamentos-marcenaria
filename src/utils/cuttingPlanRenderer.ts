// ============================================================================
//  Renderer compartilhado de uma chapa do plano de corte.
//  Desenha em coordenadas-mm a partir de (0,0). Quem chama controla a escala
//  (canvas interativo aplica transform; o PDF usa escala fixa).
// ============================================================================

export const SHEET_COLORS = {
    sheetBg: '#ffffff',
    waste: '#f1f5f9',
    sheetBorder: '#334155',
    offcutFill: '#dcfce7',
    offcutBorder: '#86efac',
    offcutText: '#15803d',
    pieceBorder: '#1e293b',
    pieceText: '#0f172a',
    banding: '#f97316',
};

// Cor estável por número da peça (peças iguais => mesma cor)
export const colorForLabel = (label: number): string => {
    const hue = (label * 53) % 360;
    return `hsl(${hue}, 70%, 82%)`;
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

interface DrawOptions {
    showDims?: boolean;
    showLabels?: boolean;
    showCutOrder?: boolean;
    selectedId?: string | null;
}

// Desenha a chapa inteira em (0,0). ctx já deve estar transladado/escalado.
export const drawSheet = (ctx: CanvasRenderingContext2D, sheet: any, opts: DrawOptions = {}) => {
    const { showDims = true, showLabels = true, showCutOrder = false, selectedId = null } = opts;

    // Fundo da chapa (área de desperdício como base)
    ctx.fillStyle = SHEET_COLORS.waste;
    ctx.fillRect(0, 0, sheet.width, sheet.height);

    // Sobras aproveitáveis
    (sheet.offcuts || []).forEach((r: any) => {
        ctx.fillStyle = SHEET_COLORS.offcutFill;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = SHEET_COLORS.offcutBorder;
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.setLineDash([]);

        const f = clamp(Math.min(r.w, r.h) * 0.18, 22, 70);
        if (r.w > f * 3 && r.h > f * 1.5) {
            ctx.fillStyle = SHEET_COLORS.offcutText;
            ctx.font = `bold ${f}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`sobra ${Math.round(r.w)}x${Math.round(r.h)}`, r.x + r.w / 2, r.y + r.h / 2);
        }
    });

    // Peças
    (sheet.pieces || []).forEach((piece: any) => {
        const px = piece.x;
        const py = piece.y;
        const pw = piece.placedLength;
        const ph = piece.placedWidth;

        ctx.fillStyle = colorForLabel(piece.label || 1);
        ctx.fillRect(px, py, pw, ph);

        const isSelected = selectedId != null && piece.uniqueId === selectedId;
        ctx.strokeStyle = isSelected ? '#2563eb' : SHEET_COLORS.pieceBorder;
        ctx.lineWidth = isSelected ? 6 : 2;
        ctx.strokeRect(px, py, pw, ph);

        drawBanding(ctx, piece, px, py, pw, ph);

        // Selo de sequência de corte (canto superior direito)
        if (showCutOrder && piece.seq) {
            const badge = clamp(Math.min(pw, ph) * 0.22, 28, 90);
            const bx = px + pw - badge * 0.55;
            const by = py + badge * 0.55;
            ctx.beginPath();
            ctx.arc(bx, by, badge * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#dc2626';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${badge * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(piece.seq), bx, by + badge * 0.04);
        }

        // Textos da peça
        const numberFont = clamp(Math.min(pw, ph) * 0.32, 26, 150);
        if (pw > numberFont * 1.2 && ph > numberFont * 1.2) {
            const cx = px + pw / 2;
            const cy = py + ph / 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (showLabels) {
                ctx.fillStyle = SHEET_COLORS.pieceText;
                ctx.font = `bold ${numberFont}px Arial`;
                ctx.fillText(String(piece.label || ''), cx, cy);
            }

            if (showDims) {
                const dimFont = clamp(numberFont * 0.42, 18, 60);
                ctx.font = `${dimFont}px Arial`;
                ctx.fillStyle = '#475569';
                ctx.fillText(`${Math.round(piece.placedLength)} x ${Math.round(piece.placedWidth)}`, cx, cy + numberFont * 0.75);
            }

            if (piece.rotated) {
                const rf = clamp(numberFont * 0.5, 18, 60);
                ctx.font = `${rf}px Arial`;
                ctx.fillStyle = '#b91c1c';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText('↻', px + rf * 0.4, py + rf * 0.3);
            }
        }
    });

    // Borda externa da chapa
    ctx.strokeStyle = SHEET_COLORS.sheetBorder;
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, sheet.width, sheet.height);
};

// Fita de borda: linha laranja grossa nas arestas marcadas.
// Mapeamento depende da rotação (veio do comprimento).
function drawBanding(ctx: CanvasRenderingContext2D, piece: any, px: number, py: number, pw: number, ph: number) {
    const r = piece.rotated;
    // arestas em coords de tela: top, bottom, left, right
    const top = r ? piece.bandW1 : piece.bandL1;
    const bottom = r ? piece.bandW2 : piece.bandL2;
    const left = r ? piece.bandL1 : piece.bandW1;
    const right = r ? piece.bandL2 : piece.bandW2;

    const thickness = clamp(Math.min(pw, ph) * 0.06, 6, 22);
    ctx.fillStyle = SHEET_COLORS.banding;
    if (top) ctx.fillRect(px, py, pw, thickness);
    if (bottom) ctx.fillRect(px, py + ph - thickness, pw, thickness);
    if (left) ctx.fillRect(px, py, thickness, ph);
    if (right) ctx.fillRect(px + pw - thickness, py, thickness, ph);
}
