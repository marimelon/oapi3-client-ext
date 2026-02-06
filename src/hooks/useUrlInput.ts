import { useState, useEffect, useCallback } from 'react'

interface UseUrlInputOptions {
  customUrlPath: string
  setCustomUrlPath: (path: string) => void
  customQueryParams: Record<string, string>
  setCustomQueryParams: (params: Record<string, string>) => void
  queryParams: Record<string, string>
}

interface UseUrlInputReturn {
  inputFieldValue: string
  handleUrlPathChange: (newFullUrl: string) => void
  handleUrlKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleUrlBlur: () => void
}

export function useUrlInput({
  customUrlPath,
  setCustomUrlPath,
  customQueryParams,
  setCustomQueryParams,
  queryParams,
}: UseUrlInputOptions): UseUrlInputReturn {
  const [inputFieldValue, setInputFieldValue] = useState('')

  const allQueryParams = { ...queryParams, ...customQueryParams }

  // URL入力フィールド用のフルパス（クエリパラメータを含む）
  const getFullUrlForInput = useCallback(() => {
    let fullUrl = customUrlPath
    if (Object.keys(allQueryParams).length > 0) {
      const queryString = Object.entries(allQueryParams)
        .filter(([_, value]) => value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
      if (queryString) {
        fullUrl += '?' + queryString
      }
    }
    return fullUrl
  }, [customUrlPath, allQueryParams])

  // URLからクエリパラメータを抽出する関数
  const extractQueryParamsFromUrl = useCallback((url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://example.com${url}`)
      const params: Record<string, string> = {}
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value
      })
      return params
    } catch {
      return {}
    }
  }, [])

  // クエリパラメータを抽出して分離する関数
  const extractAndSeparateQueryParams = useCallback((fullUrl: string) => {
    if (fullUrl.includes('?') && fullUrl.includes('=')) {
      const [pathPart, queryPart] = fullUrl.split('?', 2)
      // 完全なkey=value形式が含まれている場合のみ処理
      if (queryPart && queryPart.includes('=') && !queryPart.endsWith('=')) {
        const extractedParams = extractQueryParamsFromUrl(fullUrl)
        if (Object.keys(extractedParams).length > 0) {
          // パスとクエリパラメータを別々に設定
          setCustomUrlPath(pathPart)
          setCustomQueryParams(extractedParams)
        }
      }
    }
  }, [extractQueryParamsFromUrl, setCustomUrlPath, setCustomQueryParams])

  // inputFieldValueを現在の状態に同期
  useEffect(() => {
    setInputFieldValue(getFullUrlForInput())
  }, [customUrlPath, JSON.stringify(customQueryParams), JSON.stringify(queryParams)])

  // URLパス変更時の処理
  const handleUrlPathChange = useCallback((newFullUrl: string) => {
    setInputFieldValue(newFullUrl)

    // クエリパラメータが含まれていない場合はパスのみ更新
    if (!newFullUrl.includes('?')) {
      setCustomUrlPath(newFullUrl)
    }
  }, [setCustomUrlPath])

  // キー入力時の処理（Enter, Tab, スペースで自動抽出）
  const handleUrlKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
      extractAndSeparateQueryParams(inputFieldValue)
    }
  }, [inputFieldValue, extractAndSeparateQueryParams])

  // フィールドからフォーカスが外れた時の処理
  const handleUrlBlur = useCallback(() => {
    extractAndSeparateQueryParams(inputFieldValue)
  }, [inputFieldValue, extractAndSeparateQueryParams])

  return { inputFieldValue, handleUrlPathChange, handleUrlKeyDown, handleUrlBlur }
}
