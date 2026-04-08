const STORAGE_KEY = "loja-oficial-cart-v1";

export type CartLine = {
	slug: string;
	title: string;
	image: string;
	unitPrice: number;
	quantity: number;
};

export function getCart(): CartLine[] {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
	} catch {
		return [];
	}
}

export function setCart(lines: CartLine[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
	window.dispatchEvent(new CustomEvent("loja-cart", { detail: { lines } }));
}

export function addToCart(
	line: Omit<CartLine, "quantity"> & { quantity?: number },
) {
	const q = line.quantity ?? 1;
	const cart = getCart();
	const i = cart.findIndex((l) => l.slug === line.slug);
	if (i >= 0) cart[i]!.quantity += q;
	else
		cart.push({
			slug: line.slug,
			title: line.title,
			image: line.image,
			unitPrice: line.unitPrice,
			quantity: q,
		});
	setCart(cart);
}

export function updateQuantity(slug: string, quantity: number) {
	let cart = getCart();
	if (quantity <= 0) cart = cart.filter((l) => l.slug !== slug);
	else {
		const i = cart.findIndex((l) => l.slug === slug);
		if (i >= 0) cart[i]!.quantity = quantity;
	}
	setCart(cart);
}

export function removeLine(slug: string) {
	setCart(getCart().filter((l) => l.slug !== slug));
}

export function clearCart() {
	setCart([]);
}

export function cartSubtotal(lines: CartLine[]): number {
	return lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}

export function formatBRL(n: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(n);
}
