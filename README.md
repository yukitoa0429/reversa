# Reversa (リバーサ) 🧠🎙️

**Reversa（逆暗証トレーニング）** は、ユーザーの短期記憶（ワーキングメモリ）と音声処理能力を鍛えるための、ブラウザベースのAI音声認識ゲームです。
出題される単語を「逆から発声」し、AIがそれを正確に聞き取って正誤判定を行います。

![Reversa Blackboard Theme](assets/bg_beginner_1.png)

## ✨ 主な特徴 (Features)

- **🗣️ AI音声認識 (OpenAI Whisper):** 高精度な音声認識エンジンを搭載し、不自然な「逆さ言葉」の発音でも正確にテキスト化します。
- **🔊 自然な音声読み上げ (OpenAI TTS):** 出題される単語は、自然なイントネーションのAIボイスによって読み上げられます。
- **⏱️ 動的な難易度調整:** 初級（3文字）、中級（4〜6文字）、上級（7〜10文字）と難易度が分かれており、文字数に応じて解答待ち時間（無音判定の閾値）が自動で調整されます。
- **🎵 リズム読みモード:** 長い単語を記憶しやすくするため、一文字ずつ一定のリズムで読み上げるモードを搭載。
- **🏫 黒板UIテーマ:** 学校の教室をモチーフにした、温かみのある黒板風のUIと「Kiwi Maru」フォントを採用しています。

---

## 🛠️ 使用技術 (Tech Stack)

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Audio API:** Web Audio API, MediaRecorder API
- **AI Services:** 
  - OpenAI Whisper API (`whisper-1`) - 音声認識用
  - OpenAI TTS API (`tts-1`) - 問題の読み上げ用
- **Backend:** Python (ローカル動作用の簡易サーバー `server.py`)

---

## 🚀 環境構築・起動方法 (Setup & Installation)

Reversaをローカル環境で動かすための手順です。

### 1. APIキーの設定（必須）
本アプリを動作させるには、OpenAIのAPIキーが必要です。
プロジェクト直下にある `config.example.js` をコピーし、ファイル名を `config.js` に変更してください。

```bash
cp config.example.js config.js
```

次に、作成した `config.js` をテキストエディタで開き、あなたのOpenAI APIキーを入力してください。

```javascript
// config.js の例
const CONFIG = {
    OPENAI_API_KEY: "sk-your-openai-api-key-here",
    VAPI_PUBLIC_KEY: "your-vapi-key-here" // 必要に応じて
};
```

### 2. アプリの起動
PythonがインストールされているWindows環境であれば、同梱のバッチファイルで簡単に起動できます。

1. `run.bat` をダブルクリックして実行します。
2. 自動的に「バックエンドサーバー（port 8081）」と「フロントエンドサーバー（port 8000）」が立ち上がります。
3. 自動でブラウザが開き、`http://localhost:8000/index.html` にアクセスしてゲームが開始されます。

---

## 📂 ディレクトリ構造 (Project Structure)

```text
reversa/
 ├── index.html            # メイン画面（UI構造）
 ├── run.bat               # アプリケーション起動スクリプト
 ├── server.py             # ローカル音声処理用バックエンドサーバー
 ├── config.js             # APIキーなどの設定ファイル（Git除外推奨）
 ├── questions.js          # 問題データベース（JSON形式）
 │
 ├── css/                  # スタイルシート群
 │    ├── components.css   # ボタン・モーダルなどの共通UI
 │    ├── style.css        # 全体レイアウトと黒板デザイン
 │    └── screens/         # 各画面（結果画面など）の個別スタイル
 │
 ├── js/                   # コアロジック群
 │    ├── main.js          # エントリーポイント・状態管理
 │    ├── game.js          # ゲームループ・音声認識フロー・正誤判定
 │    ├── audio.js         # 音声合成（TTS）と再生制御
 │    ├── ui.js            # 画面遷移・アニメーション制御
 │    ├── utils.js         # 文字列の正規化（ファジーマッチ等）のユーティリティ
 │    └── constants.js     # 定数・初期設定値
 │
 └── docs/                 # ドキュメント
      └── specifications.md # 技術仕様書（詳細な判定ロジック等）
```

---

## 📖 開発者向けドキュメント
アプリの内部仕様（サイレンススレッショルドの秒数や、ハルシネーション対策の文字列切り捨てロジック等）については、[docs/specifications.md](docs/specifications.md) をご参照ください。過去のバージョン履歴は [CHANGELOG.md](CHANGELOG.md) に記録されています。
