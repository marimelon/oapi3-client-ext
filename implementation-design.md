# OpenAPI3 Chrome拡張クライアント - 実装設計書

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│              Chrome Extension (TypeScript)             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │   React Popup   │  │   Background    │             │
│  │   + Context     │  │    Script       │             │
│  └─────────────────┘  └─────────────────┘             │
├─────────────────────────────────────────────────────────┤
│                   Storage Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ OpenAPI Specs   │  │ Environment     │             │
│  │ & Presets       │  │ & History       │             │
│  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

## 技術スタック

### ビルドツール
- **Vite**: 高速ビルド・HMR
- **CRXJS Vite Plugin**: Chrome拡張対応
- **TypeScript**: 型安全性とコード品質向上

### フロントエンド
- **React 18**: UI構築
- **TailwindCSS**: ユーティリティファーストCSS
- **React Context**: 状態管理

### Chrome拡張
- **Manifest V3**: 最新Chrome拡張仕様
- **chrome.storage API**: データ永続化

### OpenAPI処理
- **@apidevtools/swagger-parser**: OpenAPI仕様パース
- **swagger-client**: APIリクエスト実行
- **js-yaml**: YAML形式サポート

## ディレクトリ構造

```
oapi3-client-ext/
├── package.json                    # pnpm設定
├── vite.config.ts                  # Vite + CRXJS設定
├── tsconfig.json                   # TypeScript設定
├── tailwind.config.js              # TailwindCSS設定
├── postcss.config.js               # PostCSS設定
└── src/
    ├── manifest.ts                 # Chrome拡張マニフェスト
    ├── types/
    │   └── index.ts               # 型定義
    ├── context/
    │   └── AppContext.tsx         # React Context
    ├── popup/
    │   ├── index.html             # ポップアップHTML
    │   ├── Popup.tsx              # Reactエントリーポイント
    │   └── components/
    │       ├── App.tsx            # メインアプリ
    │       ├── TabNavigation.tsx  # タブナビゲーション
    │       ├── ApiManagement.tsx  # API管理
    │       ├── RequestBuilder.tsx # リクエスト作成
    │       ├── ResponseViewer.tsx # レスポンス表示
    │       ├── EnvironmentManager.tsx # 環境管理
    │       └── RequestHistory.tsx # 履歴表示
    ├── background/
    │   └── background.ts          # バックグラウンドスクリプト
    ├── lib/
    │   ├── storage.ts             # Chrome Storage API
    │   ├── openapi.ts             # OpenAPI処理
    │   ├── request.ts             # リクエスト実行
    │   └── utils.ts               # ユーティリティ
    └── styles/
        └── globals.css            # グローバルスタイル
```

## データモデル（TypeScript）

### 1. OpenAPI Specification
```typescript
interface OpenAPISpec {
  id: string
  name: string
  spec: any  // パースされたOpenAPI仕様
  createdAt: Date
  updatedAt: Date
}
```

### 2. Environment Preset
```typescript
interface Environment {
  id: string
  name: string
  baseUrl: string
  headers: Record<string, string>
  isDefault: boolean
}
```

### 3. Request History
```typescript
interface RequestHistory {
  id: string
  specId: string
  environmentId: string
  method: string
  endpoint: string
  parameters: Record<string, any>
  headers: Record<string, string>
  body: any
  response: {
    status: number
    headers: Record<string, string>
    body: any
    timestamp: Date
  }
  timestamp: Date
}
```

### 4. Endpoint Info
```typescript
interface EndpointInfo {
  path: string
  method: string
  summary?: string
  description?: string
  parameters?: any[]
  requestBody?: any
  responses?: any
}
```

## React Context 状態管理

### AppContext State
```typescript
interface AppState {
  openApiSpecs: OpenAPISpec[]
  environments: Environment[]
  requestHistory: RequestHistory[]
  selectedSpec: OpenAPISpec | null
  selectedEnvironment: Environment | null
  loading: boolean
  error: string | null
}
```

### Actions
```typescript
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_OPENAPI_SPECS'; payload: OpenAPISpec[] }
  | { type: 'ADD_OPENAPI_SPEC'; payload: OpenAPISpec }
  | { type: 'DELETE_OPENAPI_SPEC'; payload: string }
  | { type: 'SET_SELECTED_SPEC'; payload: OpenAPISpec | null }
  | { type: 'SET_ENVIRONMENTS'; payload: Environment[] }
  | { type: 'ADD_ENVIRONMENT'; payload: Environment }
  | { type: 'DELETE_ENVIRONMENT'; payload: string }
  | { type: 'SET_SELECTED_ENVIRONMENT'; payload: Environment | null }
  | { type: 'SET_REQUEST_HISTORY'; payload: RequestHistory[] }
  | { type: 'ADD_REQUEST_HISTORY'; payload: RequestHistory }
```

## コンポーネント設計

### 1. App Component (src/popup/components/App.tsx)
```typescript
// メインアプリコンポーネント
// - タブナビゲーション管理
// - エラー表示
// - アクティブタブに応じたコンポーネント表示
```

### 2. Storage Manager (src/lib/storage.ts)
```typescript
class StorageManager {
  // OpenAPI仕様の管理
  async saveOpenApiSpec(spec: OpenAPISpec): Promise<void>
  async getOpenApiSpecs(): Promise<OpenAPISpec[]>
  async deleteOpenApiSpec(id: string): Promise<void>
  
  // 環境プリセットの管理
  async saveEnvironment(env: Environment): Promise<void>
  async getEnvironments(): Promise<Environment[]>
  async deleteEnvironment(id: string): Promise<void>
  
  // リクエスト履歴の管理
  async saveRequestHistory(history: RequestHistory): Promise<void>
  async getRequestHistory(limit = 50): Promise<RequestHistory[]>
  async clearHistory(): Promise<void>
}
```

### 3. OpenAPI Parser (src/lib/openapi.ts)
```typescript
class OpenApiParser {
  // OpenAPI仕様のパース
  async parseSpec(specContent: string | object): Promise<any>
  
  // エンドポイント一覧取得
  getEndpoints(spec: any): EndpointInfo[]
  
  // パラメータスキーマ取得
  getParameterSchema(spec: any, path: string, method: string): any
  
  // リクエストボディスキーマ取得
  getRequestBodySchema(spec: any, path: string, method: string): any
  
  // バリデーション
  validateRequest(schema: any, data: any): boolean
}
```

### 4. Request Builder (src/lib/request.ts)
```typescript
class RequestBuilder {
  // リクエストURL構築
  buildUrl(baseUrl: string, path: string, pathParams: Record<string, string>, queryParams: Record<string, string>): string
  
  // リクエストヘッダー構築
  buildHeaders(envHeaders: Record<string, string>, customHeaders: Record<string, string>): Record<string, string>
  
  // リクエスト実行
  async executeRequest(config: RequestConfig): Promise<any>
  
  // レスポンス処理
  processResponse(response: Response): any
}
```

## UI設計

### 1. ポップアップサイズ
- 幅: 400px
- 最小高: 600px
- TailwindCSSでレスポンシブ対応

### 2. タブ構成
- **APIs**: OpenAPI仕様管理・エンドポイント一覧
- **Request**: リクエスト作成・実行
- **Response**: レスポンス表示
- **Env**: 環境プリセット管理
- **History**: リクエスト履歴

### 3. カラーパレット（TailwindCSS）
- Primary: blue-600
- Success: green-600
- Error: red-600
- Warning: yellow-500
- Gray: gray-50 to gray-900

## 開発フロー

### 1. 開発環境起動
```bash
pnpm install
pnpm dev
```

### 2. ビルド
```bash
pnpm build
```

### 3. 型チェック
```bash
pnpm type-check
```

## セキュリティ考慮事項

### 1. データ保護
- Chrome Storage APIによる暗号化ストレージ利用
- 機密情報の適切な管理
- ストレージ容量制限の実装

### 2. リクエスト制限
- fetch APIタイムアウト設定
- 不正URLのバリデーション
- レート制限実装

### 3. Chrome拡張権限
- Manifest V3準拠
- 最小権限の原則
- Content Security Policy適用

## 実装優先順位

### Phase 1: 基本機能 ✅
1. プロジェクトセットアップ（完了）
2. manifest.ts作成（完了）
3. 基本React UI構築（完了）
4. Context状態管理（完了）

### Phase 2: コア機能
1. Chrome Storage API実装
2. OpenAPI仕様読み込み・パース
3. 基本的なリクエスト実行
4. 環境プリセット機能

### Phase 3: 拡張機能
1. パラメータバリデーション
2. レスポンス整形・表示
3. リクエスト履歴機能
4. 検索・フィルタ機能

### Phase 4: 改善・最適化
1. UI/UX改善
2. エラーハンドリング強化
3. パフォーマンス最適化
4. テスト実装