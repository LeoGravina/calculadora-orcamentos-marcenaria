import React, { useRef, useEffect, useState } from 'react';

// Constantes movidas para fora do useEffect para melhor performance e organização
const SCALE = 0.15; // Ajuste a escala conforme necessário
const PADDING = 20;

const CuttingPlanCanvas = ({ cuttingPlan }) => {
    const canvasRef = useRef(null);
    const [selectedPiece, setSelectedPiece] = useState(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!cuttingPlan || !cuttingPlan.usedSheets || cuttingPlan.usedSheets.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // Calcula a altura total necessária para o canvas
        const totalHeight = cuttingPlan.usedSheets.reduce((acc, sheet) => {
            return acc + sheet.width * SCALE + PADDING * 2;
        }, 0);
        
        // Define o tamanho do canvas dinamicamente (largura máxima pode ser fixa ou calculada)
        canvas.width = 3000 * SCALE; // Ex: Largura máxima de uma chapa padrão
        canvas.height = totalHeight;
        
        // Inicia o desenho
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let currentY = PADDING;

        cuttingPlan.usedSheets.forEach((sheet, sheetIndex) => {
            const sheetWidth = sheet.length * SCALE;
            const sheetHeight = sheet.width * SCALE;
            const sheetX = PADDING;

            // 1. Desenha a chapa
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.strokeRect(sheetX, currentY, sheetWidth, sheetHeight);
            
            ctx.font = '14px Arial';
            ctx.fillStyle = '#333';
            ctx.fillText(
                `Chapa ${sheetIndex + 1}: ${sheet.name} (${sheet.length}x${sheet.width}mm)`, 
                sheetX + 5,
                currentY - 5 // Posição um pouco acima da linha
            );

            // 2. [MELHORIA] Visualiza o desperdício (espaços não utilizados)
            // Isso requer que `cuttingOptimizer` retorne a propriedade `remainingSpaces` em cada chapa.
            if (sheet.remainingSpaces) {
                ctx.fillStyle = '#f0f0f0'; // Cinza claro para o desperdício
                sheet.remainingSpaces.forEach(space => {
                    ctx.fillRect(
                        sheetX + space.x * SCALE,
                        currentY + space.y * SCALE,
                        space.width * SCALE,
                        space.height * SCALE
                    );
                });
            }

            // 3. Desenha as peças na chapa
            sheet.pieces.forEach((piece, pieceIndex) => {
                const pieceX = sheetX + piece.x * SCALE;
                const pieceY = currentY + piece.y * SCALE;
                const pieceWidth = (piece.placedLength || piece.originalLength) * SCALE;
                const pieceHeight = (piece.placedWidth || piece.originalWidth) * SCALE;

                // 4. [MELHORIA] Cores consistentes baseadas no ID da peça
                // Gera uma cor única e estável para cada peça, em vez de uma cor aleatória
                const pieceIdSum = (piece.uniqueId || piece.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                ctx.fillStyle = `hsl(${pieceIdSum % 360}, 70%, 85%)`;
                ctx.fillRect(pieceX, pieceY, pieceWidth, pieceHeight);
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                ctx.strokeRect(pieceX, pieceY, pieceWidth, pieceHeight);

            const canDrawDimensionsOnBorders = pieceWidth > 40 && pieceHeight > 40; // Ajuste esses valores conforme a legibilidade
            const canDrawNameInside = pieceWidth > 60 && pieceHeight > 60; // Para desenhar o nome no centro

            if (canDrawDimensionsOnBorders) {
                ctx.font = '8px Arial'; // Fonte menor para as bordas
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Dimensões originais da peça (sem a folga para o display)
                const displayLength = piece.originalLength;
                const displayWidth = piece.originalWidth;

                // Lado esquerdo (altura)
                if (pieceHeight > 20) { // Desenha se houver espaço vertical suficiente
                    ctx.save();
                    ctx.translate(pieceX + 5, pieceY + pieceHeight / 2); // Levemente à direita da borda esquerda
                    ctx.rotate(-Math.PI / 2); // Rotaciona 90 graus para texto vertical
                    ctx.fillText(`${displayWidth}mm`, 0, 0);
                    ctx.restore();
                }

                // Lado inferior (comprimento)
                if (pieceWidth > 20) { // Desenha se houver espaço horizontal suficiente
                    ctx.fillText(`${displayLength}mm`, pieceX + pieceWidth / 2, pieceY + pieceHeight - 5); // Levemente acima da borda inferior
                }

                // Nome e ID no centro (se houver espaço)
                if (canDrawNameInside) {
                    ctx.font = '10px Arial';
                    ctx.fillStyle = '#000';
                    ctx.fillText(piece.name, pieceX + pieceWidth / 2, pieceY + pieceHeight / 2 - 8);
                    ctx.fillText(`#${pieceIndex + 1}`, pieceX + pieceWidth / 2, pieceY + pieceHeight / 2 + 8);
                } else {
                    // Para peças pequenas demais para nome, mas que tem um pouco de espaço, só o ID
                    const textX = pieceX + pieceWidth / 2;
                    const textY = pieceY + pieceHeight / 2;
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.strokeText(`#${pieceIndex + 1}`, textX, textY);

                    ctx.fillStyle = '#000';
                    ctx.fillText(`#${pieceIndex + 1}`, textX, textY);
                }

            } else {
                // Caso a peça seja muito pequena para qualquer texto nas bordas, desenha apenas o ID centralizado
                const textX = pieceX + pieceWidth / 2;
                const textY = pieceY + pieceHeight / 2;
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.strokeText(`#${pieceIndex + 1}`, textX, textY);

                ctx.fillStyle = '#000';
                ctx.fillText(`#${pieceIndex + 1}`, textX, textY);
            }
                
                // Destaque da peça selecionada
                if (selectedPiece && selectedPiece.uniqueId === piece.uniqueId) {
                    ctx.strokeStyle = '#dc2626'; // Vermelho forte para destaque
                    ctx.lineWidth = 3;
                    ctx.strokeRect(pieceX, pieceY, pieceWidth, pieceHeight);
                }
            });

            currentY += sheetHeight + PADDING * 2;
        });

    }, [cuttingPlan, selectedPiece]);

    // Função para lidar com o clique no canvas
    const handleCanvasClick = (event) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        let foundPiece = null;
        let currentY = PADDING;

        if (!cuttingPlan || !cuttingPlan.usedSheets) return;

        for (const sheet of cuttingPlan.usedSheets) {
            const sheetX = PADDING;
            const sheetY = currentY;
            const sheetWidth = sheet.length * SCALE;
            const sheetHeight = sheet.width * SCALE;

            if (mouseX >= sheetX && mouseX <= sheetX + sheetWidth && mouseY >= sheetY && mouseY <= sheetY + sheetHeight) {
                for (const piece of sheet.pieces) {
                    const pieceX = sheetX + piece.x * SCALE;
                    const pieceY = sheetY + piece.y * SCALE;
                    const pieceWidth = (piece.placedLength || piece.originalLength) * SCALE;
                    const pieceHeight = (piece.placedWidth || piece.originalWidth) * SCALE;

                    if (mouseX >= pieceX && mouseX <= pieceX + pieceWidth && mouseY >= pieceY && mouseY <= pieceY + pieceHeight) {
                        foundPiece = piece;
                        break; // Para de procurar em outras peças da mesma chapa
                    }
                }
            }
            if (foundPiece) break; // Para de procurar em outras chapas

            currentY += sheetHeight + PADDING * 2;
        }

        setSelectedPiece(foundPiece);
    };

    return (
        <>
            <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{ cursor: 'pointer', maxWidth: '100%' }}
            />
            {selectedPiece && (
                <div className="selected-piece-details" style={{marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px'}}>
                    <h4>Detalhes da Peça Selecionada:</h4>
                    <p><strong>Nome:</strong> {selectedPiece.name}</p>
                    <p><strong>Medidas Originais:</strong> {selectedPiece.originalLength}x{selectedPiece.originalWidth}mm</p>
                    <p><strong>Quantidade no Projeto:</strong> {selectedPiece.qty}</p>
                </div>
            )}
        </>
    );
};

export default CuttingPlanCanvas;