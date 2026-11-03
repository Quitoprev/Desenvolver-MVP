from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    p=b.new_page(viewport={'width':1000,'height':900});p.on('pageerror',lambda e:errs.append(str(e)))
    host='app.vincla.app.br'
    p.route(f'https://{host}/**',lambda rq,*_a:rq.fulfill(body=open('/home/claude/lumo/'+(rq.request.url.split('/')[-1] or 'index.html').split('?')[0]).read(),content_type='text/javascript' if rq.request.url.endswith('.js') else 'text/css' if rq.request.url.endswith('.css') else 'text/html'))
    p.route('**/supabase.js',lambda rq,*_a:rq.fulfill(body='window.__ROLE="dona";window.__ME="u-dona";'+open('mock.js').read(),content_type='text/javascript'))
    p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.VINCLA_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
    p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
    p.goto(f'https://{host}/index.html');p.wait_for_timeout(1500)
    p.click('text=Pacientes');p.wait_for_timeout(300);p.click('text=+ Novo paciente');p.wait_for_timeout(300)
    opts=lambda: p.eval_on_selector_all('#v_prof option',"os=>os.map(o=>o.textContent)")
    print('todos:',opts())
    p.fill('#v_ter','Fonoaudiologia');p.dispatch_event('#v_ter','input');p.wait_for_timeout(100)
    print('fono:',opts(),'|',p.inner_text('#v_profNote'))
    p.fill('#v_ter','Terapia ocupacional');p.dispatch_event('#v_ter','input');p.wait_for_timeout(100)
    print('TO:',opts(),'| sel=',p.input_value('#v_prof'),'|',p.inner_text('#v_profNote'))
    p.fill('#v_ter','Musicoterapia');p.dispatch_event('#v_ter','input');p.wait_for_timeout(100)
    print('musico:',opts(),'|',p.inner_text('#v_profNote'))
    p.fill('#v_ter','fono');p.dispatch_event('#v_ter','input');p.wait_for_timeout(100)
    print('parcial fono:',opts())
    p.screenshot(path='/home/claude/terapia.png');b.close()
print('ERR',errs or 'none')
