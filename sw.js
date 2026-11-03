/* Vincla — service worker. Guarda só a "casca" do app (html, css, js, ícones)
   para abrir rápido e instalar como app. Dados do Supabase nunca passam por aqui. */
const VERSAO = "vincla-v11";
const ARQUIVOS = ["./", "./index.html", "./styles.css", "./app.js", "./jogos.js", "./prontuario.js", "./painel.js", "./agenda.js", "./admin.js", "./config.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Supabase, CDNs: direto na rede
  // rede primeiro (pega atualizações na hora); se estiver sem internet, usa o que está guardado
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("./index.html"))));
});
