// ============================================================================
//  Otimizador de Plano de Corte (estilo SketchCut)
//  - Agrupa peças pela chapa escolhida (sheetId) e otimiza cada material.
//  - Respeita o sentido do veio por peça (grainLock => não gira a peça).
//  - Numera as peças (legenda) e calcula sobras aproveitáveis + resumo.
// ============================================================================

// Sobra (offcut) só é considerada "aproveitável" a partir deste tamanho.
const MIN_OFFCUT = 100; // mm

// Normaliza dimensão da chapa para mm (catálogo guarda em mm,
// mas se vier em metros — ex.: 2.75 — converte automaticamente).
const normalizeSheetDim = (val: number): number => {
    if (val > 0 && val < 100) return val * 1000;
    return val;
};

// Otimiza o corte de UM material: recebe apenas as peças daquela chapa
// e o template da própria chapa escolhida. Abre quantas chapas iguais
// forem necessárias.
export const cuttingOptimizer = (pieces: any[], sheetTemplate: any, cuttingGap: number = 3) => {
    const sheetLength = normalizeSheetDim(parseFloat(String(sheetTemplate.length)));
    const sheetWidth = normalizeSheetDim(parseFloat(String(sheetTemplate.width)));

    if (!(sheetLength > 0) || !(sheetWidth > 0)) {
        return { usedSheets: [], error: `Chapa "${sheetTemplate.name}" está com dimensões inválidas.` };
    }

    const template = { ...sheetTemplate, length: sheetLength, width: sheetWidth };

    const piecesWithGap = pieces.map(p => {
        const width = parseFloat(String(p.width));
        const length = parseFloat(String(p.length));
        return {
            ...p,
            width,
            length,
            realWidth: width + cuttingGap,
            realLength: length + cuttingGap,
            area: (width + cuttingGap) * (length + cuttingGap),
            allowRotate: !p.grainLock,
        };
    });

    // Maiores primeiro (melhor empacotamento)
    const sortedPieces = piecesWithGap.sort((a, b) => b.area - a.area);
    const usedSheets: any[] = [];

    for (const piece of sortedPieces) {
        let placed = false;

        // 1. Tenta encaixar nas chapas já abertas desse mesmo material
        for (const sheet of usedSheets) {
            if (fitPieceInSheet(sheet, piece)) {
                placed = true;
                break;
            }
        }

        // 2. Se não coube, abre uma nova chapa do mesmo template
        if (!placed) {
            const newSheet = createNewSheet(template);
            if (fitPieceInSheet(newSheet, piece)) {
                usedSheets.push(newSheet);
                placed = true;
            }
        }

        if (!placed) {
            return {
                usedSheets: [],
                error: `Peça "${piece.name}" (${piece.length}x${piece.width}mm) não cabe na chapa ${template.name} (${template.length}x${template.width}mm)${piece.grainLock ? ' com o veio travado' : ''}.`
            };
        }
    }

    // Estatísticas e sobras aproveitáveis por chapa
    usedSheets.forEach(sheet => {
        const usedArea = sheet.pieces.reduce((acc: number, p: any) => acc + (p.length * p.width), 0);
        const sheetTotalArea = sheet.displayLength * sheet.displayWidth;
        sheet.usedArea = usedArea;
        sheet.sheetArea = sheetTotalArea;
        sheet.efficiency = ((usedArea / sheetTotalArea) * 100).toFixed(1);
        sheet.offcuts = sheet.freeRects.filter((r: any) => r.w >= MIN_OFFCUT && r.h >= MIN_OFFCUT);
    });

    return { usedSheets };
};

// Gera o plano completo: agrupa as peças pela chapa escolhida (sheetId),
// otimiza cada material, e devolve { usedSheets, legend, summary }.
export const generateCuttingPlan = (pieces: any[], sheets: any[], cuttingGap: number = 3) => {
    const sheetById: Record<string, any> = {};
    sheets.forEach(s => { sheetById[s.id] = s; });

    const groups: Record<string, any[]> = {};
    const order: string[] = [];
    pieces.forEach(piece => {
        const key = String(piece.sheetId);
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(piece);
    });

    const allSheets: any[] = [];

    for (let i = 0; i < order.length; i++) {
        const sheetId = order[i];
        const template = sheetById[sheetId];
        if (!template) {
            return { usedSheets: [], legend: [], summary: [], error: `Existem peças sem chapa válida selecionada. Revise a "Chapa Destino" das peças.` };
        }
        const result = cuttingOptimizer(groups[sheetId], template, cuttingGap);
        if (result.error) return { usedSheets: [], legend: [], summary: [], error: result.error };
        result.usedSheets.forEach(s => { s.materialName = template.name; allSheets.push(s); });
    }

    // Numeração das peças (legenda): peças idênticas (mesma part id) compartilham o número
    const legendMap: Record<string, any> = {};
    let nextLabel = 1;
    allSheets.forEach(sheet => {
        sheet.pieces.forEach((p: any) => {
            const partKey = String(p.id);
            if (!legendMap[partKey]) {
                legendMap[partKey] = {
                    label: nextLabel++,
                    name: p.name,
                    length: p.length,
                    width: p.width,
                    material: sheet.materialName,
                    qty: 0,
                    grainLock: !!p.grainLock,
                    edges: { L1: !!p.bandL1, L2: !!p.bandL2, W1: !!p.bandW1, W2: !!p.bandW2 },
                };
            }
            legendMap[partKey].qty += 1;
            p.label = legendMap[partKey].label;
        });
    });
    const legend = Object.keys(legendMap).map(k => legendMap[k]).sort((a, b) => a.label - b.label);

    // Sequência de corte por chapa (tira a tira: cima→baixo, esquerda→direita)
    allSheets.forEach(sheet => {
        const ordered = [...sheet.pieces].sort((a: any, b: any) => (a.y - b.y) || (a.x - b.x));
        ordered.forEach((p: any, i: number) => { p.seq = i + 1; });
    });

    // Resumo por material
    const summaryMap: Record<string, any> = {};
    allSheets.forEach(sheet => {
        const key = sheet.materialName;
        if (!summaryMap[key]) {
            summaryMap[key] = { material: key, sheetCount: 0, usedArea: 0, sheetArea: 0, offcutArea: 0 };
        }
        const s = summaryMap[key];
        s.sheetCount += 1;
        s.usedArea += sheet.usedArea;
        s.sheetArea += sheet.sheetArea;
        s.offcutArea += sheet.offcuts.reduce((acc: number, r: any) => acc + (r.w * r.h), 0);
    });
    const summary = Object.keys(summaryMap).map(k => {
        const s = summaryMap[k];
        return {
            ...s,
            efficiency: s.sheetArea > 0 ? ((s.usedArea / s.sheetArea) * 100).toFixed(1) : '0.0',
            usedAreaM2: (s.usedArea / 1_000_000),
            sheetAreaM2: (s.sheetArea / 1_000_000),
            offcutAreaM2: (s.offcutArea / 1_000_000),
        };
    });

    // Metros de fita de borda (uma instância por peça posicionada)
    let edgeBandingMm = 0;
    allSheets.forEach(sheet => {
        sheet.pieces.forEach((p: any) => {
            if (p.bandL1) edgeBandingMm += p.length;
            if (p.bandL2) edgeBandingMm += p.length;
            if (p.bandW1) edgeBandingMm += p.width;
            if (p.bandW2) edgeBandingMm += p.width;
        });
    });

    return {
        usedSheets: allSheets,
        legend,
        summary,
        totals: {
            sheetCount: allSheets.length,
            pieceCount: allSheets.reduce((acc, s) => acc + s.pieces.length, 0),
            edgeBandingMeters: edgeBandingMm / 1000,
        }
    };
};

// ── Reflow manual: fixa uma peça onde foi solta e reacomoda só as que
//    ocupavam aquele espaço, deixando as demais paradas. Retorna o novo
//    array de peças, ou null se as deslocadas não couberem em lugar nenhum.
export const repackSheetAround = (sheet: any, fixedId: string): { pieces: any[]; offcuts: any[] } | null => {
    const pieces = sheet.pieces;
    const fixed = pieces.find((p: any) => p.uniqueId === fixedId);
    if (!fixed) return null;

    const gap = Math.max(0, (fixed.realLength ?? fixed.length) - fixed.length) || 0;
    const footprint = (p: any, rotated: boolean) => ({
        w: (rotated ? p.width : p.length) + gap,
        h: (rotated ? p.length : p.width) + gap,
    });
    const usedRect = (p: any) => { const f = footprint(p, !!p.rotated); return { x: p.x, y: p.y, w: f.w, h: f.h }; };
    const intersects = (a: any, b: any) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const fixedRect = usedRect(fixed);
    const others = pieces.filter((p: any) => p.uniqueId !== fixedId);
    const toPlace: any[] = [];
    const obstacles: any[] = [fixedRect];
    others.forEach((p: any) => {
        if (intersects(usedRect(p), fixedRect)) toPlace.push(p);
        else obstacles.push(usedRect(p));
    });

    let freeRects: any[] = [{ x: 0, y: 0, w: sheet.width, h: sheet.height }];
    obstacles.forEach(o => { freeRects = subtractRect(freeRects, o); });

    const sorted = [...toPlace].sort((a, b) => (b.length * b.width) - (a.length * a.width));
    const placedResult: any[] = [];

    for (const p of sorted) {
        let best: any = null;
        for (let i = 0; i < freeRects.length; i++) {
            const r = freeRects[i];
            const f0 = footprint(p, false);
            if (f0.w <= r.w && f0.h <= r.h) {
                const score = Math.min(r.w - f0.w, r.h - f0.h);
                if (!best || score < best.score) best = { score, x: r.x, y: r.y, rotated: false, w: f0.w, h: f0.h };
            }
            if (!p.grainLock) {
                const f1 = footprint(p, true);
                if (f1.w <= r.w && f1.h <= r.h) {
                    const score = Math.min(r.w - f1.w, r.h - f1.h);
                    if (!best || score < best.score) best = { score, x: r.x, y: r.y, rotated: true, w: f1.w, h: f1.h };
                }
            }
        }
        if (!best) return null; // não coube em lugar nenhum

        placedResult.push({
            ...p,
            x: best.x, y: best.y, rotated: best.rotated,
            placedLength: best.rotated ? p.width : p.length,
            placedWidth: best.rotated ? p.length : p.width,
        });
        freeRects = subtractRect(freeRects, { x: best.x, y: best.y, w: best.w, h: best.h });
    }

    const byId: Record<string, any> = {};
    others.forEach((p: any) => { byId[p.uniqueId] = p; });        // mantidas
    placedResult.forEach((p: any) => { byId[p.uniqueId] = p; });  // reacomodadas
    byId[fixed.uniqueId] = fixed;                                  // fixa

    const newPieces = pieces.map((p: any) => byId[p.uniqueId]);

    // Recalcula a sequência de corte com o novo arranjo
    const seqById: Record<string, number> = {};
    [...newPieces].sort((a, b) => (a.y - b.y) || (a.x - b.x)).forEach((p, i) => { seqById[p.uniqueId] = i + 1; });

    // Sobras aproveitáveis = espaço livre restante
    const offcuts = freeRects.filter(r => r.w >= MIN_OFFCUT && r.h >= MIN_OFFCUT);

    return {
        pieces: newPieces.map((p: any) => ({ ...p, seq: seqById[p.uniqueId] })),
        offcuts,
    };
};

// Subtrai um retângulo "used" de uma lista de retângulos livres (estilo MaxRects).
function subtractRect(freeRects: any[], used: any): any[] {
    const out: any[] = [];
    for (const fr of freeRects) {
        const overlap = used.x < fr.x + fr.w && used.x + used.w > fr.x && used.y < fr.y + fr.h && used.y + used.h > fr.y;
        if (!overlap) { out.push(fr); continue; }
        if (used.x > fr.x) out.push({ x: fr.x, y: fr.y, w: used.x - fr.x, h: fr.h });
        if (used.x + used.w < fr.x + fr.w) out.push({ x: used.x + used.w, y: fr.y, w: (fr.x + fr.w) - (used.x + used.w), h: fr.h });
        if (used.y > fr.y) out.push({ x: fr.x, y: fr.y, w: fr.w, h: used.y - fr.y });
        if (used.y + used.h < fr.y + fr.h) out.push({ x: fr.x, y: used.y + used.h, w: fr.w, h: (fr.y + fr.h) - (used.y + used.h) });
    }
    return pruneRects(out.filter(r => r.w > 0.001 && r.h > 0.001));
}

// Remove retângulos contidos em outros.
function pruneRects(rects: any[]): any[] {
    return rects.filter((r, i) => !rects.some((o, j) =>
        i !== j &&
        o.x <= r.x && o.y <= r.y && o.x + o.w >= r.x + r.w && o.y + o.h >= r.y + r.h &&
        (o.w * o.h > r.w * r.h || j < i)
    ));
}

function createNewSheet(template: any) {
    return {
        id: crypto.randomUUID(),
        name: template.name,
        materialName: template.name,
        displayLength: template.length,
        displayWidth: template.width,
        width: template.length,  // eixo X do canvas (comprimento na horizontal)
        height: template.width,  // eixo Y do canvas (largura na vertical)
        pieces: [] as any[],
        freeRects: [{ x: 0, y: 0, w: template.length, h: template.width }]
    };
}

function fitPieceInSheet(sheet: any, piece: any) {
    let bestRectIndex = -1;
    let bestFitScore = Number.MAX_VALUE;
    let bestRotated = false;

    for (let i = 0; i < sheet.freeRects.length; i++) {
        const rect = sheet.freeRects[i];

        // Peça na orientação original (veio acompanha o comprimento)
        if (piece.realLength <= rect.w && piece.realWidth <= rect.h) {
            const waste = (rect.w * rect.h) - (piece.realLength * piece.realWidth);
            if (waste < bestFitScore) {
                bestFitScore = waste;
                bestRectIndex = i;
                bestRotated = false;
            }
        }

        // Peça girada 90° — só se o veio NÃO estiver travado
        if (piece.allowRotate && piece.realWidth <= rect.w && piece.realLength <= rect.h) {
            const waste = (rect.w * rect.h) - (piece.realWidth * piece.realLength);
            if (waste < bestFitScore) {
                bestFitScore = waste;
                bestRectIndex = i;
                bestRotated = true;
            }
        }
    }

    if (bestRectIndex === -1) return false;

    const rect = sheet.freeRects[bestRectIndex];
    const placedW = bestRotated ? piece.realWidth : piece.realLength;
    const placedH = bestRotated ? piece.realLength : piece.realWidth;

    sheet.pieces.push({
        ...piece,
        x: rect.x,
        y: rect.y,
        placedLength: bestRotated ? piece.width : piece.length,
        placedWidth: bestRotated ? piece.length : piece.width,
        rotated: bestRotated
    });

    // Divisão guillotine: duas opções de corte, escolhe a que deixa o maior retângulo livre
    const freeRight1 = { x: rect.x + placedW, y: rect.y, w: rect.w - placedW, h: rect.h };
    const freeBottom1 = { x: rect.x, y: rect.y + placedH, w: placedW, h: rect.h - placedH };

    const freeRight2 = { x: rect.x + placedW, y: rect.y, w: rect.w - placedW, h: placedH };
    const freeBottom2 = { x: rect.x, y: rect.y + placedH, w: rect.w, h: rect.h - placedH };

    const bigArea1 = Math.max(freeRight1.w * freeRight1.h, freeBottom1.w * freeBottom1.h);
    const bigArea2 = Math.max(freeRight2.w * freeRight2.h, freeBottom2.w * freeBottom2.h);

    sheet.freeRects.splice(bestRectIndex, 1);

    if (bigArea1 >= bigArea2) {
        if (freeRight1.w > 0 && freeRight1.h > 0) sheet.freeRects.push(freeRight1);
        if (freeBottom1.w > 0 && freeBottom1.h > 0) sheet.freeRects.push(freeBottom1);
    } else {
        if (freeRight2.w > 0 && freeRight2.h > 0) sheet.freeRects.push(freeRight2);
        if (freeBottom2.w > 0 && freeBottom2.h > 0) sheet.freeRects.push(freeBottom2);
    }

    return true;
}
