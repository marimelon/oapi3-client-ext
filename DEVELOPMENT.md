# Development Guide

## 開発環境セットアップ

### 前提条件
- Node.js 22.17.0+ (Volta管理)
- npm または pnpm
- Google Chrome（拡張機能テスト用）

### セットアップ手順

```bash
# リポジトリクローン
git clone <repository-url>
cd oapi3-client-ext

# 依存関係インストール
npm install
# または
pnpm install

# 型チェック
npm run type-check

# ビルド
npm run build
```

### Chrome拡張機能の読み込み

1. `npm run build`でビルド実行
2. Chrome → `chrome://extensions/`
3. 「デベロッパーモード」をON
4. 「パッケージ化されていない拡張機能を読み込む」
5. `dist`フォルダを選択

## プロジェクト構造

```
oapi3-client-ext/
├── public/                 # 静的ファイル
├── src/
│   ├── background/         # Service Worker
│   │   └── index.ts
│   ├── options/            # メインアプリ（オプションページ）
│   │   ├── components/     # Reactコンポーネント
│   │   ├── Options.tsx     # エントリーポイント
│   │   └── index.html
│   ├── popup/              # ポップアップUI
│   │   ├── components/
│   │   ├── Popup.tsx
│   │   └── index.html
│   ├── context/            # React Context
│   │   └── AppContext.tsx
│   ├── hooks/              # カスタムフック
│   │   ├── useOpenApi.ts
│   │   ├── useRequest.ts
│   │   └── useStorage.ts
│   ├── lib/                # ライブラリ
│   │   ├── openapi.ts      # OpenAPI解析
│   │   ├── request.ts      # リクエスト処理
│   │   └── utils.ts        # ユーティリティ
│   ├── types/              # 型定義
│   │   └── index.ts
│   ├── styles/             # スタイル
│   │   └── globals.css
│   └── manifest.ts         # 拡張機能マニフェスト
├── test-files/             # テスト用OpenAPIファイル
├── dist/                   # ビルド出力
├── docs/                   # ドキュメント
└── config files...         # 設定ファイル
```

## 開発ワークフロー

### 1. 機能開発

#### ブランチ戦略
```bash
# feature開発
git checkout -b feature/parameter-validation
git checkout -b fix/ref-resolution-bug
git checkout -b refactor/request-builder
```

#### 開発サイクル
1. **設計**: 要件定義 → アーキテクチャ設計
2. **実装**: TypeScript実装 → 型チェック
3. **テスト**: 手動テスト → ビルドテスト
4. **レビュー**: コードレビュー → 修正

### 2. ホットリロード開発

#### ファイル変更監視
```bash
# TypeScriptコンパイル監視
npx tsc --watch

# Viteビルド監視  
npm run dev
```

#### 拡張機能リロード
Chrome拡張機能ページで「🔄」ボタンクリック、またはCtrl+R

### 3. デバッグ手法

#### コンソールログ活用
```typescript
// 開発時のログレベル
console.log('🔍 Debug:', data)      // 一般的なデバッグ
console.warn('⚠️ Warning:', issue)  // 警告
console.error('❌ Error:', error)   // エラー
console.info('💡 Info:', info)     // 情報
```

#### Chrome DevTools
1. **Options Page**: 右クリック → 検証
2. **Background Script**: `chrome://extensions/` → 「background page」
3. **Popup**: ポップアップ右クリック → 検証

## コーディング規約

### TypeScript

#### 型定義
```typescript
// Interface名はPascalCase
interface UserProfile {
  id: string
  name: string
  email?: string  // Optional
}

// Type Unionは明確に
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

// Genericは意味のある名前
interface ApiResponse<TData = unknown> {
  data: TData
  status: number
}
```

#### 関数定義
```typescript
// 関数はcamelCase
function parseOpenApiSpec(content: string): ParsedSpec {
  // 実装
}

// Async/Awaitを優先
async function fetchApiSpec(url: string): Promise<ApiSpec> {
  const response = await fetch(url)
  return response.json()
}

// アロー関数はシンプルな場合のみ
const getStatusColor = (status: number) => 
  status >= 200 && status < 300 ? 'green' : 'red'
```

### React

#### コンポーネント定義
```typescript
// Props interfaceは明確に
interface RequestPanelProps {
  endpoint: EndpointInfo
  onSendRequest: (config: RequestConfig) => void
}

// Default exportを使用
export default function RequestPanel({ endpoint, onSendRequest }: RequestPanelProps) {
  // 実装
}

// Custom hooksはuseプレフィックス
export function useApiValidation(schema: Schema) {
  // 実装
}
```

#### Hooks使用ルール
```typescript
// useEffectの依存配列は明確に
useEffect(() => {
  fetchData()
}, [endpoint.id, environment.id]) // 依存関係明示

// useCallbackは適切に使用
const handleSubmit = useCallback((data: FormData) => {
  // 重い処理のみメモ化
}, [dependencies])

// カスタムフックは単一責任
function useRequestState() {
  return useAppContext().requestState
}
```

### CSS/TailwindCSS

#### クラス命名
```typescript
// Tailwindクラスは機能順に
className="flex items-center justify-between px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50"

// 条件付きクラスは読みやすく
const buttonClasses = `
  px-4 py-2 rounded-md font-medium
  ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
  ${size === 'large' ? 'text-lg px-6 py-3' : 'text-sm'}
`
```

## テスト戦略

### 1. 手動テスト

#### テストケース管理
```typescript
// test-cases.md
## OpenAPI仕様読み込み
- [ ] JSONファイル読み込み
- [ ] YAMLファイル読み込み  
- [ ] URL読み込み
- [ ] 不正ファイル処理
- [ ] $ref参照解決

## パラメータ設定
- [ ] パスパラメータ設定
- [ ] クエリパラメータ設定
- [ ] 必須バリデーション
- [ ] 型別入力フィールド

## リクエスト送信
- [ ] GET リクエスト
- [ ] POST リクエスト（JSONボディ）
- [ ] エラーハンドリング
- [ ] レスポンス表示
```

#### テストデータ
```bash
# テスト用OpenAPIファイル
test-api-with-query-params.json    # クエリパラメータテスト
test-api-with-refs.json           # $ref参照テスト  
test-api-circular-refs.json       # 循環参照テスト
```

### 2. 統合テスト

#### エンドツーエンドシナリオ
```typescript
// E2E Test Scenarios
describe('OpenAPI Client E2E', () => {
  it('should load spec and send request', async () => {
    // 1. ファイル読み込み
    await loadApiSpec('test-api.json')
    
    // 2. エンドポイント選択
    await selectEndpoint('/users', 'GET')
    
    // 3. パラメータ設定
    await setQueryParam('limit', '10')
    
    // 4. リクエスト送信
    await sendRequest()
    
    // 5. レスポンス確認
    expect(getResponseStatus()).toBe(200)
  })
})
```

## トラブルシューティング

### よくある問題

#### 1. ビルドエラー

**型エラー**:
```bash
# 型チェック実行
npm run type-check

# 段階的修正
npx tsc --noEmit --skipLibCheck
```

**依存関係エラー**:
```bash
# node_modules削除
rm -rf node_modules package-lock.json
npm install

# パッケージバージョン確認
npm list --depth=0
```

#### 2. Chrome拡張機能エラー

**マニフェストエラー**:
```json
// manifest.json確認
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"]
}
```

**Content Security Policy**:
```typescript
// インラインスクリプト避ける
// NG: onClick="handler()"
// OK: addEventListener('click', handler)
```

#### 3. $ref参照エラー

**循環参照検出**:
```typescript
// デバッグログ確認
🔄 Circular reference detected: #/components/schemas/User
📚 Resolution stack: SchemaA -> SchemaB -> SchemaA
```

**参照先不存在**:
```typescript
// コンポーネント構造確認
🔍 Checking components structure:
  - components exists: true
  - parameters exists: false ← 問題
  - schemas exists: true
```

### デバッグ手法

#### 1. ログレベル制御
```typescript
// 環境別ログ制御
const isDev = process.env.NODE_ENV === 'development'

function debugLog(message: string, data?: any) {
  if (isDev) {
    console.log(`🔍 ${message}`, data)
  }
}
```

#### 2. ステップ実行
```typescript
// Chrome DevToolsでブレークポイント設定
function complexFunction(data: ComplexData) {
  debugger // ここで停止
  const result = processData(data)
  return result
}
```

#### 3. ネットワーク監視
```typescript
// Networkタブでリクエスト確認
// - Request Headers
// - Response Status
// - Response Body
// - Timing情報
```

## パフォーマンス最適化

### 1. レンダリング最適化

#### React.memo活用
```typescript
// 不要な再レンダリング防止
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />
}, (prevProps, nextProps) => {
  // カスタム比較関数
  return prevProps.data.id === nextProps.data.id
})
```

#### 仮想化
```typescript
// 大量リスト表示時
import { FixedSizeList as List } from 'react-window'

function EndpointList({ endpoints }) {
  return (
    <List
      height={600}
      itemCount={endpoints.length}
      itemSize={50}
      itemData={endpoints}
    >
      {EndpointRow}
    </List>
  )
}
```

### 2. バンドルサイズ最適化

#### 動的インポート
```typescript
// 重いライブラリの遅延読み込み
const HeavyComponent = lazy(() => import('./HeavyComponent'))

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

#### Tree Shaking
```typescript
// 名前付きインポート使用
import { debounce } from 'lodash' // NG: 全体インポート
import debounce from 'lodash/debounce' // OK: 部分インポート
```

### 3. メモリ最適化

#### WeakMap使用
```typescript
// ガベージコレクション対応キャッシュ
const specCache = new WeakMap<ApiSpec, ParsedData>()

function getCachedData(spec: ApiSpec): ParsedData {
  if (specCache.has(spec)) {
    return specCache.get(spec)!
  }
  const data = parseSpec(spec)
  specCache.set(spec, data)
  return data
}
```

## リリース管理

### バージョニング

#### セマンティックバージョニング
```
MAJOR.MINOR.PATCH
1.0.0 → 1.0.1 (パッチ: バグ修正)
1.0.1 → 1.1.0 (マイナー: 機能追加)  
1.1.0 → 2.0.0 (メジャー: 破壊的変更)
```

#### バージョン更新
```bash
# package.jsonのバージョン更新
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0
```

### デプロイメント

#### Chrome Web Store公開
```bash
# プロダクションビルド
npm run build

# ZIPファイル作成
zip -r extension.zip dist/

# Chrome Web Store Developer Dashboard
# → アップロード → 審査申請
```

### 設定管理

#### 環境変数
```typescript
// .env.development
VITE_API_BASE_URL=http://localhost:3000
VITE_DEBUG_MODE=true

// .env.production  
VITE_API_BASE_URL=https://api.example.com
VITE_DEBUG_MODE=false
```

#### ビルド時設定
```typescript
// vite.config.ts
export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})
```

---

この開発ガイドに従うことで、効率的で保守性の高い開発が可能になります。