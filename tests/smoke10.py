from playwright.sync_api import sync_playwright
errs=[]
def page(b,role,me,w=1000):
    p=b.new_page(viewport={'width':w,'height':900},accept_downloads=True)
    p.on('pageerror',lambda e:errs.append(role+': '+str(e)))
    p.route('**/supabase.js',lambda rq,*_a,rl=role,mm=me:rq.fulfill(body=f'window.__ROLE="{rl}";window.__ME="{mm}";'+open('mock.js').read(),content_type='text/javascript'))
    p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.RYTHMOS_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
    p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
    p.route('https://fonts.googleapis.com/**',lambda rq,*_a:rq.abort())
    p.goto('http://127.0.0.1:8765/index.html');p.wait_for_timeout(1500)
    return p
with sync_playwright() as pw:
    b=pw.chromium.launch()
    p=page(b,'dona','u-dona')
    print('tabs:',p.evaluate('[...document.querySelectorAll(".tab")].map(t=>t.dataset.tab)'))
    p.click('[data-tab=painel]');p.wait_for_timeout(800)
    t=p.inner_text('#view');print('stats:',p.evaluate('[...document.querySelectorAll(".stat")].map(s=>s.innerText.replace(/\\n/g," "))'))
    print('áreas:',[a for a in ['Comunicação','Integração sensorial','Socialização','Autonomia','Emocional'] if a in t])
    print('estagnadas:',t.count('desde'),'| sem avaliação 90d:',t.count('última '))
    p.screenshot(path='painel-6m.png',full_page=True)
    p.click('[data-act=pnMeses][data-n="12"]');p.wait_for_timeout(300);print('12m stats:',p.evaluate('[...document.querySelectorAll(".stat b")].map(s=>s.innerText)'))
    p.click('[data-act=pnMeses][data-n="3"]');p.wait_for_timeout(300);print('3m stats:',p.evaluate('[...document.querySelectorAll(".stat b")].map(s=>s.innerText)'))
    p.click('[data-act=pnMeses][data-n="12"]');p.wait_for_timeout(300)
    with p.expect_download() as dl: p.click('[data-act=pnCsv]')
    csv=open(dl.value.path(),encoding='utf-8-sig').read();print('csv linhas:',csv.count('\n'),'| cabeçalho:',csv.split('\r\n')[0])
    p.click('[data-act=pnAbrir]');p.wait_for_timeout(600);print('abre prontuário:',p.inner_text('#sheet h2'))
    p.set_viewport_size({'width':390,'height':800});p.click('[data-act=editPac]') if False else None;p.evaluate('closeSheet&&closeSheet()') if p.evaluate('typeof closeSheet') =='function' else p.keyboard.press('Escape');p.wait_for_timeout(300);p.evaluate('render()');p.wait_for_timeout(300)
    print('mobile sw:',p.evaluate('document.documentElement.scrollWidth'));p.screenshot(path='painel-390.png',full_page=True)
    p.close()
    for role,me in [('profissional','u-livia'),('recepcao','u-bia')]:
        p=page(b,role,me);print(role,'tem painel?','painel' in p.evaluate('[...document.querySelectorAll(".tab")].map(t=>t.dataset.tab)'));p.close()
    b.close()
print('ERR',errs or 'none')
