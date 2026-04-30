# Reversa 拡張機能メモ：Vapi によるアシスタント機能の統合

このドキュメントは、将来的にリアルタイム音声アシスタント「Riley」を導入したい時のための技術ガイドです。

## 1. 導入のメリット
- **リアルタイム応答**: 発話中から解析を開始し、正解した瞬間に Riley が声でリアクションを返せます。
- **トレーニングの没入感**: 専属トレーナーが横にいるような体験を作れます。

## 2. 過去の技術課題と解決策
ブラウザで直接読み込む際、Node.js 用の形式が混じると `exports is not defined` エラーが発生します。
- **解決策**: 必ず **IIFE (Immediately Invoked Function Expression)** 形式のファイルを使用してください。
- **推奨URL**: `https://cdn.jsdelivr.net/npm/@vapi-ai/web/dist/vapi.iife.js`

## 3. 実装のステップ
1. `index.html` の末尾で上記スクリプトを読み込む。
2. `app.js` の `startGame` 関数内で `vapiInstance = new Vapi(CONFIG.VAPI_PUBLIC_KEY)` を実行。
3. `vapiInstance.on('message', ...)` でリアルタイム文字起こしを取得し、正誤判定ロジックと同期させる。

---
作成日: 2026-04-30
担当: Antigravity
