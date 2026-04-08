export type Product = {
	slug: string;
	title: string;
	image: string;
	imageHover?: string;
	wasRaw: string;
	nowRaw: string;
	instN: string;
	instValRaw: string;
	compareAt: string;
	price: string;
	unitPrice: number;
	installment: string;
	descriptionHtml?: string;
	categoryName?: string;
	categoryHref?: string;
	galleryImages?: string[];
};

export function parseBRL(label: string): number {
	const n = label
		.replace(/R\$\s*/i, "")
		.trim()
		.replace(/\./g, "")
		.replace(",", ".");
	return Number.parseFloat(n) || 0;
}

export function discountPercent(compareAt: string, price: string): number | null {
	const was = parseBRL(compareAt);
	const now = parseBRL(price);
	if (was <= 0 || now >= was) return null;
	return Math.round((1 - now / was) * 100);
}
