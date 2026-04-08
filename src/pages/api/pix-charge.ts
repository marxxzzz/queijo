/**
 * Endpoint server-side: proxy para a API BuckPay.
 * O browser não pode setar User-Agent nem fazer fetch cross-origin direto.
 * Este endpoint roda no servidor e repassa a chamada com os headers corretos.
 *
 * POST /api/pix-charge/
 */
export const prerender = false;

import type { APIRoute } from "astro";

const BUCKPAY_BASE = "https://api.realtechdev.com.br";
const BUCKPAY_USER_AGENT = "Buckpay API";

export const POST: APIRoute = async ({ request }) => {
	const token = import.meta.env.PUBLIC_BUCKPAY_TOKEN?.trim() ?? "";

	if (!token) {
		return new Response(
			JSON.stringify({ error: "PUBLIC_BUCKPAY_TOKEN não configurado no .env" }),
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

	const upstream = await fetch(`${BUCKPAY_BASE}/v1/transactions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
			"User-Agent": BUCKPAY_USER_AGENT,
		},
		body: JSON.stringify(body),
	});

	const text = await upstream.text();

	return new Response(text, {
		status: upstream.status,
		headers: { "Content-Type": "application/json" },
	});
};
