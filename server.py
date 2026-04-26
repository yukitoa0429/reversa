import http.server
import socketserver
import os
import wave
import struct
import json
import urllib.parse

# Configuration
PORT = 8081
SAVE_DIR = "assets/audio"
THRESHOLD = 1000  # Base threshold
WINDOW_SIZE = 441  # 10ms at 44.1kHz (Moving average window)

class MasterAudioSaveHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed_url.query)
        
        filename = query.get('filename', ['unknown.wav'])[0]
        folder = query.get('folder', ['parts'])[0]
        
        content_length = int(self.headers.get('Content-Length', 0))
        audio_data = self.rfile.read(content_length)
        
        target_dir = os.path.join(SAVE_DIR, folder)
        if not os.path.exists(target_dir): os.makedirs(target_dir)
        
        raw_path = os.path.join(target_dir, f"raw_{filename}")
        final_path = os.path.join(target_dir, filename)

        with open(raw_path, 'wb') as f:
            f.write(audio_data)

        try:
            self.trim_silence_smart(raw_path, final_path)
            if os.path.exists(raw_path): os.remove(raw_path)
            print(f"SAVED & TRIMMED: {final_path}")
            
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode())
        except Exception as e:
            err_msg = str(e)
            print(f"ERROR during processing {filename}: {err_msg}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "error", "message": err_msg}).encode())

    def trim_silence_smart(self, in_path, out_path):
        """Uses a sliding window to find the actual start/end of speech more reliably."""
        with wave.open(in_path, 'rb') as wr:
            params = wr.getparams()
            n_channels, sampwidth, framerate, n_frames, comptype, compname = params
            frames = wr.readframes(n_frames)
            samples = struct.unpack(f"<{n_frames * n_channels}h", frames)
            
            # Simple absolute RMS-like average over WINDOW_SIZE
            def get_window_energy(idx):
                window = samples[idx : idx + WINDOW_SIZE * n_channels]
                if not window: return 0
                return sum(abs(s) for s in window) / len(window)

            # Find Start (Forward scan)
            start_index = 0
            for i in range(0, len(samples) - WINDOW_SIZE * n_channels, n_channels):
                if get_window_energy(i) > THRESHOLD:
                    # Move back a tiny bit to avoid clipping the very first consonant
                    start_index = max(0, i - (n_channels * 100)) 
                    break
            
            # Find End (Backwards scan)
            end_index = len(samples) - 1
            for i in range(len(samples) - (WINDOW_SIZE + 1) * n_channels, start_index, -n_channels):
                if get_window_energy(i) > THRESHOLD:
                    # Move forward a bit to give a natural decay
                    end_index = min(len(samples) - 1, i + (n_channels * 200)) 
                    break
            
            trimmed_samples = samples[start_index:end_index+1]
            trimmed_frames = struct.pack(f"<{len(trimmed_samples)}h", *trimmed_samples)
            
            with wave.open(out_path, 'wb') as ww:
                ww.setparams(params)
                ww.writeframes(trimmed_frames)

if __name__ == "__main__":
    if not os.path.exists(SAVE_DIR): os.makedirs(SAVE_DIR)
    socketserver.TCPServer.allow_reuse_address = True
    print(f"Smart Audio Server running on http://127.0.0.1:{PORT}")
    with socketserver.TCPServer(("127.0.0.1", PORT), MasterAudioSaveHandler) as httpd:
        httpd.serve_forever()
