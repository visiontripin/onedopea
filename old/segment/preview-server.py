#!/usr/bin/env python3
"""Статический сервер + маршрут /download с Content-Disposition: attachment."""
import http.server
import socketserver

FILE = 'capsules-segment-standalone.html'
DOWNLOAD_NAME = 'onedopea-capsules.html'


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ('/download', '/download/'):
            self.serve_download()
        elif self.path == '/':
            self.path = '/' + FILE
            super().do_GET()
        else:
            super().do_GET()

    def serve_download(self):
        with open(FILE, 'rb') as fh:
            data = fh.read()
        self.send_response(200)
        self.send_header('Content-Type', 'application/octet-stream')
        self.send_header('Content-Disposition',
                         f'attachment; filename="{DOWNLOAD_NAME}"')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('0.0.0.0', 8000), Handler) as srv:
    srv.serve_forever()
