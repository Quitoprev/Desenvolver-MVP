import os
from playwright.sync_api import sync_playwright
errs=[]
def page(b,role,me,w=1000):
    p=b.new_page(viewport={'width':w,'height':900},accept_downloads=True)
    p.on('pageerror',lambda e:errs.append(role+': '+str(e)))
    p.route('**/supabase.js',lambda rq,*_a,rl=role,mm=me:rq.fulfill(body=f'window.__ROLE="{rl}";window.__ME="{mm}";'+open('mock.js').read(),content_type='text/javascript'))
    p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.RYTHMOS_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
    p.route('**/index.umd.min.js',lambda rq,*_a:rq.fulfill(body=(open('docx.umd.js').read() if os.path.exists('docx.umd.js') else rq.fetch().text),content_type='text/javascript'))
    p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
    p.route('https://fonts.googleapis.com/**',lambda rq,*_a:rq.abort())
    p.goto('http://127.0.0.1:8765/index.html');p.wait_for_timeout(1500)
    return p
def meta(p,desc,area):
    p.click('[data-act=prNovaMeta]');p.wait_for_timeout(300);p.fill('#m_desc',desc);p.select_option('#m_area',area);p.click('#fMeta [type=submit]');p.wait_for_timeout(500)
def avaliar(p,data,notas):
    p.click('[data-act=prAvaliar]');p.wait_for_timeout(300);p.fill('#a_data',data)
    ids=p.evaluate('PR.metas.filter(m=>m.vinculo_id===PR.vid&&m.ativa).map(m=>m.id)')
    for i,n in zip(ids,notas): p.check(f'input[name="n_{i}"][value="{n}"]')
    p.click('#fAval [type=submit]');p.wait_for_timeout(500)
with sync_playwright() as pw:
    b=pw.chromium.launch()
    p=page(b,'profissional','u-livia')
    p.click('[data-tab=pacientes]');p.wait_for_timeout(300);p.click('.prow');p.wait_for_timeout(300);p.click('[data-act=abrirPront]');p.wait_for_timeout(400)
    print('sem metas:',p.inner_text('#sheet').count('Nenhuma meta ainda'))
    meta(p,'Aumento de vocabulário expressivo','comunicacao');meta(p,'Funções comunicativas (pedir, comentar)','comunicacao');meta(p,'Engajamento em atividade conjunta','social')
    print('metas:',p.evaluate('PR.metas.length'),'| botão avaliar:',bool(p.query_selector('[data-act=prAvaliar]')))
    avaliar(p,'2026-01-31',[2,1,2]);avaliar(p,'2026-06-30',[3,2,4]);avaliar(p,'2026-10-31',[4,3,4])
    print('notas:',p.evaluate('PR.notas.length'),'| polylines:',len(p.query_selector_all('#sheet svg polyline')),'| seq meta1:',p.evaluate('PR.notas.filter(n=>n.meta_id===PR.metas[0].id).map(n=>n.nota).join("→")'))
    p.evaluate('document.querySelector("#sheet svg").scrollIntoView({block:"start"})');p.wait_for_timeout(200);p.screenshot(path='metas-prof.png')
    # upsert mesma data substitui
    avaliar(p,'2026-10-31',[5,3,4]);print('após refazer 31/10, notas:',p.evaluate('PR.notas.length'),'meta1 última:',p.evaluate('PR.notas.filter(n=>n.meta_id===PR.metas[0].id).slice(-1)[0].nota'))
    # editar meta: encerrar
    p.click(f'[data-act=prEditMeta][data-id="{p.evaluate("PR.metas[2].id")}"]');p.wait_for_timeout(300);print('avaliações na meta:',len(p.query_selector_all('#fMeta .hist > div')));p.select_option('#m_ativa','0');p.click('#fMeta [type=submit]');p.wait_for_timeout(500)
    print('encerrada → polylines:',len(p.query_selector_all('#sheet svg polyline')),'| pill:',p.inner_text('#sheet').count('encerrada'))
    # relatório com metas
    p.click('[data-act=prRelatorio]');p.wait_for_timeout(300);p.fill('#r_ini','2026-01-01');p.uncheck('input[name=guardar]')
    with p.expect_download(timeout=20000) as dl: p.click('#fRel [type=submit]')
    import zipfile,shutil; d=dl.value; shutil.copy(d.path(),'relatorio2.docx'); xml=zipfile.ZipFile(d.path()).read('word/document.xml').decode()
    print('relatório tem tabela de metas:','Metas e habilidades' in xml and 'vocabul' in xml and '<w:tbl>' in xml)
    # mobile
    p.set_viewport_size({'width':390,'height':800});p.wait_for_timeout(300);p.evaluate('renderProntuario()');p.wait_for_timeout(500)
    print('mobile sw:',p.evaluate('document.getElementById("sheet").scrollWidth'),'client:',p.evaluate('document.getElementById("sheet").clientWidth'));p.evaluate('(document.querySelector("#sheet svg")||document.body).scrollIntoView({block:"start"})');p.wait_for_timeout(200);p.screenshot(path='metas-390.png')
    p.close()
    # dona: visão geral (mock é por página, cria metas em 2 terapias)
    p=page(b,'dona','u-dona')
    p.click('[data-tab=pacientes]');p.wait_for_timeout(300);p.click('.prow');p.wait_for_timeout(300);p.click('[data-act=abrirPront]');p.wait_for_timeout(400)
    vins=p.evaluate('[...document.getElementById("pr_vin").options].map(o=>o.value)');print('dona terapias:',len(vins))
    meta(p,'Registro no sistema tátil','sensorial');avaliar(p,'2026-03-01',[2]);avaliar(p,'2026-09-01',[4])
    p.select_option('#pr_vin',vins[1]);p.wait_for_timeout(300);meta(p,'Vocabulário','comunicacao');avaliar(p,'2026-03-01',[1]);avaliar(p,'2026-09-01',[3])
    p.click('[data-act=prVerGeral]');p.wait_for_timeout(300);txt=p.inner_text('#sheet');print('geral áreas:',[a for a in ['Integração sensorial','Comunicação e linguagem'] if a in txt],'| +2.0:',txt.count('+2.0'))
    p.evaluate('document.querySelector("[data-act=prVerGeral]").scrollIntoView({block:"start"})');p.wait_for_timeout(200);p.screenshot(path='metas-geral.png');p.close()
    # recepção não tem
    p=page(b,'recepcao','u-bia');p.click('[data-tab=pacientes]');p.wait_for_timeout(300);p.click('.prow');p.wait_for_timeout(300);print('recepção botão:',bool(p.query_selector('[data-act=abrirPront]')));p.close()
    b.close()
print('ERR',errs or 'none')
