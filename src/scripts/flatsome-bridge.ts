function qs<T extends HTMLElement>(sel: string) {
	return document.querySelector<T>(sel);
}

function qsa<T extends HTMLElement>(sel: string) {
	return [...document.querySelectorAll<T>(sel)];
}

function closeAll() {
	document.body.classList.remove("astro-cart-open", "astro-menu-open");
	document.querySelector("#cart-popup")?.setAttribute("aria-hidden", "true");
}

export function initFlatsomeBridge() {
	const overlay = qs(".ux-body-overlay");
	overlay?.addEventListener("click", closeAll);

	qsa<HTMLElement>('[data-open="#main-menu"]').forEach((el) => {
		el.addEventListener("click", (e) => {
			e.preventDefault();
			closeAll();
			document.body.classList.add("astro-menu-open");
		});
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") closeAll();
	});
}
