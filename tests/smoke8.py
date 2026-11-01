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
with sync_playwright() as pw:
    b=pw.chromium.launch()
    # ---- profissional (Lívia)
    p=page(b,'profissional','u-livia')
    p.click('[data-tab=pacientes]');p.wait_for_timeout(300)
    p.click('.prow');p.wait_for_timeout(300)
    nome=p.inner_text('#sheet h2');print('ficha:',nome)
    assert p.query_selector('[data-act=abrirPront]'),'botão prontuário ausente p/ profissional'
    p.click('[data-act=abrirPront]');p.wait_for_timeout(400)
    print('terapias no select:',p.evaluate('document.getElementById("pr_vin")?document.getElementById("pr_vin").options.length:1'))
    p.fill('#pr_ana','Queixa: atraso de fala.\nHistórico: nasceu a termo.');p.fill('#pr_ava','PROC aplicado em 10/10: 45 pontos.');p.fill('#pr_hab','Já nomeia 20 objetos.');p.fill('#pr_obj','Ampliar vocabulário para 50 palavras até dezembro.')
    p.click('#fPront [type=submit]');p.wait_for_timeout(600)
    print('salvo, anamnese recarregada:',p.input_value('#pr_ana')[:22],'| atualizado:',bool(p.query_selector('text=Atualizado em')))
    p.screenshot(path='pront-prof.png',full_page=True)
    # anexo
    p.set_input_files('#prFile',{'name':'laudo-neuro.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4 fake'});p.wait_for_timeout(600)
    print('docs após anexo:',p.evaluate('PR.docs.map(d=>d.nome)'))
    # abrir doc (signed url) -> popup
    with p.expect_popup() as pop: p.click('[data-act=prBaixar]')
    print('abriu:',pop.value.url[:50])
    # relatório word
    p.click('[data-act=prRelatorio]');p.wait_for_timeout(300)
    p.fill('#r_obs','Evolução satisfatória. Manter 2x/semana.')
    try:
        with p.expect_download(timeout=20000) as dl: p.click('#fRel [type=submit]')
        d=dl.value; path=d.path(); import zipfile,shutil; shutil.copy(path,'relatorio.docx'); z=zipfile.ZipFile(path); xml=z.read('word/document.xml').decode()
        print('download:',d.suggested_filename,'| tem anamnese:', 'atraso de fala' in xml,'| tem parecer:','Manter 2x' in xml,'| tem profissional:','Lívia' in xml)
        p.wait_for_timeout(800);print('docs após relatório:',p.evaluate('PR.docs.map(d=>d.nome)'))
        p.screenshot(path='pront-docs.png',full_page=True)
    except Exception as e: print('RELATORIO FALHOU:',str(e)[:200])
    pid=p.evaluate('PR.pid');p.close()
    # ---- recepção
    p=page(b,'recepcao','u-bia')
    p.click('[data-tab=pacientes]');p.wait_for_timeout(300);p.click('.prow');p.wait_for_timeout(300)
    print('recepção vê botão prontuário?',bool(p.query_selector('[data-act=abrirPront]')))
    p.close()
    # ---- dona
    p=page(b,'dona','u-dona')
    p.click('[data-tab=pacientes]');p.wait_for_timeout(300);p.click('.prow');p.wait_for_timeout(300)
    print('dona vê botão?',bool(p.query_selector('[data-act=abrirPront]')));p.click('[data-act=abrirPront]');p.wait_for_timeout(400)
    print('dona terapias:',p.evaluate('document.getElementById("pr_vin")?[...document.getElementById("pr_vin").options].map(o=>o.textContent):["(uma)"]'))
    p.close()
    # ---- Rafael não vê prontuário da Lívia (mock é por página; só confere o botão para paciente que ele não atende)
    p=page(b,'profissional','u-rafael')
    p.click('[data-tab=pacientes]');p.wait_for_timeout(300)
    n=len(p.query_selector_all('.prow'));print('Rafael pacientes:',n)
    p.close(); b.close()
print('ERR',errs or 'none')
