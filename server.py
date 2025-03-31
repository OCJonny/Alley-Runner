import http.server
import socketserver

PORT = 5000
BIND_ADDRESS = "0.0.0.0"  # Bind to all interfaces

class MyHandler(http.server.SimpleHTTPRequestHandler):
    # Set default headers for all responses
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        print(f"Handling GET request for: {self.path}")
        super().do_GET()

# Create the server with our custom handler
Handler = MyHandler
httpd = socketserver.TCPServer((BIND_ADDRESS, PORT), Handler)

print(f"Server running at http://{BIND_ADDRESS}:{PORT}/")
try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
    httpd.server_close()