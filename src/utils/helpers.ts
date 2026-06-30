export const formatCurrency = (value: string | number | undefined | null): string => {
    const num = Number(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

// Parser tolerante: aceita number ou string mascarada ("1.234,56", "2750 mm"...)
export const safeParseFloat = (val: string | number | undefined | null): number => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const clean = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
};

// Custo BRUTO (sem lucro) de uma peça, a partir do preço/área da chapa.
export const calcPieceRawCost = (piece: any, sheet: any): number => {
    if (!sheet) return 0;
    let sLength = safeParseFloat(sheet.length);
    let sWidth = safeParseFloat(sheet.width);
    const sPrice = safeParseFloat(sheet.price);
    if (sLength > 0 && sLength < 100) sLength *= 1000;
    if (sWidth > 0 && sWidth < 100) sWidth *= 1000;
    const sArea = sLength * sWidth;
    if (sArea <= 0) return 0;
    const pricePerSqMm = sPrice / sArea;
    const pArea = safeParseFloat(piece.length) * safeParseFloat(piece.width);
    return pArea * pricePerSqMm * safeParseFloat(piece.qty);
};

export const getImageBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = reject;
        img.src = url;
    });
};