from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for role,me in [('dona','u-dona'),('profissional','u-livia')]:
        p=b.new_page(viewport={'width':1000,'height':900});p.on('pageerror',lambda e:errs.append(str(e)))
        p.route('**/supabase.js',lambda rq,*_a,rl=role,mm=me:rq.fulfill(body=f'window.__ROLE="{rl}";window.__ME="{mm}";'+open('mock.js').read(),content_type='text/javascript'))
        p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.RYTHMOS_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
        p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
        p.goto('http://127.0.0.1:8765/index.html');p.wait_for_timeout(1500)
        print(role,'tabs:',p.evaluate('[...document.querySelectorAll(".tab")].map(t=>t.dataset.tab)'))
        p.click('[data-tab=pacientes]');p.wait_for_timeout(300);p.click('.prow');p.wait_for_timeout(300);print(role,'pagador na ficha:',bool(p.query_selector('#p_cpf')));p.fill('#p_obs','teste');p.click('#fPac [type=submit]');p.wait_for_timeout(500);print(role,'salvou ficha:',p.inner_text('#toast') if p.query_selector('#toast:not([hidden])') else '-')
        if role=='dona':
            p.click('#btnClinica');p.wait_for_timeout(300);print('subtabs clínica:',p.evaluate('[...document.querySelectorAll("[data-act=clinSub]")].map(b=>b.dataset.v)'));p.click('[data-act=editMembro]');p.wait_for_timeout(300);print('recebe no membro:',bool(p.query_selector('#m_rec')));p.fill('#m_rep','30');p.click('#sheet form [type=submit]');p.wait_for_timeout(500);print('membro salvo:',p.inner_text('#toast') if p.query_selector('#toast:not([hidden])') else '-');p.keyboard.press('Escape');p.wait_for_timeout(300);p.evaluate('closeSheet()')
        p.evaluate('closeSheet()');p.wait_for_timeout(300);p.click('#btnConta');p.wait_for_timeout(300);print(role,'conta menciona Receita:','Receita' in p.inner_text('#sheet'));p.close()
    b.close()
print('ERR',errs or 'none')
