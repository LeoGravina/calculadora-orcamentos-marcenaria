export const maskCurrency = (value) => {
    if (!value) return "";
    let v = String(value).replace(/\D/g, "");
    if (v === "") return "";
    v = (Number(v) / 100).toFixed(2);
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    return "R$ " + v;
};

export const unmaskMoney = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const cleanValue = String(value).replace(/\D/g, "");
    return Number(cleanValue) / 100;
};

export const maskMeasure = (value, suffix) => {
    if (!value) return "";
    
    let v = String(value).replace(/\D/g, "");
    
    if (v === "") return "";

    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    
    return `${v} ${suffix}`;
};

export const unmaskNumber = (value) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    return Number(String(value).replace(/\D/g, ""));
};