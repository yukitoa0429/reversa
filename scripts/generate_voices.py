import os
import re
import time
from openai import OpenAI

def get_api_key():
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.js")
    if not os.path.exists(config_path):
        # 実行ディレクトリに依存しないように絶対パスのフォールバック
        config_path = os.path.join(os.getcwd(), "config.js")
        
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()
        match = re.search(r'OPENAI_API_KEY:\s*["\']([^"\']+)["\']', content)
        if match:
            return match.group(1)
    raise ValueError("OPENAI_API_KEY not found in config.js")

def main():
    try:
        api_key = get_api_key()
    except Exception as e:
        print(f"Error: {e}")
        return

    client = OpenAI(api_key=api_key)

    characters = [
        "あ","い","う","え","お",
        "か","が","き","ぎ","く","ぐ","け","げ","こ","ご",
        "さ","ざ","し","じ","す","ず","せ","ぜ","そ","ぞ",
        "た","だ","ち","ぢ","つ","づ","て","で","と","ど",
        "な","に","ぬ","ね","の",
        "は","ば","ぱ","ひ","び","ぴ","ふ","ぶ","ぷ","へ","べ","ぺ","ほ","ぼ","ぽ",
        "ま","み","む","め","も",
        "や","ゆ","よ",
        "ら","り","る","れ","ろ",
        "わ","を","ん"
    ]

    target_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "audio", "parts")
    if not os.path.exists(target_dir):
        target_dir = os.path.join(os.getcwd(), "assets", "audio", "parts")
    os.makedirs(target_dir, exist_ok=True)

    print(f"Target directory: {target_dir}")
    print(f"Total characters to generate: {len(characters)}")

    for i, char in enumerate(characters):
        print(f"[{i+1}/{len(characters)}] Generating: {char}")
        filepath = os.path.join(target_dir, f"{char}.wav")
        
        try:
            # ほんの少し伸ばすために長音符を付与し、長すぎないようにspeedを少し上げる
            response = client.audio.speech.create(
                model="tts-1",
                voice="nova",
                input=f"{char}ー",
                speed=1.2,
                response_format="wav"
            )
            
            # ファイル書き出し
            response.stream_to_file(filepath)
            
            # APIのレートリミットを避けるために少し待機
            time.sleep(0.5)
        except Exception as e:
            print(f"Error generating {char}: {e}")

    print("Audio generation completed.")

if __name__ == "__main__":
    main()
