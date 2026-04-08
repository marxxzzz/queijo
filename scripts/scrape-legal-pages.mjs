import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../src/data/legal-pages.json");

const BASE = "https://loja-oficial-online.shop";

/** Rotas no site de referência → chave no JSON (alinhado às páginas Astro) */
const PAGES = [
	{ key: "noticia-legal", path: "/noticia-legal/", title: "Aviso Legal" },
	{ key: "termos-e-servicos", path: "/termos-e-servicos/", title: "Termos e Serviços" },
	{ key: "politicas-de-envio", path: "/politicas-de-envio/", title: "Políticas de Envio" },
	{ key: "privacy-policy", path: "/privacy-policy/", title: "Política de Privacidade" },
	{ key: "informacoes-de-contato", path: "/informacoes-de-contato/", title: "Informações de contato" },
	{ key: "sample-page", path: "/sample-page/", title: "Políticas de Reembolso" },
];

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

function localizeHtml(html) {
	if (!html) return html;
	let h = html;
	h = h.replace(/https:\/\/loja-oficial-online\.shop\/?/gi, "/");
	h = h.replace(/<a href="\/"><strong>\/<\/strong><\/a>/g, '<a href="/"><strong>Loja Oficial</strong></a>');
	h = h.replace(
		/<a href=""\/>\s*<strong>https:\/\/[^<]*<\/strong><\/a>/gi,
		'<a href="/"><strong>Loja Oficial</strong></a>',
	);
	h = h.replace(/<a href=""\/>/gi, '<a href="/">');
	h = h.replace(/queijaria-oficial\.store/gi, "Loja Oficial");
	/* Cloudflare email placeholders → e-mail do rodapé do clone */
	h = h.replace(/\[email&#160;protected\]/gi, "contato@lojaoficial.com");
	h = h.replace(
		/<a><span class="__cf_email__"[^>]*>\[email[^<]*<\/span><\/a>/gi,
		'<a href="mailto:contato@lojaoficial.com">contato@lojaoficial.com</a>',
	);
	return h;
}

async function fetchPage(url) {
	const res = await fetch(url, {
		headers: { "user-agent": "loja-oficial-static-legal/1.0" },
	});
	if (!res.ok) throw new Error(`${url} → ${res.status}`);
	return res.text();
}

function extractMainHtml(html) {
	const $ = cheerio.load(html);
	let inner = $("#content.page-wrapper .col-inner").first().html();
	if (!inner?.trim()) inner = $("#main .content-area .col-inner").first().html();
	if (!inner?.trim()) inner = $("main .col-inner").first().html();
	return inner?.trim() || null;
}

async function main() {
	const out = {};

	for (const { key, path: p, title } of PAGES) {
		const url = `${BASE}${p}`;
		process.stdout.write(`Fetching ${key}… `);
		try {
			const raw = await fetchPage(url);
			let body = extractMainHtml(raw);
			if (body) body = localizeHtml(body);
			out[key] = {
				title,
				html: body || `<p>Não foi possível extrair o conteúdo de <code>${url}</code>.</p>`,
			};
			console.log(body ? "ok" : "empty");
		} catch (e) {
			console.log("fail:", e.message);
			out[key] = {
				title,
				html: `<p>Erro ao carregar conteúdo de referência. Execute <code>npm run scrape-legal</code> com rede disponível.</p>`,
			};
		}
		await sleep(200);
	}

	fs.mkdirSync(path.dirname(outPath), { recursive: true });
	fs.writeFileSync(outPath, JSON.stringify(out, null, "\t"));
	console.log("Wrote", outPath);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
