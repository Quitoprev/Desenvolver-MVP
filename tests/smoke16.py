from playwright.sync_api import sync_playwright
import zipfile,io
errs=[]
def page(b,role,me,pre="",w=1000,url='http://127.0.0.1:8765/index.html'):
    p=b.new_page(viewport={'width':w,'height':900},accept_downloads=True)
    p.on('pageerror',lambda e:errs.append(role+': '+str(e)))
    p.route('**/supabase.js',lambda rq,*_a,rl=role,mm=me,pp=pre:rq.fulfill(body=f'window.__ROLE="{rl}";window.__ME="{mm}";{pp}'+open('mock.js').read(),content_type='text/javascript'))
    p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.RYTHMOS_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
    p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
    p.route('**/jszip.min.js',lambda rq,*_a:rq.fulfill(body=open('/opt/node-tools/node_modules/jszip/dist/jszip.min.js').read() if __import__('os').path.exists('/opt/node-tools/node_modules/jszip/dist/jszip.min.js') else open('jszip.min.js').read(),content_type='text/javascript'))
    p.goto(url);p.wait_for_timeout(1500);return p
with sync_playwright() as pw:
    b=pw.chromium.launch()
    # gestora: banner teste, auditoria, exportação, admin tab
    p=page(b,'dona','u-dona','window.__ADMIN=true;')
    print('banner teste:',p.inner_text('.phase') [:60] if p.query_selector('.phase') else '-')
    print('tabs:',p.evaluate('[...document.querySelectorAll(".tab")].map(t=>t.dataset.tab)'))
    p.click('[data-tab=pacientes]');p.wait_for_timeout(300);p.click('.prow');p.wait_for_timeout(300);p.click('[data-act=abrirPront]');p.wait_for_timeout(500);p.fill('#pr_hab','x');p.click('#fPront [type=submit]');p.wait_for_timeout(500);p.evaluate('closeSheet()')
    p.click('#btnClinica');p.wait_for_timeout(300);p.click('[data-act=clinSub][data-v=auditoria]');p.wait_for_timeout(600)
    t=p.inner_text('#audBox');print('auditoria:',t.count('abriu prontuário'),'aberturas |',t.count('alterou')+t.count('criou'),'alterações | ex:',t.split('\n')[2][:70] if len(t.split('\n'))>2 else t[:80])
    p.click('[data-act=clinSub][data-v=dados]');p.wait_for_timeout(300)
    with p.expect_download(timeout=30000) as dl: p.click('[data-act=exportarTudo]')
    z=zipfile.ZipFile(dl.value.path());names=z.namelist();print('zip:',len(names),'arquivos; csvs:',sorted(n.split('/')[-1] for n in names if n.endswith('.csv'))[:6],'…; json:',any(n.endswith('tudo.json') for n in names))
    p.evaluate('closeSheet()')
    # MFA ativar
    p.click('#btnConta');p.wait_for_timeout(500);print('mfa box:',p.inner_text('#mfaBox')[:40]);p.click('[data-act=mfaLigar]');p.wait_for_timeout(400);print('qr:',bool(p.query_selector('#fMfaOn img')));p.fill('#mfa_on','000000');p.click('#fMfaOn [type=submit]');p.wait_for_timeout(300);print('código errado toast:',p.inner_text('#toast') if p.query_selector('#toast:not([hidden])') else '-')
    p.fill('#mfa_on','123456');p.click('#fMfaOn [type=submit]');p.wait_for_timeout(600);print('mfa ativa:',p.inner_text('#mfaBox')[:40])
    p.close()
    # administração (página separada)
    p=page(b,'dona','u-dona','window.__ADMIN=true;',url='http://127.0.0.1:8765/admin.html');print('admin stats:',p.evaluate('[...document.querySelectorAll(".stat b")].map(s=>s.innerText)'))
    p.click('[data-act=admClinica]');p.wait_for_timeout(300);p.select_option('#ad_status','atrasada');p.click('#fAdm [type=submit]');p.wait_for_timeout(600);print('após salvar:',p.inner_text('#view').count('atrasada'));p.close()
    # login com MFA pendente
    p=page(b,'dona','u-dona','window.__MFA=true;')
    print('tela mfa:',bool(p.query_selector('#fMfa')));p.fill('#mfa_code','123456');p.click('#fMfa [type=submit]');p.wait_for_timeout(1500);print('entrou após código:',not p.evaluate('document.getElementById("app").hidden'))
    p.close()
    # bloqueio
    p=page(b,'profissional','u-livia','window.__ASSIN="bloqueada";');print('profissional bloqueada vê:',p.inner_text('#gate h2'),'| exportar?',bool(p.query_selector('#gExportar')));p.close()
    p=page(b,'dona','u-dona','window.__ASSIN="bloqueada";');print('gestora bloqueada exportar?',bool(p.query_selector('#gExportar')));p.close()
    p=page(b,'dona','u-dona','window.__ASSIN="atrasada";');print('atrasada banner:',p.inner_text('.phase')[:50]);p.close()
    b.close()
print('ERR',errs or 'none')
