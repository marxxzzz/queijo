import {
	addToCart,
	cartSubtotal,
	clearCart,
	formatBRL,
	getCart,
	removeLine,
	updateQuantity,
	type CartLine,
} from "../lib/cart";

function qs<T extends HTMLElement>(sel: string, root: ParentNode = document) {
	return root.querySelector<T>(sel);
}

function escapeHtml(s: string) {
	const d = document.createElement("div");
	d.textContent = s;
	return d.innerHTML;
}

function formatBRLNoSymbol(n: number): string {
	return new Intl.NumberFormat("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(n);
}

const QTY_SVG_MINUS =
	'<svg class="astro-qty-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 12h14" stroke="#E30613" stroke-width="2.6" stroke-linecap="round"/></svg>';
const QTY_SVG_PLUS =
	'<svg class="astro-qty-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="#00A03E" stroke-width="2.6" stroke-linecap="round"/></svg>';

function buildMiniCartHtml(lines: CartLine[]) {
	return lines
		.map(
			(l) => `
<li class="woocommerce-mini-cart-item mini_cart_item astro-line" data-slug="${escapeHtml(l.slug)}">
  <div class="product-thumbnail">
    <a href="/produto/${escapeHtml(l.slug)}/"><img src="${escapeHtml(l.image)}" alt="" width="64" height="77" loading="lazy" decoding="async" class="attachment-thumbnail size-thumbnail" /></a>
  </div>
  <div class="product-name">
    <a href="/produto/${escapeHtml(l.slug)}/">${escapeHtml(l.title)}</a>
    <div class="astro-qty-row">
      <div class="astro-qty-pill astro-qty-pill--mini" role="group" aria-label="Quantidade">
        <button type="button" class="astro-qty-pill-btn" data-act="minus" aria-label="Menos">${QTY_SVG_MINUS}</button>
        <span class="astro-qty-pill-mid">${l.quantity}</span>
        <button type="button" class="astro-qty-pill-btn" data-act="plus" aria-label="Mais">${QTY_SVG_PLUS}</button>
      </div>
      <button type="button" class="astro-remove" data-act="remove">Remover</button>
    </div>
  </div>
  <span class="woocommerce-Price-amount amount">${formatBRL(l.unitPrice * l.quantity)}</span>
</li>`,
		)
		.join("");
}

function bindMiniCart(listEl: HTMLElement) {
	for (const row of listEl.querySelectorAll<HTMLElement>(".astro-line")) {
		const slug = row.dataset.slug;
		if (!slug) continue;
		row.addEventListener("click", (e) => {
			const t = e.target as HTMLElement;
			const btn = t.closest("button");
			if (!btn) return;
			const act = btn.dataset.act;
			const line = getCart().find((x) => x.slug === slug);
			if (!line) return;
			if (act === "plus") updateQuantity(slug, line.quantity + 1);
			else if (act === "minus")
				updateQuantity(slug, Math.max(0, line.quantity - 1));
			else if (act === "remove") removeLine(slug);
		});
	}
}

function buildPageTableHtml(lines: CartLine[]) {
	return lines
		.map(
			(l) =>
				`
<tr class="woocommerce-cart-form__cart-item cart_item astro-line" data-slug="${escapeHtml(l.slug)}">
  <td class="product-remove">
    <button type="button" class="remove astro-page-remove" data-act="remove" aria-label="Remover item">×</button>
  </td>
  <td class="product-thumbnail">
    <a href="/produto/${escapeHtml(l.slug)}/"><img src="${escapeHtml(l.image)}" alt="" width="64" height="77" loading="lazy" /></a>
  </td>
  <td class="product-name">
    <a href="/produto/${escapeHtml(l.slug)}/">${escapeHtml(l.title)}</a>
  </td>
  <td class="product-price">${formatBRL(l.unitPrice)}</td>
  <td class="product-quantity">
    <div class="quantity astro-qty-pill" role="group" aria-label="Alterar quantidade">
      <button type="button" class="astro-qty-pill-btn" data-act="minus" aria-label="Menos">${QTY_SVG_MINUS}</button>
      <span class="astro-qty-pill-mid">${l.quantity}</span>
      <button type="button" class="astro-qty-pill-btn" data-act="plus" aria-label="Mais">${QTY_SVG_PLUS}</button>
    </div>
  </td>
  <td class="product-subtotal">${formatBRL(l.unitPrice * l.quantity)}</td>
</tr>`,
		)
		.join("");
}

function bindPageTable(tbody: HTMLElement) {
	for (const row of tbody.querySelectorAll<HTMLElement>("tr.astro-line")) {
		const slug = row.dataset.slug;
		if (!slug) continue;
		row.addEventListener("click", (e) => {
			const t = e.target as HTMLElement;
			const btn = t.closest("button");
			if (!btn) return;
			const act = btn.dataset.act;
			const line = getCart().find((x) => x.slug === slug);
			if (!line) return;
			if (act === "plus") updateQuantity(slug, line.quantity + 1);
			else if (act === "minus")
				updateQuantity(slug, Math.max(0, line.quantity - 1));
			else if (act === "remove") removeLine(slug);
		});
	}
}

function setCartOpen(open: boolean) {
	document.body.classList.toggle("astro-cart-open", open);
	const popup = qs("#cart-popup");
	popup?.setAttribute("aria-hidden", open ? "false" : "true");
}

function syncPopupCart() {
	const lines = getCart();
	const emptyEl = qs("#astro-cart-empty");
	const listEl = qs("#astro-mini-cart-list");
	const footEl = qs("#astro-cart-footer");
	const subEl = qs("#cart-popup-subtotal");
	const priceSpan = qs("#header-cart-price");
	const n = lines.reduce((s, l) => s + l.quantity, 0);
	const total = cartSubtotal(lines);

	if (priceSpan) priceSpan.textContent = formatBRLNoSymbol(total);
	document.querySelectorAll(".icon-shopping-basket").forEach((el) => {
		el.setAttribute("data-icon-label", String(n));
	});

	if (!emptyEl || !listEl || !footEl || !subEl) return;

	if (lines.length === 0) {
		emptyEl.removeAttribute("hidden");
		listEl.innerHTML = "";
		footEl.setAttribute("hidden", "");
		subEl.textContent = formatBRL(0);
		return;
	}

	emptyEl.setAttribute("hidden", "");
	footEl.removeAttribute("hidden");
	subEl.textContent = formatBRL(total);
	listEl.innerHTML = buildMiniCartHtml(lines);
	bindMiniCart(listEl);
}

function syncPageCart() {
	const tbody = qs("#astro-cart-page-tbody");
	const emptyEl = qs("#cart-page-empty");
	const layoutEl = qs("#cart-page-layout");
	const subEl = qs("#cart-page-subtotal");
	const totalEl = qs("#cart-page-total");
	const installEl = qs("#cart-page-installments");
	if (!tbody || !emptyEl || !layoutEl) return;

	const lines = getCart();
	const total = cartSubtotal(lines);

	if (lines.length === 0) {
		emptyEl.removeAttribute("hidden");
		layoutEl.setAttribute("hidden", "");
		tbody.innerHTML = "";
		if (subEl) subEl.textContent = formatBRL(0);
		if (totalEl) totalEl.textContent = formatBRL(0);
		if (installEl) installEl.textContent = "Em até 10x de " + formatBRL(0);
		return;
	}

	emptyEl.setAttribute("hidden", "");
	layoutEl.removeAttribute("hidden");
	if (subEl) subEl.textContent = formatBRL(total);
	if (totalEl) totalEl.textContent = formatBRL(total);
	if (installEl) {
		const parcel = total / 10;
		installEl.textContent = "Em até 10x de " + formatBRL(parcel);
	}
	tbody.innerHTML = buildPageTableHtml(lines);
	bindPageTable(tbody);
}

function syncAll() {
	syncPopupCart();
	syncPageCart();
}

let toastTimer = 0;
function showAddedToast() {
	const t = qs("#cart-toast");
	if (!t) return;
	t.classList.add("cart-toast--show");
	window.clearTimeout(toastTimer);
	toastTimer = window.setTimeout(
		() => t.classList.remove("cart-toast--show"),
		2200,
	);
}

function bindAddToCart() {
	document.addEventListener("click", (e) => {
		const t = e.target as HTMLElement;
		const btn = t.closest<HTMLElement>(".js-add-to-cart");
		if (!btn) return;
		e.preventDefault();
		e.stopPropagation();
		const slug = btn.dataset.slug;
		const title = btn.dataset.title;
		const image = btn.dataset.image;
		const up = btn.dataset.unitPrice;
		if (!slug || !title || !image || up == null) return;
		const unitPrice = Number.parseFloat(up);
		if (Number.isNaN(unitPrice)) return;
		const form = btn.closest("form.cart");
		const qtyInput = form?.querySelector<HTMLInputElement>("input.qty");
		const quantity = qtyInput
			? Math.max(1, Number.parseInt(qtyInput.value, 10) || 1)
			: 1;
		addToCart({ slug, title, image, unitPrice, quantity });
		showAddedToast();
		setCartOpen(true);
	});
}

function bindCartChrome() {
	document.querySelectorAll(".js-cart-toggle").forEach((el) => {
		el.addEventListener("click", (e) => {
			e.preventDefault();
			document.body.classList.remove("astro-menu-open");
			setCartOpen(!document.body.classList.contains("astro-cart-open"));
		});
	});
	document.addEventListener("click", (e) => {
		const close = (e.target as HTMLElement).closest("[data-cart-close]");
		if (close) setCartOpen(false);
	});
	qs("#cart-popup-close")?.addEventListener("click", () => setCartOpen(false));
	qs("#cart-page-clear")?.addEventListener("click", () => clearCart());
}

export function initCartUi() {
	bindAddToCart();
	bindCartChrome();
	window.addEventListener("loja-cart", syncAll);
	window.addEventListener("storage", (e) => {
		if (e.key === "loja-oficial-cart-v1") syncAll();
	});
	syncAll();
}
