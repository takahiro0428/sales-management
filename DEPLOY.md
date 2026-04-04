# デプロイ手順

## 前提条件

1. Firebase プロジェクトが作成済みであること
2. Firebase プロジェクトで以下のサービスが有効化されていること:
   - Authentication (メール/パスワード認証)
   - Cloud Firestore
   - Cloud Storage
   - Hosting

## Firebase プロジェクトの設定

### 1. Authentication の設定

Firebase Console > Authentication > Sign-in method で「メール/パスワード」を有効化してください。

### 2. Firestore の設定

Firebase Console > Firestore Database でデータベースを作成してください。
- ロケーション: `asia-northeast1`（東京）を推奨
- セキュリティルールは本リポジトリの `firestore.rules` が自動デプロイされます

### 3. Storage の設定

Firebase Console > Storage でストレージを作成してください。
- デフォルトバケットまたはカスタムバケット名を設定可能
- セキュリティルールは本リポジトリの `storage.rules` が自動デプロイされます

### 4. Hosting の設定

デフォルトのホスティングサイトを使用するか、カスタムサイトを作成できます。
カスタムサイトを使用する場合は `FIREBASE_HOSTING_SITE` シークレットを設定してください。

## GitHub Repository Secrets の設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定してください:

### 必須シークレット

| シークレット名 | 説明 | 取得方法 |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Firebase プロジェクト ID | Firebase Console > プロジェクト設定 |
| `FIREBASE_SERVICE_ACCOUNT` | サービスアカウントの JSON キー | Firebase Console > プロジェクト設定 > サービスアカウント > 新しい秘密鍵の生成 |
| `NUXT_PUBLIC_FIREBASE_API_KEY` | Firebase API キー | Firebase Console > プロジェクト設定 > マイアプリ > ウェブアプリ |
| `NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth ドメイン | 同上（例: `your-project.firebaseapp.com`） |
| `NUXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase プロジェクト ID | 同上 |
| `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage バケット | 同上（例: `your-project.firebasestorage.app`） |
| `NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | メッセージング送信者 ID | 同上 |
| `NUXT_PUBLIC_FIREBASE_APP_ID` | Firebase アプリ ID | 同上 |

### オプションシークレット

| シークレット名 | 説明 | デフォルト |
|---|---|---|
| `FIREBASE_HOSTING_SITE` | ホスティングサイト名 | デフォルトサイト |

## デプロイの実行

### 自動デプロイ

`main` ブランチにプッシュすると、GitHub Actions が自動的にデプロイを実行します。

デプロイ内容:
1. Nuxt アプリのビルド（Static Generation）
2. Firebase Hosting へのデプロイ
3. Firestore セキュリティルールのデプロイ
4. Firestore インデックスのデプロイ
5. Storage セキュリティルールのデプロイ

### プレビューデプロイ

プルリクエストを作成すると、プレビューURLが自動的にPRコメントに投稿されます。

### 手動デプロイ

GitHub Actions の「Deploy to Firebase」ワークフローを手動でトリガーすることもできます。

## ローカル開発

```bash
cd app
cp .env.example .env
# .env ファイルに Firebase の設定値を記入
npm install
npm run dev
```

## PWA アイコンの生成

`app/public/icons/` ディレクトリに以下のアイコンファイルを配置してください:

- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

`app/public/favicon.svg` をベースに、各サイズの PNG を生成してください。

## Firestore / Storage のオプション設定

### カスタムロケーション

Firestore と Storage のロケーションは Firebase Console から設定します。
推奨: `asia-northeast1`（東京リージョン）

### カスタムバケット

Storage で複数バケットを使用する場合:
1. Firebase Console で追加バケットを作成
2. `storage.rules` を複数バケットに対応するよう更新
3. アプリの `firebase.client.ts` で `getStorage(app, 'gs://custom-bucket')` を使用

### Firestore のバックアップ

本番環境では Firestore のスケジュールバックアップを設定することを推奨します。
Firebase Console > Firestore > バックアップ から設定できます。
