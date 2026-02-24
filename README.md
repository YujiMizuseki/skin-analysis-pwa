# 肌診断 AI 🔬

AIで肌の老化度を分析するPWAアプリです。スマホカメラで顔を撮影し、468点の3D顔面ランドマークから肌年齢を診断します。

## 🌐 デモ

**[https://yujimizuseki.github.io/skin-analysis-pwa/](https://yujimizuseki.github.io/skin-analysis-pwa/)**

## ✨ 機能

- **高精度3D解析**: TensorFlow.js + MediaPipe Face Mesh (468点)
- **3ステップ撮影**: 正面・笑顔・下向きの3枚を比較分析
- **部位別スコア**: 法令線・頬のたるみ・目尻のシワ・フェイスラインを個別評価
- **骨格・肌要因の分離**: 改善可能な要因のみを特定
- **改善プラン提案**: ホームケア〜医療処置まで段階的に提案
- **PWA対応**: ホーム画面に追加してアプリとして使用可能
- **完全オフライン処理**: 撮影データは外部送信なし

## 🔬 分析技術

### 使用モデル
- **TensorFlow.js** v4.15.0
- **MediaPipe Face Mesh** (face-landmarks-detection v1.0.5)

### 計測指標

| 指標 | 方法 |
|------|------|
| 法令線 | 鼻翼〜口角の距離・深度計測 |
| 頬のたるみ | 頬ランドマークの垂直位置変化 |
| 目尻のシワ | 目尻領域のz座標分散 |
| フェイスライン | あご幅・頬骨幅の比率 |
| 骨格要因 | 複数ポーズ間の幾何学的安定性 |

## 📱 使い方

1. **「診断を開始する」** をタップ
2. **3枚撮影**: 無表情 → 笑顔 → 下向き
3. **AI解析** (約5〜15秒)
4. **診断レポート** を確認・シェア

## 🛠 技術スタック

- HTML5 / CSS3 / Vanilla JavaScript (ES6+)
- TensorFlow.js + Face Landmarks Detection
- Service Worker (PWA)
- GitHub Pages (無料ホスティング)

## 🚀 GitHub Pages 公開手順

1. リポジトリの **Settings** を開く
2. 左メニューの **Pages** を選択
3. Source: **Deploy from a branch**
4. Branch: **main** / **/ (root)** を選択
5. **Save** をクリック
6. 数分後に公開完了

## ⚠️ 注意事項

- この診断はAIによる推定であり、医療診断ではありません
- 明るい環境での使用を推奨します
- カメラへのアクセス許可が必要です（HTTPS必須）

## 📄 ライセンス

MIT License
