/**
 * Formata um número para a moeda brasileira (BRL).
 * @param {number} value O valor numérico a ser formatado.
 * @returns {string} O valor formatado como string, ex: "R$ 1.234,56".
 */
export const formatCurrency = (value) => {
    if (isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

/**
 * Converte a URL de uma imagem para uma string Base64.
 * Necessário para embutir a imagem no PDF.
 * @param {string} url A URL da imagem a ser convertida.
 * @returns {Promise<string>} Uma promessa que resolve com a string Base64 da imagem.
 */
export const getImageBase64 = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = reject;
        img.src = url;
    });
};