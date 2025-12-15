// src/utils/cuttingOptimizer.js

export const cuttingOptimizer = (pieces, sheets, cuttingGap = 3) => {
    // 1. Preparação: Sanitiza e ordena as peças (da maior área para a menor)
    // Isso é o clássico "Best Fit Decreasing": colocar as peças grandes primeiro é mais eficiente.
    const piecesWithGap = pieces.map(p => ({
        ...p,
        width: parseFloat(p.width),
        length: parseFloat(p.length),
        // Adicionamos a folga apenas no cálculo de ocupação, não na medida exibida
        realWidth: parseFloat(p.width) + cuttingGap,
        realLength: parseFloat(p.length) + cuttingGap,
        area: (parseFloat(p.width) + cuttingGap) * (parseFloat(p.length) + cuttingGap),
    }));

    // Ordena decrescente por área (pode testar por maior lado também: b.realLength - a.realLength)
    const sortedPieces = piecesWithGap.sort((a, b) => b.area - a.area);

    const usedSheets = [];
    let totalUsedArea = 0;
    let totalSheetArea = 0;

    // Função interna para clonar espaços livres (evita bugs de referência)
    const cloneSpaces = (spaces) => spaces.map(s => ({ ...s }));

    // 2. Loop principal de alocação
    for (const piece of sortedPieces) {
        let placed = false;

        // Tenta encaixar nas chapas já abertas
        for (const sheet of usedSheets) {
            if (fitPieceInSheet(sheet, piece)) {
                placed = true;
                break;
            }
        }

        // Se não coube, abre nova chapa
        if (!placed) {
            let bestSheetOption = null;

            // Procura o melhor tamanho de chapa disponível no estoque (template)
            for (const template of sheets) {
                // Testa chapa deitada
                const sheetArea = template.length * template.width;
                
                // Cria uma chapa virtual para teste
                const testSheet = createNewSheet(template, false); 
                if (fitPieceInSheet(testSheet, piece, true)) { // true = apenas teste
                     if (!bestSheetOption || sheetArea < bestSheetOption.area) {
                        bestSheetOption = { template, rotated: false, area: sheetArea };
                    }
                }

                // Testa chapa em pé (se não for quadrada)
                if (template.length !== template.width) {
                    const testSheetRotated = createNewSheet(template, true);
                    if (fitPieceInSheet(testSheetRotated, piece, true)) {
                        if (!bestSheetOption || sheetArea < bestSheetOption.area) { // Preferência por menor área de chapa
                            bestSheetOption = { template, rotated: true, area: sheetArea };
                        }
                    }
                }
            }

            if (bestSheetOption) {
                const newSheet = createNewSheet(bestSheetOption.template, bestSheetOption.rotated);
                fitPieceInSheet(newSheet, piece); // Agora insere de verdade
                usedSheets.push(newSheet);
                totalSheetArea += newSheet.width * newSheet.height; // width/height visuais
                placed = true;
            }
        }

        if (!placed) {
            return { usedSheets: [], error: `Peça gigante: "${piece.name}" (${piece.length}x${piece.width}) não cabe em nenhuma chapa.` };
        }
    }
    
    // Cálculo de eficiência final
    usedSheets.forEach(sheet => {
        const usedArea = sheet.pieces.reduce((acc, p) => acc + (p.originalLength * p.originalWidth), 0);
        const sheetTotalArea = sheet.displayLength * sheet.displayWidth;
        sheet.efficiency = ((usedArea / sheetTotalArea) * 100).toFixed(1);
    });

    return { usedSheets };
};

// Cria a estrutura de uma nova chapa
function createNewSheet(template, rotated) {
    const width = rotated ? template.length : template.width;
    const height = rotated ? template.width : template.length; // Invertido para lógica interna X/Y
    
    // NOTA: Na lógica de canvas e corte, geralmente:
    // Comprimento (Length) = X (Horizontal)
    // Largura (Width) = Y (Vertical)
    // Vamos padronizar: width=EixoX, height=EixoY
    
    return {
        id: crypto.randomUUID(),
        name: template.name + (rotated ? ' (Em pé)' : ''),
        // Dimensões físicas para o desenho
        displayLength: template.length, 
        displayWidth: template.width,
        // Dimensões lógicas para o algoritmo (rotacionadas se necessário)
        width: rotated ? template.width : template.length,  // EIXO X
        height: rotated ? template.length : template.width, // EIXO Y
        pieces: [],
        freeRects: [{ x: 0, y: 0, w: rotated ? template.width : template.length, h: rotated ? template.length : template.width }]
    };
}

// Tenta encaixar a peça usando a heurística "Best Area Fit"
function fitPieceInSheet(sheet, piece, testOnly = false) {
    let bestRectIndex = -1;
    let bestFitScore = Number.MAX_VALUE; // Menor é melhor (menos desperdício imediato)
    let bestRotated = false;

    // Percorre todos os retângulos livres da chapa
    for (let i = 0; i < sheet.freeRects.length; i++) {
        const rect = sheet.freeRects[i];

        // Opção A: Peça normal
        if (piece.realLength <= rect.w && piece.realWidth <= rect.h) {
            const waste = (rect.w * rect.h) - (piece.realLength * piece.realWidth);
            // Heurística: Tentar deixar o retângulo restante MENOR (Best Short Side Fit) ou MAIOR?
            // "Best Area Fit" escolhe onde sobra menos área no retângulo escolhido, fragmentando menos.
            if (waste < bestFitScore) {
                bestFitScore = waste;
                bestRectIndex = i;
                bestRotated = false;
            }
        }

        // Opção B: Peça rotacionada
        if (piece.realWidth <= rect.w && piece.realLength <= rect.h) {
            const waste = (rect.w * rect.h) - (piece.realWidth * piece.realLength);
            if (waste < bestFitScore) {
                bestFitScore = waste;
                bestRectIndex = i;
                bestRotated = true;
            }
        }
    }

    if (bestRectIndex !== -1) {
        if (testOnly) return true;

        // Insere a peça
        const rect = sheet.freeRects[bestRectIndex];
        const placedW = bestRotated ? piece.realWidth : piece.realLength;
        const placedH = bestRotated ? piece.realLength : piece.realWidth;

        // Adiciona à lista de peças da chapa
        sheet.pieces.push({
            ...piece,
            x: rect.x,
            y: rect.y,
            placedLength: bestRotated ? piece.width : piece.length, // Medida visual sem gap
            placedWidth: bestRotated ? piece.length : piece.width,  // Medida visual sem gap
            rotated: bestRotated
        });

        // DIVISÃO DO ESPAÇO (Guillotine Split)
        // Decisão Inteligente: Cortar na horizontal ou vertical?
        // Queremos maximizar a área do maior retângulo restante.
        
        // Estratégia 1: Split Horizontal (Sobra um retângulão à direita)
        const freeRight1 = { x: rect.x + placedW, y: rect.y, w: rect.w - placedW, h: rect.h };
        const freeBottom1 = { x: rect.x, y: rect.y + placedH, w: placedW, h: rect.h - placedH };
        
        // Estratégia 2: Split Vertical (Sobra um retângulão embaixo)
        const freeRight2 = { x: rect.x + placedW, y: rect.y, w: rect.w - placedW, h: placedH };
        const freeBottom2 = { x: rect.x, y: rect.y + placedH, w: rect.w, h: rect.h - placedH };

        // Compara qual deixa o maior retângulo livre (Minimiza retalhos finos)
        const bigArea1 = Math.max(freeRight1.w * freeRight1.h, freeBottom1.w * freeBottom1.h);
        const bigArea2 = Math.max(freeRight2.w * freeRight2.h, freeBottom2.w * freeBottom2.h);

        // Remove o retângulo usado
        sheet.freeRects.splice(bestRectIndex, 1);

        // Adiciona os novos (apenas se tiverem tamanho útil)
        if (bigArea1 >= bigArea2) {
            if (freeRight1.w > 0 && freeRight1.h > 0) sheet.freeRects.push(freeRight1);
            if (freeBottom1.w > 0 && freeBottom1.h > 0) sheet.freeRects.push(freeBottom1);
        } else {
            if (freeRight2.w > 0 && freeRight2.h > 0) sheet.freeRects.push(freeRight2);
            if (freeBottom2.w > 0 && freeBottom2.h > 0) sheet.freeRects.push(freeBottom2);
        }

        return true;
    }

    return false;
}