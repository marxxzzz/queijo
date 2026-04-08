function qs<T extends HTMLElement>(sel: string, root: ParentNode = document) {
	return root.querySelector<T>(sel);
}

function qsa<T extends HTMLElement>(sel: string, root: ParentNode = document) {
	return [...root.querySelectorAll<T>(sel)];
}

export function initProductGallery(root: ParentNode = document) {
	const wrap = qs("[data-astro-product-gallery]", root);
	if (!wrap) return;
	const slides = qsa<HTMLElement>(
		".woocommerce-product-gallery__image.slide",
		wrap,
	);
	const thumbRoot = qs(".product-thumbnails", root);
	const thumbs = thumbRoot
		? qsa<HTMLElement>(".product-thumbnails .col", root)
		: [];

	function show(i: number) {
		const n = Math.max(0, Math.min(i, slides.length - 1));
		slides.forEach((s, j) => s.classList.toggle("is-active", j === n));
		thumbs.forEach((t, j) => t.classList.toggle("is-nav-selected", j === n));
	}

	if (!slides.length) return;
	show(0);
	thumbs.forEach((t, i) => {
		t.addEventListener("click", (e) => {
			e.preventDefault();
			show(i);
		});
	});
}

export function initProductQuantity(root: ParentNode = document) {
	root.addEventListener("click", (e) => {
		const btn = (e.target as HTMLElement).closest<HTMLElement>(
			".ux-quantity__button",
		);
		if (!btn || !root.contains(btn)) return;
		const wrap = btn.closest(".ux-quantity");
		const input = wrap?.querySelector<HTMLInputElement>("input.qty");
		if (!input) return;
		let v = Number.parseInt(input.value, 10) || 1;
		if (btn.classList.contains("ux-quantity__button--minus"))
			v = Math.max(1, v - 1);
		else if (btn.classList.contains("ux-quantity__button--plus")) v = v + 1;
		input.value = String(v);
	});
}

export function initProductPage(root: ParentNode = document) {
	initProductGallery(root);
	initProductQuantity(root);
}
