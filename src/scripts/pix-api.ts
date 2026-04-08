/**
 * Integração com a API BuckPay
 * Docs: https://docs.buckpay.com.br/docs
 *
 * Variável de ambiente necessária (em .env na raiz do projeto):
 *   PUBLIC_BUCKPAY_TOKEN=seu_token_de_40_caracteres
 */

const BUCKPAY_BASE = "https://api.realtechdev.com.br";
const BUCKPAY_USER_AGENT = "Buckpay API";

export type PixChargeItem = {
	title: string;
	quantity: number;
	unitPrice: number;
	slug?: string;
};

export type PixChargeResponse = {
	copyPaste: string;
	qrcodeDataUrl?: string;
	expiresInSeconds?: number;
};

function getToken(): string {
	return import.meta.env.PUBLIC_BUCKPAY_TOKEN?.trim() || "";
}

export function hasPixApiConfigured(): boolean {
	return Boolean(getToken());
}

export async function requestPixCharge(body: {
	amount: number;
	items: PixChargeItem[];
	customer?: Record<string, string>;
	shipping?: Record<string, string>;
	reference?: string;
}): Promise<PixChargeResponse> {
	const token = getToken();
	if (!token) {
		throw new Error("Configure PUBLIC_BUCKPAY_TOKEN no .env");
	}

	// Converte centavos (BRL → cents, mínimo R$ 6,00 = 600 cents)
	const amountCents = Math.max(600, Math.round(body.amount * 100));

	// external_id único por transação
	const externalId = body.reference ?? `loja-${Date.now()}`;

	// Monta objeto buyer a partir dos dados do checkout
	const customer = body.customer ?? {};
	const buyerName = customer.name?.trim() || "";
	const buyerEmail = customer.email?.trim() || "";
	const buyerDocument = (customer.document ?? "").replace(/\D/g, "");
	// Telefone: strip não-dígitos e adiciona DDI 55 se necessário
	const rawPhone = (customer.telephone ?? "").replace(/\D/g, "");
	const buyerPhone = rawPhone
		? rawPhone.startsWith("55")
			? rawPhone
			: `55${rawPhone}`
		: "";

	const buyer: Record<string, string> = {};
	if (buyerName) buyer.name = buyerName;
	if (buyerEmail) buyer.email = buyerEmail;
	if (buyerDocument.length === 11 || buyerDocument.length === 14)
		buyer.document = buyerDocument;
	if (buyerPhone.length >= 12 && buyerPhone.length <= 13)
		buyer.phone = buyerPhone;

	const payload: Record<string, unknown> = {
		external_id: externalId,
		payment_method: "pix",
		amount: amountCents,
	};

	if (Object.keys(buyer).length > 0) {
		payload.buyer = buyer;
	}

	let res: Response;
	try {
		res = await fetch(`${BUCKPAY_BASE}/v1/transactions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				"User-Agent": BUCKPAY_USER_AGENT,
			},
			body: JSON.stringify(payload),
		});
	} catch (err) {
		throw new Error(
			"Falha de rede ao gerar Pix (Failed to fetch). Verifique se a API está online e se o CORS da BuckPay libera o domínio da sua loja.",
		);
	}

	if (!res.ok) {
		let detail = `BuckPay API ${res.status}`;
		try {
			const err = (await res.json()) as { error?: { detail?: string; message?: string } };
			detail = err?.error?.detail ?? err?.error?.message ?? detail;
		} catch {
			/* sem JSON */
		}
		throw new Error(detail);
	}

	const data = (await res.json()) as {
		data?: {
			pix?: { code?: string; qrcode_base64?: string };
			total_amount?: number;
		};
	};

	const pixCode = data?.data?.pix?.code ?? "";
	if (!pixCode) {
		throw new Error("BuckPay não retornou o código PIX (data.pix.code).");
	}

	const qrcodeBase64 = data?.data?.pix?.qrcode_base64 ?? "";

	return {
		copyPaste: pixCode,
		qrcodeDataUrl: qrcodeBase64 ? `data:image/png;base64,${qrcodeBase64}` : undefined,
		expiresInSeconds: 600, // PIX BuckPay expira em 10 min por padrão
	};
}
