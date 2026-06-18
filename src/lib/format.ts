export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num || 0);
}

/**
 * Extrai a data "local" de uma string ISO vinda do backend.
 * O banco armazena datas históricas como meia-noite UTC (ex: "2014-08-22T00:00:00+00:00").
 * Se deixarmos o browser converter para o fuso local (-2h/-3h), o dia volta um dia.
 * Solução: lemos o fragmento YYYY-MM-DD diretamente da string, sem conversão de timezone.
 */
function parseDateLocal(value: string): Date {
  // Se tiver T, pega só a parte de data (YYYY-MM-DD) e monta como data local
  const datePart = value.slice(0, 10); // "2014-08-22"
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(parseDateLocal(value));
}

export function formatDateOnly(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    parseDateLocal(value),
  );
}

export function toInputDate(value?: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}
