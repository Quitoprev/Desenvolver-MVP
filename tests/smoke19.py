from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    p=b.new_page(viewport={'width':1000,'height':900});p.on('pageerror',lambda e:errs.append(str(e)))
    host='app.vincla.app.br'
    p.route(f'https://{host}/**',lambda rq,*_a:rq.fulfill(body=open('/home/claude/lumo/'+(rq.request.url.split('/')[-1] or 'index.html').split('?')[0]).read(),content_type='text/javascript' if rq.request.url.endswith('.js') else 'text/css' if rq.request.url.endswith('.css') else 'text/html'))
    p.route('**/supabase.js',lambda rq,*_a:rq.fulfill(body='window.__ROLE="profissional";window.__ME="u-livia";'+open('mock.js').read(),content_type='text/javascript'))
    p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.VINCLA_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
    p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
    p.goto(f'https://{host}/index.html');p.wait_for_timeout(1500)
    p.click('#btnConta');p.wait_for_timeout(300)
    p.click('[data-act=trocarSenha]');p.wait_for_timeout(300)
    p.fill('#s_nova','SenhaNova123');p.fill('#s_conf','Diferente123');p.click('#fTrocaSenha [type=submit]');p.wait_for_timeout(300)
    print('mismatch toast:',p.inner_text('.toast') if p.query_selector('.toast') else '—')
    p.fill('#s_conf','SenhaNova123');p.click('#fTrocaSenha [type=submit]');p.wait_for_timeout(500)
    print('updateUser chamado com:',p.evaluate('window.__PW'))
    print('sheet fechado:',p.query_selector('#fTrocaSenha') is None)
    p.screenshot(path='/home/claude/senha.png');b.close()
print('ERR',errs or 'none')
