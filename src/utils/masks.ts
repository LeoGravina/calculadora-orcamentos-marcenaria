// src/utils/masks.ts

export const maskCurrency = (value: string | number | undefined | null): string => {
    if (!value) return "";
    let v = String(value).replace(/\D/g, "");
    if (v === "") return "";
    v = (Number(v) / 100).toFixed(2);
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    return "R$ " + v;
};

export const unmaskMoney = (value: string | number | undefined | null): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const cleanValue = String(value).replace(/\D/g, "");
    return Number(cleanValue) / 100;
};

// maskMeasure agora formata APENAS os dígitos (sem sufixo mm/%)
// O sufixo agora é aplicado via interface relativa (UI/UX padrão mobile)
export const maskMeasure = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null || value === "") return "";
    let v = String(value).replace(/\D/g, ""); // Keep only digits
    if (v === "") return "";
    return v; // Return only the formatted number part
};

export const unmaskNumber = (value: string | number | undefined | null): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return Number(String(value).replace(/\D/g, ""));
};

// NOVO: Máscara para telefone brasileiro ((XX) 9XXXX-XXXX)
export const maskPhone = (value: string | undefined | null): string => {
    if (!value) return "";
    let v = value.replace(/\D/g, ""); // Apenas dígitos

    if (v.length === 0) return "";
    if (v.length < 3) return `(${v}`;
    if (v.length < 7) return `(${v.substring(0, 2)}) ${v.substring(2)}`;
    if (v.length < 11) return `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
    return `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7, 11)}`;
};

export const unmaskPhone = (value: string | undefined | null): string => {
    if(!value) return "";
    return value.replace(/\D/g, "");
};