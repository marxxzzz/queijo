/**
 * Endpoint server-side: proxy para a API BuckPay.
 * O browser não pode fazer fetch cross-origin direto (CORS).
 * Este endpoint roda no servidor e repassa a chamada com os headers corretos.
 *
 * POST /api/pix-charge/
 */
export const prerender = false;

import type { APIRoute } from "astro";

const BUCKPAY_BASE = "https://api.realtechdev.com.br";
const BUCKPAY_USER_AGENT = "Buckpay API";

export const POST: APIRoute = async ({ request }) => {
	// Aceita token privado (BUCKPAY_TOKEN) ou público como fallback
	const token =
		(import.meta.env.BUCKPAY_TOKEN?.trim() || import.meta.env.PUBLIC_BUCKPAY_TOKEN?.trim()) ?? "";

	if (!token) {
		return new Response(
			JSON.stringify({ error: "BUCKPAY_TOKEN não configurado nas variáveis de ambiente" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Body inválido" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	let upstream: Response;
	try {
		upstream = await fetch(`${BUCKPAY_BASE}/v1/transactions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
				"User-Agent": BUCKPAY_USER_AGENT,
			},
			body: JSON.stringify(body),
		});
	} catch (err) {
		return new Response(
			JSON.stringify({ error: "Falha de rede ao conectar com a BuckPay", detail: String(err) }),
			{ status: 502, headers: { "Content-Type": "application/json" } },
		);
	}

	const text = await upstream.text();

	return new Response(text, {
		status: upstream.status,
		headers: { "Content-Type": "application/json" },
	});
};

