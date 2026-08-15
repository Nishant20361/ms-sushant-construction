export const formatINR = (value: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}`;
export const formatDate = (value: string | Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
export const formatQuantity = (value: number, unit?: string) => `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 }).format(value)}${unit ? ` ${unit}` : ""}`;
export const formatMobile = (value: string) => value.replace(/\D/g, "").slice(-10).replace(/(\d{5})(\d{5})/, "$1 $2");
