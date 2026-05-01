"""
Reversa - 五十音オーディオパーツ生成スクリプト

【目的】
リズム読み上げモードで使用する、五十音（あ、い、う...）の単音音声ファイルを一括生成します。
OpenAI TTS API (`tts-1`) を使用し、高品質で統一感のある音声素材を `assets/audio/parts/` 内に作成します。

【主な機能】
1. APIキーの自動読み取り: `config.js` から OpenAI API キーを抽出し、認証に使用します。
2. 五十音リストの生成: 濁音、半濁音を含む標準的な五十音すべてを対象とします。
3. 高精度な単音生成: 単音だけだと短すぎる場合があるため、内部的に長音符（ー）を付与し、
   スピードを調整することで、聞き取りやすい「一拍の音」を生成しています。

【使い方】
1. config.js に有効な OpenAI API キーが設定されていることを確認してください。
2. ターミナルで `python scripts/generate_voices.py` を実行してください。
"""

import os
import re
import time
from openai import OpenAI

def get_api_key():
    """
    プロジェクト直下の config.js から OpenAI API キーを抽出します。
    """
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.js")
    if not os.path.exists(config_path):
        # 実行ディレクトリに依存しないように絶対パスでのフォールバック
        config_path = os.path.join(os.getcwd(), "config.js")
        
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()
        # 正規表現で OPENAI_API_KEY の値を抽出
        match = re.search(r'OPENAI_API_KEY:\s*["\']([^"\']+)["\']', content)
        if match:
            return match.group(1)
    raise ValueError("config.js 内に OPENAI_API_KEY が見つかりませんでした。")

def main():
    try:
        api_key = get_api_key()
    except Exception as e:
        print(f"エラー: {e}")
        return

    client = OpenAI(api_key=api_key)

    # 生成対象となる五十音リスト（清音・濁音・半濁音）
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

    # 保存先ディレクトリの設定
    target_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets", "audio", "parts")
    if not os.path.exists(target_dir):
        target_dir = os.path.join(os.getcwd(), "assets", "audio", "parts")
    os.makedirs(target_dir, exist_ok=True)

    print(f"出力先ディレクトリ: {target_dir}")
    print(f"生成対象数: {len(characters)} 文字")

    for i, char in enumerate(characters):
        print(f"[{i+1}/{len(characters)}] 生成中: {char}")
        filepath = os.path.join(target_dir, f"{char}.wav")
        
        try:
            # TTS API を呼び出して音声を生成
            # ポイント: ほんの少し伸ばすために長音符「ー」を付与し、
            # リズム読みで使いやすい長さにするため speed を 1.2 に調整しています。
            response = client.audio.speech.create(
                model="tts-1",
                voice="onyx",     # アプリ本体と統一したボイス
                input=f"{char}ー",
                speed=1.2,
                response_format="wav"
            )
            
            # 生成された音声データをファイルに保存
            response.stream_to_file(filepath)
            
            # APIのレートリミットを回避するために短い待機時間を設定
            time.sleep(0.5)
        except Exception as e:
            print(f"エラー（{char} の生成に失敗）: {e}")

    print("\n音声ファイルの生成がすべて完了しました。✅")

if __name__ == "__main__":
    main()
