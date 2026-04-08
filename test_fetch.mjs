import fs from "fs";

async function run() {
    try {
        const url = "https://loja-oficial-online.shop/produto/bau-especial-11-tipos-de-queijos-2-embutidos-caixa-personalizada/";
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36" } });
        console.log("Status:", res.status);
        const text = await res.text();
        fs.writeFileSync("test_html.html", text);
        console.log("Saved to test_html.html. Length:", text.length);
    } catch(e) {
        console.error("Error:", e);
    }
}
run();
