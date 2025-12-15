import React, { useRef, useEffect, useState } from 'react';

const CuttingPlanCanvas = ({ cuttingPlan }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    
    // Estado de Zoom e Pan
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    // Configurações Visuais
    const COLORS = {
        sheetBg: '#ffffff',
        sheetBorder: '#333333',
        pieceFill: '#e0e7ff', // Azul clarinho suave
        pieceBorder: '#3730a3', // Azul índigo forte para borda
        text: '#1f2937',
        selectedFill: '#fcd34d', // Amarelo destaque
        wastePattern: '#f3f4f6' // Cinza claro
    };

    // Desenha o Canvas sempre que o plano ou o zoom mudar
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !cuttingPlan) return;
        const ctx = canvas.getContext('2d');

        // 1. Configurar Tamanho do Canvas (Alta resolução para zoom nítido)
        // Calculamos o tamanho total necessário para todas as chapas empilhadas
        const PADDING = 40; // Margem entre chapas
        const SHEET_MARGIN = 20;
        
        let maxWidth = 0;
        let totalHeight = SHEET_MARGIN;

        cuttingPlan.usedSheets.forEach(sheet => {
            maxWidth = Math.max(maxWidth, sheet.width);
            totalHeight += sheet.height + PADDING;
        });

        // Definimos o tamanho interno do canvas
        canvas.width = maxWidth + (SHEET_MARGIN * 2);
        canvas.height = totalHeight;

        // 2. Limpar e Aplicar Transformação (Zoom/Pan)
        // Importante: O clearRect limpa o canvas FÍSICO, não o transformado
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        ctx.save();
        // Aplica o zoom e movimento
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);

        // 3. Desenhar Chapas
        let currentY = SHEET_MARGIN;

        cuttingPlan.usedSheets.forEach((sheet, index) => {
            // Fundo da Chapa
            ctx.fillStyle = COLORS.sheetBg;
            ctx.fillRect(SHEET_MARGIN, currentY, sheet.width, sheet.height);
            
            // Desenho do Desperdício (Hachura ou cor sólida suave)
            ctx.fillStyle = COLORS.wastePattern;
            ctx.fillRect(SHEET_MARGIN, currentY, sheet.width, sheet.height);

            // Borda da Chapa
            ctx.strokeStyle = COLORS.sheetBorder;
            ctx.lineWidth = 2;
            ctx.strokeRect(SHEET_MARGIN, currentY, sheet.width, sheet.height);

            // Título da Chapa
            ctx.fillStyle = '#000';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Chapa ${index + 1} - ${sheet.efficiency}% Aproveitamento`, SHEET_MARGIN, currentY - 10);

            // 4. Desenhar Peças
            sheet.pieces.forEach(piece => {
                const px = SHEET_MARGIN + piece.x;
                const py = currentY + piece.y;
                const pw = piece.placedLength;
                const ph = piece.placedWidth;

                // Preenchimento
                ctx.fillStyle = COLORS.pieceFill;
                ctx.fillRect(px, py, pw, ph);

                // Borda da Peça
                ctx.strokeStyle = COLORS.pieceBorder;
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, pw, ph);

                // Texto (Nome e Dimensões)
                // Só desenha se a peça for grande o suficiente no zoom atual
                if (pw * transform.scale > 30 && ph * transform.scale > 20) {
                    ctx.fillStyle = COLORS.text;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Ajusta fonte conforme tamanho da peça
                    const fontSize = Math.min(14, Math.min(pw, ph) / 3);
                    ctx.font = `${fontSize}px Arial`;

                    const cx = px + pw / 2;
                    const cy = py + ph / 2;

                    // Nome
                    ctx.fillText(piece.name.substring(0, 10), cx, cy - (fontSize/1.5));
                    
                    // Dimensão
                    ctx.font = `${fontSize * 0.8}px Arial`;
                    const dimText = `${piece.placedLength}x${piece.placedWidth}`;
                    ctx.fillText(dimText, cx, cy + (fontSize/1.5));
                    
                    // Indicador de Rotação
                    if (piece.rotated) {
                        ctx.font = `${fontSize * 0.7}px Arial`;
                        ctx.fillStyle = '#b91c1c';
                        ctx.fillText("↻", px + 10, py + 10);
                    }
                }
            });

            currentY += sheet.height + PADDING;
        });

        ctx.restore();

    }, [cuttingPlan, transform]);

    // === CONTROLADORES DE ZOOM E PAN ===

    const handleWheel = (e) => {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, transform.scale + scaleAmount), 5);
        
        // Zoom focado no mouse seria ideal, mas zoom central é mais simples e robusto para mobile agora
        setTransform(prev => ({
            ...prev,
            scale: newScale
        }));
    };

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setTransform(prev => ({
            ...prev,
            x: e.clientX - startPan.x,
            y: e.clientY - startPan.y
        }));
    };

    const handleMouseUp = () => setIsDragging(false);

    // Resetar visualização
    const resetView = () => {
        // Tenta ajustar o zoom para caber a largura da chapa na tela
        if (cuttingPlan && cuttingPlan.usedSheets.length > 0 && containerRef.current) {
            const sheetW = cuttingPlan.usedSheets[0].width;
            const containerW = containerRef.current.clientWidth;
            const fitScale = (containerW / sheetW) * 0.9; // 90% da largura
            setTransform({ x: 20, y: 50, scale: fitScale });
        } else {
            setTransform({ x: 0, y: 0, scale: 0.2 }); // Fallback
        }
    };

    // Auto-fit inicial
    useEffect(() => {
        resetView();
    }, [cuttingPlan]);

    return (
        <div 
            ref={containerRef}
            style={{ 
                width: '100%', 
                height: '500px', 
                overflow: 'hidden', 
                border: '1px solid #ddd', 
                borderRadius: '8px',
                position: 'relative',
                background: '#f9f9f9',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            // Eventos Touch para celular (Básico)
            onTouchStart={(e) => {
                const touch = e.touches[0];
                setIsDragging(true);
                setStartPan({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
            }}
            onTouchMove={(e) => {
                if (!isDragging) return;
                const touch = e.touches[0];
                // Previne scroll da página enquanto arrasta o canvas
                // e.preventDefault(); // Cuidado: pode bloquear scroll da página inteira se não usado bem
                setTransform(prev => ({
                    ...prev,
                    x: touch.clientX - startPan.x,
                    y: touch.clientY - startPan.y
                }));
            }}
            onTouchEnd={() => setIsDragging(false)}
        >
            <div style={{
                position: 'absolute', 
                top: 10, 
                right: 10, 
                zIndex: 10, 
                display: 'flex', 
                gap: '5px'
            }}>
                <button 
                    onClick={resetView}
                    style={{
                        background: 'rgba(0,0,0,0.6)', 
                        color: 'white', 
                        border: 'none', 
                        padding: '5px 10px', 
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Resetar Zoom
                </button>
            </div>
            
            <p style={{
                position: 'absolute', 
                bottom: 10, 
                left: 10, 
                background: 'rgba(255,255,255,0.8)', 
                padding: '2px 5px', 
                fontSize: '0.8rem',
                pointerEvents: 'none'
            }}>
                Use pinça ou rolete para Zoom. Arraste para mover.
            </p>

            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
};

export default CuttingPlanCanvas;