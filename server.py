"""
Reversa - 音声解析バックエンドサーバー

【目的】
ブラウザから送信された音声データを受け取り、無音部分を自動でカット（トリミング）して
サーバー内の適切なディレクトリに保存します。

【主な機能】
1. 音声データの受信: クライアント（ブラウザ）からPOSTされた音声データ（WAV形式）を受信します。
2. スマート・トリミング: 音声の「始まり」と「終わり」のエネルギーを解析し、
   前後の不要な空白を自動で削除します。これにより、一拍の音がクリアに再生されます。
3. 整理保存: レベル別、あるいは五十音パーツ別にフォルダを分けて保存・管理します。

【使い方】
通常は `run.bat` から自動的に起動されます。
単体で起動する場合は `python server.py` を実行してください（Port 8081 で待機します）。
"""

import http.server
import socketserver
import json
import os
import wave
import struct

# --- 設定パラメータ ---
PORT = 8081
SAVE_DIR = "assets/audio"
THRESHOLD = 150       # 無音判定のしきい値（この値を超えると「声」とみなす）
WINDOW_SIZE = 500     # 解析するサンプルの窓幅

class ReversaAudioHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """CORS（ブラウザのセキュリティ設定）への対応"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """音声データのアップロード処理"""
        self.send_header('Access-Control-Allow-Origin', '*')
        
        content_length = int(self.headers['Content-Length'])
        audio_data = self.rfile.read(content_length)
        
        # クエリパラメータからファイル名とフォルダ情報を取得
        from urllib.parse import urlparse, parse_qs
        query = parse_qs(urlparse(self.path).query)
        filename = query.get('filename', ['unknown.wav'])[0]
        folder = query.get('folder', ['misc'])[0]

        target_dir = os.path.join(SAVE_DIR, folder)
        if not os.path.exists(target_dir): os.makedirs(target_dir)
        
        raw_path = os.path.join(target_dir, f"raw_{filename}")
        final_path = os.path.join(target_dir, filename)

        # 一旦生のデータを保存
        with open(raw_path, 'wb') as f:
            f.write(audio_data)

        try:
            # 無音カット（スマート・トリミング）を実行
            self.trim_silence_smart(raw_path, final_path)
            if os.path.exists(raw_path): os.remove(raw_path)
            print(f"保存成功（トリミング済）: {final_path}")
            
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode())
        except Exception as e:
            err_msg = str(e)
            print(f"エラー発生 ({filename}): {err_msg}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"status": "error", "message": err_msg}).encode())

    def trim_silence_smart(self, in_path, out_path):
        """
        スライディングウィンドウ法を用いて、音声の実際の開始・終了地点を特定します。
        """
        with wave.open(in_path, 'rb') as wr:
            params = wr.getparams()
            n_channels, sampwidth, framerate, n_frames, comptype, compname = params
            frames = wr.readframes(n_frames)
            # バイナリデータを数値（16bit整数）に変換
            samples = struct.unpack(f"<{n_frames * n_channels}h", frames)
            
            # 指定した範囲の平均音量（エネルギー）を計算する関数
            def get_window_energy(idx):
                window = samples[idx : idx + WINDOW_SIZE * n_channels]
                if not window: return 0
                return sum(abs(s) for s in window) / len(window)

            # 開始地点の探索（前方スキャン）
            start_index = 0
            for i in range(0, len(samples) - WINDOW_SIZE * n_channels, n_channels):
                if get_window_energy(i) > THRESHOLD:
                    # 子音の冒頭が切れないように、少し手前から開始します
                    start_index = max(0, i - (n_channels * 100)) 
                    break
            
            # 終了地点の探索（後方スキャン）
            end_index = len(samples) - 1
            for i in range(len(samples) - (WINDOW_SIZE + 1) * n_channels, start_index, -n_channels):
                if get_window_energy(i) > THRESHOLD:
                    # 自然な余韻を残すために、少し余裕を持って終了します
                    end_index = min(len(samples) - 1, i + (n_channels * 200)) 
                    break
            
            # トリミングした範囲だけを新しいファイルとして保存
            trimmed_samples = samples[start_index:end_index]
            trimmed_frames = struct.pack(f"<{len(trimmed_samples)}h", *trimmed_samples)
            
            with wave.open(out_path, 'wb') as ww:
                ww.setparams(params)
                ww.setnframes(len(trimmed_samples) // n_channels)
                ww.writeframes(trimmed_frames)

# サーバーの起動設定
Handler = ReversaAudioHandler
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"--- Reversa 音声解析サーバー起動中 (Port: {PORT}) ---")
    print("ブラウザからの音声受信を待機しています...")
    httpd.serve_forever()
