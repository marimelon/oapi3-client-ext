# Architecture Documentation

## システム概要

OpenAPI 3 Client Extensionは、Chrome拡張機能として動作するAPIクライアントです。React + TypeScriptで構築され、OpenAPI 3.x仕様の解析、$ref参照解決、リクエスト送信、レスポンス表示を一貫して行います。

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                        │
├─────────────────────────────────────────────────────────────┤
│  Options Page (Main Application)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Sidebar   │ │RequestPanel │ │ResponsePanel│          │
│  │             │ │             │ │             │          │
│  │ - API List  │ │ - Params    │ │ - Status    │          │
│  │ - Endpoints │ │ - Headers   │ │ - Headers   │          │
│  │ - Search    │ │ - Body      │ │ - Body      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Context Layer (State Management)                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                AppContext                               │ │
│  │ - OpenAPI Specs    - Environments                       │ │
│  │ - Selected State   - Request History                    │ │
│  │ - Request State    - Error State                        │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Hooks     │ │    Lib      │ │   Storage   │          │
│  │             │ │             │ │             │          │
│  │ - useOpenApi│ │ - openapi.ts│ │ - Chrome    │          │
│  │ - useRequest│ │ - request.ts│ │   Storage   │          │
│  │ - useStorage│ │ - utils.ts  │ │   API       │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │   Network   │ │   Parser    │ │   Storage   │          │
│  │             │ │             │ │             │          │
│  │ - Fetch API │ │ - js-yaml   │ │ - Local     │          │
│  │ - CORS      │ │ - JSON      │ │ - Session   │          │
│  │ - Cookies   │ │ - $ref      │ │ - Sync      │          │
│  └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## コンポーネント設計

### React Component Hierarchy

```
NewApp (メインコンテナ)
├── Header (ヘッダー)
├── Sidebar (サイドバー)
│   ├── ApiLoader (API読み込み)
│   ├── EnvironmentSelector (環境選択)
│   └── EndpointList (エンドポイント一覧)
└── MainContent (メインコンテンツ)
    ├── RequestPanel (リクエストパネル)
    │   ├── EndpointInfo (エンドポイント情報)
    │   ├── PathParameters (パスパラメータ)
    │   ├── QueryParameters (クエリパラメータ)
    │   ├── CustomHeaders (カスタムヘッダー)
    │   └── RequestBody (リクエストボディ)
    ├── ResponsePanel (レスポンスパネル)
    │   ├── StatusInfo (ステータス情報)
    │   ├── ResponseHeaders (レスポンスヘッダー)
    │   ├── ResponseBody (レスポンスボディ)
    │   └── ResponseAnalysis (レスポンス解析)
    └── HistoryPanel (履歴パネル)
        ├── HistoryList (履歴一覧)
        └── HistoryDetail (履歴詳細)
```

## データフロー

### 1. OpenAPI仕様読み込みフロー

```
User Input (File/URL)
    ↓
useOpenApi.loadSpecFromFile/URL
    ↓
OpenApiParser.parseSpec
    ├── YAML/JSON解析
    ├── $ref参照解決
    └── バリデーション
    ↓
AppContext.ADD_OPENAPI_SPEC
    ↓
State Update & UI Re-render
```

### 2. リクエスト送信フロー

```
User Action (Send Request)
    ↓
RequestPanel.handleSendRequest
    ├── パラメータバリデーション
    ├── URL構築
    └── ヘッダー構築
    ↓
useRequest.executeRequest
    ↓
RequestBuilder.executeRequest
    ├── Fetch API呼び出し
    ├── エラーハンドリング
    └── レスポンス処理
    ↓
AppContext.SET_REQUEST_RESULT
    ↓
ResponsePanel Update
```

### 3. 状態管理フロー

```
Component Action
    ↓
dispatch(action)
    ↓
appReducer
    ├── State Validation
    ├── Immutable Update
    └── Side Effect Handling
    ↓
Context Provider
    ↓
Component Re-render
```

## 主要モジュール詳細

### OpenApiParser (`src/lib/openapi.ts`)

**責務**: OpenAPI仕様の解析と$ref参照解決

**主要メソッド**:
```typescript
class OpenApiParser {
  // 仕様解析
  async parseSpec(content: string | object): Promise<any>
  
  // $ref参照解決（循環参照対応）
  private resolveReferences(spec: any): any
  private resolveReferencesRecursive(obj: any, rootSpec: any, visitedRefs: Set<string>, resolutionStack: string[]): any
  private resolveReference(refPath: string, rootSpec: any): any
  
  // エンドポイント抽出
  getEndpoints(spec: any): EndpointInfo[]
  
  // スキーマ取得
  getParameterSchema(spec: any, path: string, method: string): any
  getRequestBodySchema(spec: any, path: string, method: string): any
  getResponseSchemas(spec: any, path: string, method: string): any
}
```

**$ref解決アルゴリズム**:
1. **深度制限**: 最大50レベルまで
2. **循環参照検出**: 解決スタックで同一参照をチェック
3. **訪問済み管理**: 重複解決を防止
4. **エラーハンドリング**: 参照先不存在時の適切な処理

### RequestBuilder (`src/lib/request.ts`)

**責務**: HTTPリクエストの構築と実行

**主要メソッド**:
```typescript
class RequestBuilder {
  // URL構築
  buildUrl(baseUrl: string, path: string, pathParams: Record<string, string>, queryParams: Record<string, string>): string
  
  // ヘッダー構築
  buildHeaders(envHeaders: Record<string, string>, customHeaders: Record<string, string>): Record<string, string>
  
  // リクエスト実行
  async executeRequest(config: RequestConfig): Promise<RequestResult>
  
  // 履歴エントリ作成
  createHistoryEntry(...args): RequestHistory
}
```

### useOpenApi Hook (`src/hooks/useOpenApi.ts`)

**責務**: OpenAPI関連の状態管理とビジネスロジック

**提供する機能**:
- 仕様読み込み（ファイル/URL）
- エンドポイント管理
- スキーマ取得
- バリデーション
- サンプルデータ生成

### useRequest Hook (`src/hooks/useRequest.ts`)

**責務**: リクエスト関連の状態管理

**グローバル状態管理**:
```typescript
// AppContextで管理される状態
interface RequestState {
  loading: boolean
  result: RequestResult | null
  error: string | null
}
```

## セキュリティ考慮事項

### 1. $ref参照解決のセキュリティ

**循環参照攻撃対策**:
- 最大深度制限（50レベル）
- 解決スタック監視
- タイムアウト設定

**メモリ使用量制御**:
- 訪問済み参照のキャッシュ
- 不要なコピー防止
- ガベージコレクション配慮

### 2. ネットワークセキュリティ

**CORS対応**:
- Chrome拡張機能の権限活用
- セキュアなクッキー送信
- HTTPSエンドポイント推奨

**認証情報保護**:
- Chrome Storage暗号化
- メモリ上のトークン管理
- ログ出力時の秘匿化

## パフォーマンス最適化

### 1. レンダリング最適化

**React最適化**:
```typescript
// メモ化によるre-render防止
const MemoizedComponent = React.memo(Component)

// 依存配列最適化
const memoizedValue = useMemo(() => expensiveCalculation(a, b), [a, b])

// コールバック最適化
const memoizedCallback = useCallback((id) => doSomething(id), [deps])
```

**仮想化**:
- 大量エンドポイントの遅延レンダリング
- スクロール時の動的読み込み

### 2. メモリ管理

**OpenAPI仕様キャッシュ**:
- WeakMapによる自動ガベージコレクション
- LRUキャッシュでの使用頻度管理

**リクエスト履歴管理**:
- 最大1000件での自動削除
- 圧縮による容量削減

### 3. バンドルサイズ最適化

**Tree Shaking**:
- 未使用コードの除去
- 動的import活用

**Code Splitting**:
- ルートレベルでの分割
- 遅延コンポーネント読み込み

## 拡張性設計

### 1. プラグインアーキテクチャ

**フック拡張**:
```typescript
// カスタムフック登録
interface PluginHook {
  beforeRequest?: (config: RequestConfig) => RequestConfig
  afterResponse?: (result: RequestResult) => RequestResult
  onError?: (error: Error) => void
}
```

### 2. テーマシステム

**CSS変数による動的テーマ**:
```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #6b7280;
  --success-color: #10b981;
  --error-color: #ef4444;
}
```

### 3. 設定管理

**階層化設定**:
```typescript
interface Settings {
  global: GlobalSettings
  environment: EnvironmentSettings
  user: UserSettings
}
```

## テスト戦略

### 1. 単体テスト

**対象**:
- ユーティリティ関数（`utils.ts`）
- $ref参照解決ロジック
- URL構築ロジック
- パラメータバリデーション

### 2. 統合テスト

**対象**:
- OpenAPI仕様読み込み
- リクエスト送信フロー
- レスポンス処理
- ストレージ操作

### 3. E2Eテスト

**シナリオ**:
- 仕様読み込み → エンドポイント選択 → リクエスト送信
- パラメータ設定 → バリデーション → 送信
- 履歴保存 → 履歴表示 → 再実行

## 監視・ロギング

### 1. エラー監視

**エラーカテゴリ**:
- 仕様解析エラー
- ネットワークエラー  
- バリデーションエラー
- システムエラー

### 2. パフォーマンス監視

**メトリクス**:
- 仕様読み込み時間
- $ref解決時間
- リクエスト応答時間
- メモリ使用量

### 3. ユーザーアクション追跡

**イベント**:
- 仕様読み込み
- エンドポイント選択
- リクエスト送信
- 環境切り替え

---

このアーキテクチャにより、拡張性、保守性、パフォーマンスを兼ね備えたOpenAPIクライアントを実現しています。