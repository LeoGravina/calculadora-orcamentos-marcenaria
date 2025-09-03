// src/utils/cuttingOptimizer.js

export const cuttingOptimizer = (pieces, sheets, cuttingGap = 3) => {
    // 1. Prepara as peças: Garante que as dimensões são numéricas e adiciona a folga de corte.
    const piecesWithGap = pieces.map(p => ({
        ...p,
        width: parseFloat(p.width) + cuttingGap,
        length: parseFloat(p.length) + cuttingGap,
        originalWidth: parseFloat(p.width),
        originalLength: parseFloat(p.length),
        area: (parseFloat(p.width) + cuttingGap) * (parseFloat(p.length) + cuttingGap),
    }));

    // 2. Ordena as peças da maior para a menor área.
    const sortedPieces = piecesWithGap.sort((a, b) => b.area - a.area);

    const usedSheets = [];

    // 3. Loop principal: Tenta posicionar cada peça
    for (const piece of sortedPieces) {
        let placed = false;

        // Tenta encaixar a peça em uma chapa já em uso
        for (const sheet of usedSheets) {
            if (findAndPlacePiece(sheet, piece)) {
                placed = true;
                break;
            }
        }

        // Se não coube em nenhuma chapa existente, abre uma nova
        if (!placed) {
            let bestSheetOption = null;

            // Itera sobre os templates de chapa para encontrar a melhor opção
            for (const sheetTemplate of sheets) {
                // Opção 1: Chapa na orientação padrão (Landscape)
                if (canPieceFitInDimensions(piece, sheetTemplate.length, sheetTemplate.width)) {
                    const area = sheetTemplate.length * sheetTemplate.width;
                    if (!bestSheetOption || area < bestSheetOption.area) {
                        bestSheetOption = {
                            template: sheetTemplate,
                            orientation: 'landscape',
                            area: area,
                            length: sheetTemplate.length,
                            width: sheetTemplate.width
                        };
                    }
                }

                // Opção 2: Chapa na orientação rotacionada (Portrait), se não for quadrada
                if (sheetTemplate.length !== sheetTemplate.width) {
                    if (canPieceFitInDimensions(piece, sheetTemplate.width, sheetTemplate.length)) { // Dimensões invertidas
                        const area = sheetTemplate.length * sheetTemplate.width;
                         if (!bestSheetOption || area <= bestSheetOption.area) { // <= para dar preferência à rotação se a área for igual
                            bestSheetOption = {
                                template: sheetTemplate,
                                orientation: 'portrait',
                                area: area,
                                length: sheetTemplate.width, // Dimensões invertidas
                                width: sheetTemplate.length
                            };
                        }
                    }
                }
            }
            
            // Se encontrou uma opção de chapa viável
            if (bestSheetOption) {
                const newSheet = {
                    ...bestSheetOption.template,
                    id: crypto.randomUUID(),
                    name: bestSheetOption.template.name + (bestSheetOption.orientation === 'portrait' ? ' (Em Pé)' : ''),
                    length: bestSheetOption.length, // Usa as dimensões da orientação escolhida
                    width: bestSheetOption.width,
                    pieces: [],
                    remainingSpaces: [{ x: 0, y: 0, width: bestSheetOption.length, height: bestSheetOption.width }], // AQUI height é width
                };

                if (findAndPlacePiece(newSheet, piece)) {
                    usedSheets.push(newSheet);
                    placed = true;
                }
            }
        }

        // Se mesmo tentando abrir uma chapa nova a peça não coube, há um erro.
        if (!placed) {
            return { usedSheets: [], error: `Não foi possível alocar a peça "${piece.name}". Verifique as medidas.` };
        }
    }

    return { usedSheets };
};


/**
 * Função auxiliar que verifica se uma peça pode ser encaixada em uma dada dimensão.
 */
function canPieceFitInDimensions(piece, areaLength, areaWidth) {
    // Tenta sem rotacionar
    if (piece.length <= areaLength && piece.width <= areaWidth) return true;
    // Tenta rotacionando
    if (piece.width <= areaLength && piece.length <= areaWidth) return true;
    return false;
}


/**
 * Função principal de encaixe: encontra o melhor espaço em uma chapa e posiciona a peça.
 */
function findAndPlacePiece(sheet, piece) {
    let bestFit = null;

    for (let i = 0; i < sheet.remainingSpaces.length; i++) {
        const space = sheet.remainingSpaces[i]; // space tem .width e .height

        // Tenta encaixar sem rotacionar
        if (piece.length <= space.width && piece.width <= space.height) {
            const waste = (space.width * space.height) - (piece.length * piece.width);
            if (!bestFit || waste < bestFit.waste) {
                bestFit = { spaceIndex: i, isRotated: false, waste };
            }
        }

        // Tenta encaixar rotacionando
        if (piece.width <= space.width && piece.length <= space.height) {
            const waste = (space.width * space.height) - (piece.width * piece.length);
            if (!bestFit || waste < bestFit.waste) {
                bestFit = { spaceIndex: i, isRotated: true, waste };
            }
        }
    }

    if (bestFit) {
        const placedLength = bestFit.isRotated ? piece.width : piece.length;
        const placedWidth = bestFit.isRotated ? piece.length : piece.width;

        placePieceAndSplitSpace(sheet, piece, bestFit.spaceIndex, placedLength, placedWidth);
        sheet.pieces.push(piece);
        return true;
    }

    return false;
}

/**
 * Posiciona a peça e divide o espaço restante usando o método guilhotina.
 */
function placePieceAndSplitSpace(sheet, piece, spaceIndex, placedLength, placedWidth) {
    const space = sheet.remainingSpaces.splice(spaceIndex, 1)[0];

    piece.x = space.x;
    piece.y = space.y;
    piece.placedLength = placedLength;
    piece.placedWidth = placedWidth;

    if (space.width - placedLength > 0.1) { // Usar uma pequena tolerância para evitar micro-espaços
        sheet.remainingSpaces.push({
            x: space.x + placedLength,
            y: space.y,
            width: space.width - placedLength,
            height: space.height
        });
    }

    if (space.height - placedWidth > 0.1) {
        sheet.remainingSpaces.push({
            x: space.x,
            y: space.y + placedWidth,
            width: placedLength,
            height: space.height - placedWidth
        });
    }
}