import http.server
import socketserver
import os

PORT = 7000
DIRECTORY = r"d:\Trae CN\trae_project\1"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    httpd.serve_forever()
