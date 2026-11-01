from playwright.sync_api import sync_playwright
errs=[]
def page(b,url,pre):
    p=b.new_page(viewport={'width':1000,'height':900});p.on('pageerror',lambda e:errs.append(str(e)))
    p.route('**/supabase.js',lambda rq,*_a,pp=pre:rq.fulfill(body=pp+open('mock.js').read(),content_type='text/javascript'))
    p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.RYTHMOS_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
    p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
    p.goto(url);p.wait_for_timeout(1500);return p
with sync_playwright() as pw:
    b=pw.chromium.launch()
    p=page(b,'http://127.0.0.1:8765/index.html','window.__ROLE="dona";window.__ME="u-dona";window.__ADMIN=true;');print('app da clínica, gestora admin, tabs:',p.evaluate('[...document.querySelectorAll(".tab")].map(t=>t.dataset.tab)'));p.close()
    p=page(b,'http://127.0.0.1:8765/admin.html','window.__ROLE="dona";window.__ME="u-dona";window.__ADMIN=true;');print('admin.html:',p.evaluate('[...document.querySelectorAll(".tab")].map(t=>t.textContent)'),'|',p.inner_text('#clinicName'),'| clínicas:',len(p.query_selector_all('[data-act=admClinica]')),'| botão Clínica oculto:',p.evaluate('document.getElementById("btnClinica").hidden'));p.screenshot(path='admin-html.png');p.close()
    p=page(b,'http://127.0.0.1:8765/admin.html','window.__ROLE="profissional";window.__ME="u-livia";');print('admin.html sem permissão:',p.inner_text('#gate h2'));p.close()
    b.close()
print('ERR',errs or 'none')
