export function formatPrice(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
  }).format(value);
}

export function getTierColor(name: string) {
  const colors: Record<string, string> = {
    basic: "bg-gray-100 text-gray-800 border-gray-300",
    pro: "bg-blue-100 text-blue-800 border-blue-300",
    premium: "bg-purple-100 text-purple-800 border-purple-300",
  };
  return colors[name] || colors.basic;
}

export function toLimitPayload(v: number) {
  return v === 0 ? null : v;
}
