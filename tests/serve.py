import os; ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import http.server,functools,threading
H=functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT)
class Q(H.func):
    def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(Q,directory=ROOT))
threading.Thread(target=s.serve_forever,daemon=True).start()
import runpy,sys
sys.argv=['x']+sys.argv[1:]
exec(open(sys.argv[1]).read())
