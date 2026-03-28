export const cuttingOptimizer = (pieces: any[], sheets: any[], cuttingGap: number = 3) => {
    const piecesWithGap = pieces.map(p => ({
        ...p,
        width: parseFloat(p.width),
        length: parseFloat(p.length),
        realWidth: parseFloat(p.width) + cuttingGap,
        realLength: parseFloat(p.length) + cuttingGap,
        area: (parseFloat(p.width) + cuttingGap) * (parseFloat(p.length) + cuttingGap),
    }));

    const sortedPieces = piecesWithGap.sort((a, b) => b.area - a.area);

    const usedSheets: any[] = [];
    let totalSheetArea = 0;

    for (const piece of sortedPieces) {
        let placed = false;

        for (const sheet of usedSheets) {
            if (fitPieceInSheet(sheet, piece)) {
                placed = true;
                break;
            }
        }

        if (!placed) {
            let bestSheetOption: any = null;

            for (const template of sheets) {
                const sheetArea = template.length * template.width;
                const testSheet = createNewSheet(template, false); 
                if (fitPieceInSheet(testSheet, piece, true)) { 
                     if (!bestSheetOption || sheetArea < bestSheetOption.area) {
                        bestSheetOption = { template, rotated: false, area: sheetArea };
                    }
                }

                if (template.length !== template.width) {
                    const testSheetRotated = createNewSheet(template, true);
                    if (fitPieceInSheet(testSheetRotated, piece, true)) {
                        if (!bestSheetOption || sheetArea < bestSheetOption.area) { 
                            bestSheetOption = { template, rotated: true, area: sheetArea };
                        }
                    }
                }
            }

            if (bestSheetOption) {
                const newSheet = createNewSheet(bestSheetOption.template, bestSheetOption.rotated);
                fitPieceInSheet(newSheet, piece); 
                usedSheets.push(newSheet);
                totalSheetArea += newSheet.width * newSheet.height; 
                placed = true;
            }
        }

        if (!placed) {
            return { usedSheets: [], error: `Peça gigante: "${piece.name}" (${piece.length}x${piece.width}) não cabe em nenhuma chapa.` };
        }
    }
    
    usedSheets.forEach(sheet => {
        const usedArea = sheet.pieces.reduce((acc: number, p: any) => acc + (p.originalLength * p.originalWidth || p.length * p.width), 0);
        const sheetTotalArea = sheet.displayLength * sheet.displayWidth;
        sheet.efficiency = ((usedArea / sheetTotalArea) * 100).toFixed(1);
    });

    return { usedSheets };
};

function createNewSheet(template: any, rotated: boolean) {
    return {
        id: crypto.randomUUID(),
        name: template.name + (rotated ? ' (Em pé)' : ''),
        displayLength: template.length, 
        displayWidth: template.width,
        width: rotated ? template.width : template.length, 
        height: rotated ? template.length : template.width, 
        pieces: [],
        freeRects: [{ x: 0, y: 0, w: rotated ? template.width : template.length, h: rotated ? template.length : template.width }]
    };
}

function fitPieceInSheet(sheet: any, piece: any, testOnly: boolean = false) {
    let bestRectIndex = -1;
    let bestFitScore = Number.MAX_VALUE; 
    let bestRotated = false;

    for (let i = 0; i < sheet.freeRects.length; i++) {
        const rect = sheet.freeRects[i];

        if (piece.realLength <= rect.w && piece.realWidth <= rect.h) {
            const waste = (rect.w * rect.h) - (piece.realLength * piece.realWidth);
            if (waste < bestFitScore) {
                bestFitScore = waste;
                bestRectIndex = i;
                bestRotated = false;
            }
        }

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
    return false;
}