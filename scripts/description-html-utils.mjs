import * as cheerio from "cheerio";

/**
 * Remove font-family / <font face> do HTML colado do WordPress para herdar Montserrat do tema.
 */
export function normalizeDescriptionHtml(html) {
	if (!html || typeof html !== "string") return html;
	const $ = cheerio.load(`<div id="__astro-desc-root">${html}</div>`, {
		decodeEntities: false,
	});
	const root = $("#__astro-desc-root");

	root.find("[style]").each((_, el) => {
		const $el = $(el);
		const style = $el.attr("style");
		if (!style) return;
		const next = style
			.replace(/font-family\s*:\s*[^;]+;?/gi, "")
			.replace(/;;+/g, ";")
			.replace(/^;|;$/g, "")
			.trim();
		if (next) $el.attr("style", next);
		else $el.removeAttr("style");
	});

	root.find("font").each((_, el) => {
		$(el).replaceWith($(el).contents());
	});

	return root.html() ?? html;
}
