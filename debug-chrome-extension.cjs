#!/usr/bin/env node

/**
 * Chrome拡張と同じ条件で$ref参照解決をテストするスクリプト
 * 
 * Chrome拡張でのエラーを再現するため、特定のエンドポイントをテストします。
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 設定
const OPENAPI_FILE_PATH = path.join(__dirname, 'openapi.yaml');

// 問題が報告されているエンドポイント（推測）
const PROBLEM_ENDPOINTS = [
  { path: '/tests', method: 'get' }
];

/**
 * Chrome拡張のopenapi.tsと同じ$ref解決ロジックを使用
 */
class ChromeExtensionOpenApiParser {
  // $ref参照を解決する
  resolveReferences(spec) {
    try {
      console.log('🔄 Starting reference resolution (Chrome Extension style)...');
      const resolvedSpec = JSON.parse(JSON.stringify(spec)); // Deep copy
      const visitedRefs = new Set(); // 循環参照検出用
      const resolutionStack = []; // 解決スタック追跡用
      this.resolveReferencesRecursive(resolvedSpec, resolvedSpec, visitedRefs, resolutionStack);
      console.log('✅ Reference resolution completed');
      return resolvedSpec;
    } catch (error) {
      console.warn('❌ Failed to resolve references, using original spec:', error);
      return spec;
    }
  }

  // 再帰的に$ref参照を解決（Chrome拡張版）
  resolveReferencesRecursive(
    obj, 
    rootSpec, 
    visitedRefs = new Set(), 
    resolutionStack = [],
    maxDepth = 50
  ) {
    // 最大深度チェック
    if (resolutionStack.length > maxDepth) {
      console.warn(`⚠️ Maximum resolution depth (${maxDepth}) exceeded. Stack:`, resolutionStack);
      return obj;
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveReferencesRecursive(item, rootSpec, visitedRefs, resolutionStack, maxDepth));
    }

    // $refが見つかった場合
    if (obj.$ref && typeof obj.$ref === 'string') {
      const refPath = obj.$ref;
      
      // 循環参照チェック
      if (resolutionStack.includes(refPath)) {
        console.warn(`🔄 Circular reference detected: ${refPath}`);
        console.warn(`📚 Resolution stack: ${resolutionStack.join(' -> ')} -> ${refPath}`);
        // 循環参照の場合は元のオブジェクトを返す（$refのまま）
        return { $ref: refPath, _circular: true };
      }

      // 訪問済み参照の重複解決を防ぐ
      if (visitedRefs.has(refPath)) {
        console.log(`♻️ Reference already resolved: ${refPath}`);
        try {
          // 既に解決済みの参照を再度取得
          return this.resolveReference(refPath, rootSpec);
        } catch (error) {
          console.warn(`❌ Failed to re-resolve reference ${refPath}:`, error);
          return obj;
        }
      }

      try {
        console.log(`🔍 Resolving reference: ${refPath} (depth: ${resolutionStack.length})`);
        
        // 解決スタックに追加
        const newResolutionStack = [...resolutionStack, refPath];
        
        const resolved = this.resolveReference(refPath, rootSpec);
        if (resolved) {
          // 訪問済みに追加
          visitedRefs.add(refPath);
          console.log(`✅ Reference resolved: ${refPath}`);
          
          // 解決した参照をさらに再帰的に処理
          return this.resolveReferencesRecursive(resolved, rootSpec, visitedRefs, newResolutionStack, maxDepth);
        }
      } catch (error) {
        console.warn(`❌ Failed to resolve reference ${refPath}:`, error);
        return obj;
      }
    }

    // オブジェクトの各プロパティを再帰的に処理
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '$ref') { // $refプロパティは除外
        result[key] = this.resolveReferencesRecursive(value, rootSpec, visitedRefs, resolutionStack, maxDepth);
      }
    }

    return result;
  }

  // 単一の$ref参照を解決
  resolveReference(refPath, rootSpec) {
    if (!refPath.startsWith('#/')) {
      // 外部ファイル参照は現在サポートしない
      console.warn(`External reference not supported: ${refPath}`);
      return null;
    }

    // #/components/parameters/Ids -> ['components', 'parameters', 'Ids']
    const pathParts = refPath.substring(2).split('/');
    console.log(`🔍 Resolving path: ${refPath} -> [${pathParts.join(', ')}]`);
    
    let current = rootSpec;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
        console.log(`  ✅ Found: ${pathParts.slice(0, i + 1).join('/')}`);
      } else {
        console.error(`❌ Reference path not found at: ${pathParts.slice(0, i + 1).join('/')}`);
        console.error(`Available keys at this level:`, current ? Object.keys(current) : 'null/undefined');
        throw new Error(`Reference path not found: ${refPath}`);
      }
    }

    console.log(`🎯 Final resolved value for ${refPath}:`, current);
    return current;
  }

  // Chrome拡張と同じパラメータスキーマ取得ロジック
  getParameterSchema(spec, path, method) {
    try {
      console.log(`\n🧪 Testing parameter schema for: ${method.toUpperCase()} ${path} (Chrome Extension style)`);
      const operation = spec.paths?.[path]?.[method.toLowerCase()];
      if (!operation) {
        console.log('❌ No operation found');
        return null;
      }

      const parameters = operation.parameters || [];
      console.log(`📋 Found ${parameters.length} parameters:`, parameters.map(p => p.$ref || p.name));

      const schema = {
        path: [],
        query: [],
        header: [],
        cookie: []
      };

      for (const param of parameters) {
        // $refがまだ残っている場合の警告（Chrome拡張と同じ）
        if (param.$ref) {
          console.warn(`⚠️ Unresolved $ref found in parameter: ${param.$ref}`);
          continue;
        }

        if (!param.name || !param.in) {
          console.warn('⚠️ Invalid parameter structure:', param);
          continue;
        }

        const paramInfo = {
          name: param.name,
          required: param.required || false,
          type: param.schema?.type || 'string',
          description: param.description,
          example: param.example || param.schema?.example,
          enum: param.schema?.enum,
          format: param.schema?.format
        };

        console.log(`✅ Processing parameter: ${param.name} (${param.in})`);

        switch (param.in) {
          case 'path':
            schema.path.push(paramInfo);
            break;
          case 'query':
            schema.query.push(paramInfo);
            break;
          case 'header':
            schema.header.push(paramInfo);
            break;
          case 'cookie':
            schema.cookie.push(paramInfo);
            break;
          default:
            console.warn(`⚠️ Unknown parameter location: ${param.in}`);
        }
      }

      console.log('📊 Final parameter schema:', schema);
      
      // 統計情報
      const totalParams = schema.path.length + schema.query.length + schema.header.length + schema.cookie.length;
      const unresolvedCount = parameters.filter(p => p.$ref).length;
      
      console.log(`\n📈 Parameter statistics:`);
      console.log(`  - Path parameters: ${schema.path.length}`);
      console.log(`  - Query parameters: ${schema.query.length}`);
      console.log(`  - Header parameters: ${schema.header.length}`);
      console.log(`  - Cookie parameters: ${schema.cookie.length}`);
      console.log(`  - Total resolved parameters: ${totalParams}`);
      console.log(`  - Unresolved $ref parameters: ${unresolvedCount}`);
      
      if (unresolvedCount > 0) {
        console.warn(`⚠️ Found ${unresolvedCount} unresolved $ref parameters - this matches the Chrome extension issue!`);
      }
      
      return schema;
    } catch (error) {
      console.error('❌ Failed to get parameter schema:', error);
      return null;
    }
  }
}

/**
 * メイン処理
 */
function main() {
  console.log('🚀 Chrome Extension $ref Resolution Debug Test\n');
  
  try {
    // OpenAPI仕様を読み込み・パース
    console.log(`📖 Reading OpenAPI file: ${OPENAPI_FILE_PATH}`);
    
    if (!fs.existsSync(OPENAPI_FILE_PATH)) {
      throw new Error(`File not found: ${OPENAPI_FILE_PATH}`);
    }
    
    const fileContent = fs.readFileSync(OPENAPI_FILE_PATH, 'utf8');
    console.log(`📄 File size: ${fileContent.length} characters`);
    
    console.log('🔄 Parsing YAML format...');
    const spec = yaml.load(fileContent, { 
      schema: yaml.JSON_SCHEMA 
    });
    console.log('✅ YAML parsed successfully');
    
    // Chrome拡張と同じ方法で$ref参照を解決
    const parser = new ChromeExtensionOpenApiParser();
    const resolvedSpec = parser.resolveReferences(spec);
    
    // 問題のエンドポイントをテスト
    for (const endpoint of PROBLEM_ENDPOINTS) {
      parser.getParameterSchema(resolvedSpec, endpoint.path, endpoint.method);
    }
    
    // 特定のパラメータの状態をチェック
    console.log('\n🔍 Checking specific problematic parameters:');
    const problemParams = ['TestParam1', 'TestParam2', 'TestParam3', 'Limit'];
    
    for (const paramName of problemParams) {
      const paramRef = `#/components/parameters/${paramName}`;
      try {
        const resolved = parser.resolveReference(paramRef, resolvedSpec);
        console.log(`✅ ${paramName}: Successfully resolved`);
      } catch (error) {
        console.error(`❌ ${paramName}: Failed to resolve - ${error.message}`);
      }
    }
    
    console.log('\n✅ Debug test completed!');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみメイン処理を実行
if (require.main === module) {
  main();
}

module.exports = {
  ChromeExtensionOpenApiParser
};
