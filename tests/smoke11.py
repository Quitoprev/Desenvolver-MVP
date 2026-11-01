from playwright.sync_api import sync_playwright
errs=[]
def page(b,role,me,w=1000):
    p=b.new_page(viewport={'width':w,'height':900})
    p.on('pageerror',lambda e:errs.append(role+': '+str(e)))
    p.route('**/supabase.js',lambda rq,*_a,rl=role,mm=me:rq.fulfill(body=f'window.__ROLE="{rl}";window.__ME="{mm}";'+open('mock.js').read(),content_type='text/javascript'))
    p.route('**/config.js',lambda rq,*_a:rq.fulfill(body='window.RYTHMOS_CONFIG={SUPABASE_URL:"https://x.supabase.co",SUPABASE_ANON_KEY:"k"}',content_type='text/javascript'))
    p.route('**/xlsx.full.min.js',lambda rq,*_a:rq.fulfill(body='',content_type='text/javascript'))
    p.goto('http://127.0.0.1:8765/index.html');p.wait_for_timeout(1500);return p
with sync_playwright() as pw:
    b=pw.chromium.launch()
    p=page(b,'dona','u-dona')
    print('subtabs:',p.evaluate('[...document.querySelectorAll("[data-act=agVista]")].map(b=>b.textContent)'))
    p.click('[data-act=agVista][data-v=semana]');p.wait_for_timeout(300)
    print('semana cols:',len(p.query_selector_all('.agCol')),'sessões:',len(p.query_selector_all('.agSes')),'stats:',p.evaluate('[...document.querySelectorAll(".stat b")].map(s=>s.innerText)'))
    p.screenshot(path='ag-semana.png',full_page=True)
    p.click('[data-act=agSem][data-n="1"]');p.wait_for_timeout(200);print('próx semana:',p.inner_text('.daynav h2'))
    p.click('[data-act=agVista][data-v=mes]');p.wait_for_timeout(300)
    print('mês:',p.inner_text('.daynav h2'),'dias:',len(p.query_selector_all('.agMesDia:not(.vazio)')),'com sessão:',len(p.query_selector_all('.agMesDia .q')))
    p.screenshot(path='ag-mes.png',full_page=True)
    d=p.query_selector('.agMesDia .q');d.click();p.wait_for_timeout(300);print('clicou dia → vista:',p.evaluate('AG.vista'),p.inner_text('.daynav h2'))
    p.click('[data-act=agVista][data-v=mes]');p.wait_for_timeout(200);p.click('[data-act=agProf]');p.wait_for_timeout(300);print('filtro prof:',p.evaluate('S.prof'),'| por prof oculto:',not p.query_selector('[data-act=agProf]'))
    p.set_viewport_size({'width':390,'height':800});p.evaluate('render()');p.wait_for_timeout(300);print('mês mobile sw:',p.evaluate('document.documentElement.scrollWidth'));p.screenshot(path='ag-mes-390.png',full_page=True)
    p.click('[data-act=agVista][data-v=semana]');p.wait_for_timeout(300);print('semana mobile sw:',p.evaluate('document.documentElement.scrollWidth'));p.screenshot(path='ag-sem-390.png',full_page=True)
    p.close()
    p=page(b,'profissional','u-livia');p.click('[data-act=agVista][data-v=semana]');p.wait_for_timeout(300);print('Lívia semana sessões:',len(p.query_selector_all('.agSes')),'por prof:',bool(p.query_selector('[data-act=agProf]')));p.close()
    b.close()
print('ERR',errs or 'none')
