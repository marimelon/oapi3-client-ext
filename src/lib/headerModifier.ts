/**
 * Chrome Extension Header Modifier using declarativeNetRequest API
 * Handles User-Agent and other restricted headers that cannot be modified via fetch API
 */

interface HeaderModificationOptions {
  url: string
  headers: Record<string, string>
  method?: string
}

class HeaderModifier {
  private ruleIdCounter = 1000 // Start with high number to avoid conflicts
  private activeRuleIds: number[] = []

  /**
   * Check if a header requires declarativeNetRequest API (restricted headers)
   */
  private isRestrictedHeader(headerName: string): boolean {
    const restrictedHeaders = [
      'user-agent',
      'accept-encoding',
      'accept-charset',
      'access-control-request-headers',
      'access-control-request-method',
      'connection',
      'content-length',
      'cookie',
      'cookie2',
      'date',
      'dnt',
      'expect',
      'host',
      'keep-alive',
      'origin',
      'referer',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
      'via'
    ]
    return restrictedHeaders.includes(headerName.toLowerCase())
  }

  /**
   * Setup header modification rules for a request
   */
  async setupHeaderModification(options: HeaderModificationOptions): Promise<void> {
    const restrictedHeaders: Record<string, string> = {}
    const normalHeaders: Record<string, string> = {}

    // Separate restricted and normal headers
    Object.entries(options.headers).forEach(([key, value]) => {
      if (this.isRestrictedHeader(key)) {
        restrictedHeaders[key] = value
      } else {
        normalHeaders[key] = value
      }
    })

    // If no restricted headers, no need to setup rules
    if (Object.keys(restrictedHeaders).length === 0) {
      return
    }

    // Clear previous rules
    await this.clearRules()

    // Create rule for header modification
    const ruleId = this.ruleIdCounter++
    const requestHeaders: chrome.declarativeNetRequest.ModifyHeaderInfo[] = []

    Object.entries(restrictedHeaders).forEach(([key, value]) => {
      requestHeaders.push({
        header: key,
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: value
      })
    })

    const rule: chrome.declarativeNetRequest.Rule = {
      id: ruleId,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: requestHeaders
      },
      condition: {
        urlFilter: options.url,
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST]
      }
    }

    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [rule]
      })
      this.activeRuleIds.push(ruleId)
    } catch (error) {
      console.error('Failed to setup header modification rule:', error)
      throw error
    }
  }

  /**
   * Clear all active header modification rules
   */
  async clearRules(): Promise<void> {
    if (this.activeRuleIds.length === 0) {
      return
    }

    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: this.activeRuleIds
      })
      this.activeRuleIds = []
    } catch (error) {
      console.error('Failed to clear header modification rules:', error)
    }
  }

  /**
   * Check if declarativeNetRequest permission is available
   */
  isDeclarativeNetRequestAvailable(): boolean {
    return !!(chrome?.declarativeNetRequest)
  }

  /**
   * Get headers that would be modified by declarativeNetRequest
   */
  getRestrictedHeaders(headers: Record<string, string>): Record<string, string> {
    const restricted: Record<string, string> = {}
    Object.entries(headers).forEach(([key, value]) => {
      if (this.isRestrictedHeader(key)) {
        restricted[key] = value
      }
    })
    return restricted
  }

  /**
   * Get headers that can be set via fetch API
   */
  getNormalHeaders(headers: Record<string, string>): Record<string, string> {
    const normal: Record<string, string> = {}
    Object.entries(headers).forEach(([key, value]) => {
      if (!this.isRestrictedHeader(key)) {
        normal[key] = value
      }
    })
    return normal
  }
}

export const headerModifier = new HeaderModifier()
export type { HeaderModificationOptions }