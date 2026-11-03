import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
errs=[]
with sync_playwright() as pw:
    b=pw.chromium.launch()
    for host,esperado in [('admin.vincla.app.br','Administração do Vincla'),('app.vincla.app.br','Clínica Desenvolver')]:
        p=b.new_page(viewport={'width':1000,'height':900});p.on('pageerror',lambda e:errs.append(str(e)))
        p.route(f'https://{host}/**',lambda rq,*_a:rq.fulfill(body=open(ROOT+'/'+(rq.request.url.split('/')[-1] or 'index.html').split('?')[0]).read(),content_type='text/javascript' if rq.request.url.endswith('.js') else 'text/css' if rq.request.url.endswith('.css') else 'text/html'))
        p.route('**/supabase.js',lambda rq,*_a:rq.fulfill(body='window.__ROLE="dona";window.__ME="u-dona";window.__ADMIN=true;'+open('mock.js').read(),content_type='text/javascript'))
        p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.VINCLA_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
        p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
        p.goto(f'https://{host}/index.html');p.wait_for_timeout(1500)
        print(host,'→',p.inner_text('#clinicName')[:40],'| ok' if esperado in p.inner_text('#clinicName') else '| ERRADO')
        p.close()
    b.close()
print('ERR',errs or 'none')
