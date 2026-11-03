import os
from playwright.sync_api import sync_playwright
import zipfile,shutil
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch();p=b.new_page(viewport={'width':1000,'height':900},accept_downloads=True)
    p.on('pageerror',lambda e:errs.append(str(e)))
    p.route('**/supabase.js',lambda rq,*_a:rq.fulfill(body='window.__ROLE="profissional";window.__ME="u-livia";'+open('mock.js').read(),content_type='text/javascript'))
    p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.VINCLA_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
    p.route('**/index.umd.min.js',lambda rq,*_a:rq.fulfill(body=(open('docx.umd.js').read() if os.path.exists('docx.umd.js') else rq.fetch().text),content_type='text/javascript'))
    p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
    p.goto('http://127.0.0.1:8765/index.html');p.wait_for_timeout(1500)
    p.click('[data-tab=pacientes]');p.wait_for_timeout(300);p.click('.prow:has-text("Theo")');p.wait_for_timeout(300);p.click('[data-act=abrirPront]');p.wait_for_timeout(500)
    print('catálogo:',len(p.query_selector_all('.prProt:not(.novo)')),'protocolos |',len(p.query_selector_all('.prArea')),'áreas')
    p.evaluate('document.querySelector(".prCat").open=true;document.querySelectorAll(".prArea").forEach(d=>d.open=true)')
    abfw=p.query_selector('.prChk[value^="ABFW"]');abfw.check();p.wait_for_timeout(100)
    row=abfw.evaluate_handle('e=>e.closest(".prProt")');print('data auto:',row.evaluate('r=>r.querySelector("input[type=date]").value'),'| campos visíveis:',row.evaluate('r=>getComputedStyle(r.querySelector(".prProtF")).display'))
    row.evaluate('r=>{r.querySelector("input[type=date]").value="2026-02-10";r.querySelector("input[placeholder^=Resultado]").value="Vocabulário: 40% de designação verbal usual"}')
    p.check('.prChk[value^="PROC"]');p.fill('input[name=po_nome]','Protocolo próprio de observação de brincar');p.fill('input[name=po_res]','Brincar funcional emergente')
    p.click('#fPront [type=submit]');p.wait_for_timeout(700)
    print('salvo:',p.evaluate('JSON.stringify(PR.dados[PR.vid].protocolos)'))
    print('resumo:',p.inner_text('.prCat > summary'))
    p.evaluate('document.querySelector(".prCat").scrollIntoView({block:"start"})');p.wait_for_timeout(200);p.screenshot(path='protocolos.png')
    p.click('[data-act=prRelatorio]');p.wait_for_timeout(300);p.select_option('#r_tipo','avaliacao');p.uncheck('input[name=guardar]')
    with p.expect_download(timeout=20000) as dl: p.click('#fRel [type=submit]')
    shutil.copy(dl.value.path(),'relatorio-avaliacao.docx');xml=zipfile.ZipFile(dl.value.path()).read('word/document.xml').decode();print('relatório tem protocolos:','Protocolos e testes aplicados' in xml and 'ABFW' in xml and 'Brincar funcional' in xml)
    p.set_viewport_size({'width':390,'height':800});p.evaluate('renderProntuario()');p.wait_for_timeout(300);print('mobile sw:',p.evaluate('document.getElementById("sheet").scrollWidth'))
    b.close()
print('ERR',errs or 'none')
