/**
 * Reversa - 設定用テンプレートファイル (config.example.js)
 * 
 * 【使い方】
 * 1. このファイルをコピー（複製）して、ファイル名を「config.js」に変更してください。
 * 2. 新しく作成した config.js の中の OPENAI_API_KEY に、あなたの OpenAI API キーを貼り付けてください。
 * 
 * ※重要: 実際の API キーはこのファイル (example) ではなく、必ず「config.js」の方に記述してください。
 * (config.js は .gitignore によって Git の管理から自動的に除外されます)
 */

const CONFIG = {
    // OpenAI API キー (https://platform.openai.com/api-keys)
    OPENAI_API_KEY: "ここにOpenAIのAPIキーを貼り付けてください",
    
    // Vapi Web SDK を使用する場合のパブリックキー（オプション）
    VAPI_PUBLIC_KEY: ""
};
