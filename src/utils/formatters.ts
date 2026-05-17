export const formatCurrency = (value: number | string | null | undefined) => {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCurrencyCompact = (value: number | string | null | undefined) => {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  });
};

export const formatPercent = (value: number | null | undefined) => {
  return `${(value ?? 0).toFixed(1)}%`;
};

