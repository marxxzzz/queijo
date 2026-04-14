import { hasPixApiConfigured } from "./pix-api";

const CART_KEY = "loja-oficial-cart-v1";
const CHECKOUT_KEY = "loja-checkout-payload";

type CartLine = {
	slug: string;
	title: string;
	image: string;
	unitPrice: number;
	quantity: number;
};

function fmtBRL(n: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(n);
}

function readCart(): CartLine[] {
	try {
		const raw = localStorage.getItem(CART_KEY);
		if (!raw) return [];
		const p = JSON.parse(raw) as unknown;
		return Array.isArray(p) ? (p as CartLine[]) : [];
	} catch {
		return [];
	}
}

function cartTotal(lines: CartLine[]): number {
	return lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}

function showLoader(show: boolean) {
	const el = document.querySelector<HTMLElement>(".ajax-loader");
	if (el) el.style.visibility = show ? "visible" : "hidden";
}

function setTotalLabels(amount: number) {
	const txt = fmtBRL(amount);
	document.querySelectorAll(".cart-total-value").forEach((n) => {
		n.textContent = txt;
	});
}

function renderProductThumbs(lines: CartLine[]) {
	const items = lines
		.map(
			(l) =>
				`<div class="item"><img src="${escapeAttr(l.image)}" alt="${escapeAttr(l.title)}" title="${escapeAttr(l.title)}"></div>`,
		)
		.join("");
	const inner = `<div class="asScrollable-container" style="height:87px"><div class="product-wrapper asScrollable-content" style="height:70px;justify-content:flex-start">${items}</div></div>`;
	document.querySelectorAll(".product-content").forEach((pc) => {
		pc.innerHTML = inner;
	});
}

function escapeAttr(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;");
}

let timerId = 0;
function startCountdown(seconds: number, onEnd: () => void) {
	window.clearInterval(timerId);
	const spans = document.querySelectorAll(".pix-countdown-remaining");
	const tick = () => {
		seconds = Math.max(0, seconds - 1);
		const m = Math.floor(seconds / 60);
		const sec = seconds % 60;
		const label = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
		spans.forEach((s) => (s.textContent = label));
		if (seconds <= 0) {
			window.clearInterval(timerId);
			onEnd();
		}
	};
	tick();
	timerId = window.setInterval(tick, 1000);
}

function setExpired(expired: boolean) {
	document.querySelectorAll(".content-pix").forEach((el) => {
		el.classList.toggle("is-pix-expired", expired);
	});
}

function wireCopy() {
	document.querySelectorAll(".copy_digitable_line").forEach((btn) => {
		btn.addEventListener("click", async () => {
			if ((btn as HTMLButtonElement).type !== "button" && (btn as HTMLElement).tagName !== "BUTTON")
				return;
			const root = (btn as HTMLElement).closest(".content-pix");
			const input = root?.querySelector<HTMLInputElement>(".key-pix-input");
			if (!input?.value) return;
			try {
				await navigator.clipboard.writeText(input.value);
			} catch {
				input.select();
				document.execCommand("copy");
			}
			const span = (btn as HTMLElement).querySelector("span");
			const t = span || btn;
			const prev = t.textContent;
			if (span) span.textContent = " COPIADO!";
			window.setTimeout(() => {
				if (span) span.textContent = prev;
			}, 2000);
		});
	});
}

function wireCollapse() {
	document.querySelectorAll(".collapse-button").forEach((btn) => {
		btn.addEventListener("click", () => {
			const wrap = btn.closest(".info-wrapper, .details-wrapper");
			const card = wrap?.querySelector<HTMLElement>("[id^='info-card'], [id^='details-card']");
			if (!card) return;
			const web = card.id.endsWith("-web");
			if (web) {
				card.classList.toggle("d-none-fade-web");
			} else {
				card.classList.toggle("d-none-fade");
			}
		});
	});
}

async function loadPixCharge() {
	const lines = readCart();
	if (!lines.length) {
		window.location.href = "/carrinho/";
		return;
	}

	let shippingBRL = 0;
	try {
		const raw = sessionStorage.getItem(CHECKOUT_KEY);
		if (raw) {
			const pay = JSON.parse(raw) as { shippingBRL?: number };
			if (typeof pay.shippingBRL === "number") shippingBRL = pay.shippingBRL;
		}
	} catch {
		/* ignore */
	}

	const amount = cartTotal(lines) + shippingBRL;
	setTotalLabels(amount);
	renderProductThumbs(lines);

	if (!hasPixApiConfigured()) {
		showLoader(false);
		document.querySelectorAll(".pix-api-missing").forEach((e) => {
			(e as HTMLElement).style.display = "block";
		});
		return;
	}

	document.querySelectorAll(".pix-api-missing").forEach((e) => {
		(e as HTMLElement).style.display = "none";
	});

	window.clearInterval(timerId);
	showLoader(true);
	setExpired(false);

	try {
		let checkout: Record<string, unknown> = {};
		try {
			const cr = sessionStorage.getItem(CHECKOUT_KEY);
			if (cr) checkout = JSON.parse(cr) as Record<string, unknown>;
		} catch {
			/* */
		}
		const customer = (checkout.customer as Record<string, string>) || {};
		const shipping = (checkout.shipping as Record<string, string>) || {};

		// Sanitiza os campos do buyer antes de enviar para a BuckPay
		const rawDocument = (customer.document ?? "").replace(/\D/g, "");
		const rawPhone = (customer.phone ?? customer.telephone ?? "").replace(/\D/g, "");
		const buyerPhone = rawPhone
			? rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`
			: "";

		const buyer: Record<string, string> = {};
		if (customer.name?.trim()) buyer.name = customer.name.trim();
		if (customer.email?.trim()) buyer.email = customer.email.trim();
		if (rawDocument.length === 11 || rawDocument.length === 14) buyer.document = rawDocument;
		if (buyerPhone.length >= 12 && buyerPhone.length <= 13) buyer.phone = buyerPhone;

		// Chama o proxy server-side (evita CORS — a BuckPay só aceita chamadas servidor-a-servidor)
		const amountCents = Math.max(600, Math.round(amount * 100));
		const proxyRes = await fetch("/api/pix-charge/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				external_id: `loja-${Date.now()}`,
				payment_method: "pix",
				amount: amountCents,
				...(Object.keys(buyer).length > 0 ? { buyer } : {}),
			}),
		});

		const rawText = await proxyRes.text();
		console.log("[pix-charge] status:", proxyRes.status, "body:", rawText);

		if (!proxyRes.ok) {
			let detail = `Erro ${proxyRes.status} ao gerar Pix.`;
			try {
				const errJson = JSON.parse(rawText) as {
					error?: { detail?: unknown; message?: string };
				};
				const d = errJson?.error?.detail;
				const m = errJson?.error?.message;
				if (d !== undefined && d !== null) {
					detail = typeof d === "string" ? d : JSON.stringify(d);
				} else if (m) {
					detail = m;
				}
			} catch { /* sem JSON */ }
			throw new Error(detail);
		}

		const rawObj = JSON.parse(rawText) as any;
		const pixCode = rawObj?.data?.pix?.code || rawObj?.code || rawObj?.qr_code || rawObj?.pix_code || "";
		
		if (!pixCode) throw new Error(`BuckPay não retornou o código PIX. Resposta: ${rawText.slice(0, 200)}`);

		document.querySelectorAll<HTMLInputElement>(".key-pix-input").forEach((inp) => {
			inp.value = pixCode;
		});

		let qrcodeBase64 = 
			rawObj?.data?.pix?.qr_code_base64 ||
			rawObj?.data?.pix?.qrcode_base64 ||
			rawObj?.data?.pix?.qrcode ||
			rawObj?.data?.qrcode_base64 ||
			rawObj?.qr_code_base64 ||
			rawObj?.qrcode_base64 ||
			rawObj?.data?.pix?.qr_code ||
			"";

		let srcUrl = "";
		if (qrcodeBase64) {
			srcUrl = qrcodeBase64;
			if (!qrcodeBase64.startsWith("http") && !qrcodeBase64.startsWith("data:image")) {
				srcUrl = `data:image/png;base64,${qrcodeBase64}`;
			}
		} else if (pixCode) {
			srcUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`;
		}

		if (srcUrl) {
			document.querySelectorAll<HTMLImageElement>("img.qrcode").forEach((qr) => {
				qr.setAttribute("src", srcUrl);
				qr.style.setProperty("display", "block", "important");
			});
		}

		// TikTok CompletePayment
		if (window.ttq) {
			window.ttq.track("CompletePayment", {
				contents: lines.map((l) => ({
					content_id: l.slug,
					content_name: l.title,
					content_type: "product",
					quantity: l.quantity,
					price: l.unitPrice,
				})),
				content_type: "product",
				value: amount,
				currency: "BRL",
			});
			console.log("[TikTok Pixel] Tracked: CompletePayment", amount);
		}

		showLoader(false);
		startCountdown(600, () => setExpired(true));
	} catch (e) {
		showLoader(false);
		console.error(e);
		const err = document.querySelector<HTMLElement>(".pix-error-msg");
		if (err) {
			err.textContent =
				e instanceof Error ? e.message : "Não foi possível gerar o Pix. Tente novamente.";
			err.style.display = "block";
		}
	}
}

export function initPixCheckoutPage() {
	// Força a página a carregar sempre no topo, evitando scroll para o carrinho/detalhes
	window.scrollTo(0, 0);

	wireCopy();
	wireCollapse();

	document.querySelectorAll(".js-regenerate-pix").forEach((btn) => {
		btn.addEventListener("click", () => {
			setExpired(false);
			void loadPixCharge();
		});
	});

	void loadPixCharge();
}
