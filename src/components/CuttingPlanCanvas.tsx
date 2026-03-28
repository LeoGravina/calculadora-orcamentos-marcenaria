import React, { useRef, useEffect, useState } from 'react';

// TYPESCRIPT: Definindo o formato esperado do Plano de Corte
interface CuttingPlanProps {
    cuttingPlan: {
        usedSheets: Array<{
            width: number;
            height: number;
            efficiency: string | number;
            pieces: Array<{
                x: number;
                y: number;
                placedLength: number;
                placedWidth: number;
                name: string;
                rotated: boolean;
            }>;
        }>;
    } | null;
}

const CuttingPlanCanvas: React.FC<CuttingPlanProps> = ({ cuttingPlan }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    const COLORS = {
        sheetBg: '#ffffff',
        sheetBorder: '#333333',
        pieceFill: '#e0e7ff', 
        pieceBorder: '#3730a3', 
        text: '#1f2937',
        wastePattern: '#f3f4f6' 
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !cuttingPlan || !cuttingPlan.usedSheets) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const PADDING = 40; 
        const SHEET_MARGIN = 20;
        
        let maxWidth = 0;
        let totalHeight = SHEET_MARGIN;

        cuttingPlan.usedSheets.forEach(sheet => {
            maxWidth = Math.max(maxWidth, sheet.width);
            totalHeight += sheet.height + PADDING;
        });

        canvas.width = maxWidth + (SHEET_MARGIN * 2);
        canvas.height = totalHeight;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);

        let currentY = SHEET_MARGIN;

        cuttingPlan.usedSheets.forEach((sheet, index) => {
            ctx.fillStyle = COLORS.sheetBg;
            ctx.fillRect(SHEET_MARGIN, currentY, sheet.width, sheet.height);
            
            ctx.fillStyle = COLORS.wastePattern;
            ctx.fillRect(SHEET_MARGIN, currentY, sheet.width, sheet.height);

            ctx.strokeStyle = COLORS.sheetBorder;
            ctx.lineWidth = 2;
            ctx.strokeRect(SHEET_MARGIN, currentY, sheet.width, sheet.height);

            ctx.fillStyle = '#000';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Chapa ${index + 1} - ${sheet.efficiency}% Aproveitamento`, SHEET_MARGIN, currentY - 10);

            sheet.pieces.forEach(piece => {
                const px = SHEET_MARGIN + piece.x;
                const py = currentY + piece.y;
                const pw = piece.placedLength;
                const ph = piece.placedWidth;

                ctx.fillStyle = COLORS.pieceFill;
                ctx.fillRect(px, py, pw, ph);

                ctx.strokeStyle = COLORS.pieceBorder;
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, pw, ph);

                if (pw * transform.scale > 30 && ph * transform.scale > 20) {
                    ctx.fillStyle = COLORS.text;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    const fontSize = Math.min(14, Math.min(pw, ph) / 3);
                    ctx.font = `${fontSize}px Arial`;

                    const cx = px + pw / 2;
                    const cy = py + ph / 2;

                    ctx.fillText(piece.name.substring(0, 10), cx, cy - (fontSize/1.5));
                    
                    ctx.font = `${fontSize * 0.8}px Arial`;
                    const dimText = `${piece.placedLength}x${piece.placedWidth}`;
                    ctx.fillText(dimText, cx, cy + (fontSize/1.5));
                    
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

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, transform.scale + scaleAmount), 5);
        setTransform(prev => ({ ...prev, scale: newScale }));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setTransform(prev => ({ ...prev, x: e.clientX - startPan.x, y: e.clientY - startPan.y }));
    };

    const handleMouseUp = () => setIsDragging(false);

    const resetView = () => {
        if (cuttingPlan && cuttingPlan.usedSheets.length > 0 && containerRef.current) {
            const sheetW = cuttingPlan.usedSheets[0].width;
            const containerW = containerRef.current.clientWidth;
            const fitScale = (containerW / sheetW) * 0.9; 
            setTransform({ x: 20, y: 50, scale: fitScale });
        } else {
            setTransform({ x: 0, y: 0, scale: 0.2 }); 
        }
    };

    useEffect(() => { resetView(); }, [cuttingPlan]);

    return (
        // TAILWIND: Div de container 100% responsiva
        <div 
            ref={containerRef}
            className={`w-full h-[500px] overflow-hidden border border-gray-200 rounded-2xl relative bg-gray-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} shadow-inner`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={(e) => {
                const touch = e.touches[0];
                setIsDragging(true);
                setStartPan({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
            }}
            onTouchMove={(e) => {
                if (!isDragging) return;
                const touch = e.touches[0];
                setTransform(prev => ({ ...prev, x: touch.clientX - startPan.x, y: touch.clientY - startPan.y }));
            }}
            onTouchEnd={() => setIsDragging(false)}
        >
            {/* Botão flutuante estilizado */}
            <div className="absolute top-3 right-3 z-10">
                <button 
                    onClick={resetView}
                    className="bg-gray-900/70 hover:bg-gray-900 text-white border-none px-4 py-2 rounded-lg cursor-pointer backdrop-blur-sm text-xs font-bold transition-all shadow-md active:scale-95"
                >
                    Recentralizar Zoom
                </button>
            </div>
            
            {/* Aviso no rodapé */}
            <p className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-gray-500 rounded-lg pointer-events-none border border-gray-100 shadow-sm">
                🤏 Use pinça para Zoom. Arraste para mover.
            </p>

            <canvas ref={canvasRef} className="block" />
        </div>
    );
};

export default CuttingPlanCanvas;