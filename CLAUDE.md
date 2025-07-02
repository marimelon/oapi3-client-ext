# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome Extension that provides an OpenAPI 3.x API client with $ref resolution, custom URL/query parameter support, and a Podman-like UI. Built with React + TypeScript + TailwindCSS.

## Common Commands

### Development
```bash
# Install dependencies (uses pnpm as package manager)
npm install

# Build the extension
npm run build

# Type checking
npm run type-check
```

### Extension Installation
1. Run `npm run build` to create the distribution
2. Open Chrome and navigate to chrome://extensions/
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist` folder

## Architecture

### Core Structure
- **React Context + Reducers**: Global state management via `src/context/AppContext.tsx`
- **Custom Hooks**: Business logic in `src/hooks/` (useOpenApi, useRequest, useStorage)
- **Library Layer**: Core functionality in `src/lib/` for OpenAPI parsing, HTTP requests, and utilities
- **Component Hierarchy**: Main UI built with nested React components in `src/options/components/`

### Key Components
- **NewApp**: Root application container with error/loading states
- **Sidebar**: API specification list, environment selector, endpoint navigation
- **RequestPanel**: Parameter input, custom URL/query parameters, request body editor
- **ResponsePanel**: Status display, collapsible headers, response body with copy functionality

### OpenAPI $ref Resolution
The system implements sophisticated $ref reference resolution with:
- **Circular reference detection**: Prevents infinite loops using resolution stacks
- **Depth limiting**: Maximum 50 levels to prevent stack overflow
- **Caching**: Visited references tracked to avoid duplicate resolution
- **Error handling**: Graceful fallback when references are not found

### State Management Pattern
Uses React Context with reducer pattern:
```typescript
// Global state includes:
interface AppState {
  openApiSpecs: OpenAPISpec[]
  environments: Environment[]
  selectedSpec/Environment/Endpoint: ...
  requestState: { loading, result, error }
}
```

## Key Implementation Details

### Custom URL and Query Parameters
- **Dual Mode**: Support for both OpenAPI spec-defined and custom arbitrary parameters
- **URL Parsing**: Automatic extraction of query parameters from URL input field
- **Real-time Preview**: Live URL preview with parameter substitution

### Dark Mode Support
- Uses TailwindCSS `dark:` variants throughout
- Responsive design with proper contrast ratios
- All interactive elements have appropriate dark mode styling

### Request Execution Flow
1. Parameter validation (path params, query params)
2. URL construction with parameter substitution
3. Header merging (environment + custom headers)
4. HTTP request via fetch API with Chrome extension permissions
5. Response processing and history storage

### Copy Functionality
- Visual feedback with temporary "Copied!" state (2 seconds)
- Proper error handling for clipboard API failures
- Applied to URL preview, response headers, and response body

## Chrome Extension Specifics

### Manifest V3 Configuration
- Service worker background script
- Host permissions for all HTTP/HTTPS
- Storage and activeTab permissions
- Options page as main application interface

### CORS Handling
Chrome extension permissions allow bypassing CORS restrictions that would normally block web applications.

## Development Patterns

### Component Styling
- Uses TailwindCSS with consistent spacing (p-3, gap-3, space-y-3)
- Dark mode support with `dark:` prefixes
- Responsive design with `md:` breakpoints

### Error Boundaries
- Global error state managed in AppContext
- User-friendly error messages with dismiss functionality
- Console logging for debugging

### Memory Management
- Efficient $ref caching to prevent memory leaks
- Request history limited to reasonable size
- Proper cleanup of state when switching contexts

## File Organization

### Critical Files
- `src/lib/openapi.ts`: OpenAPI parsing and $ref resolution engine
- `src/lib/request.ts`: HTTP request builder and executor
- `src/context/AppContext.tsx`: Central state management
- `src/hooks/useOpenApi.ts`: OpenAPI business logic hook
- `src/hooks/useRequest.ts`: Request execution logic hook

### UI Components
- All components support dark mode
- Consistent prop interfaces
- Event handling with proper preventDefault/stopPropagation
- Accessibility considerations (proper ARIA labels, keyboard navigation)

## Testing Approach

### Manual Testing
- Load various OpenAPI specifications (JSON/YAML)
- Test $ref resolution with circular references
- Verify parameter validation and URL construction
- Test request execution across different environments
- Validate dark mode appearance and functionality

### Key Edge Cases
- Malformed OpenAPI specifications
- Circular $ref references
- Network failures during requests
- Large API specifications (performance)
- Invalid parameter combinations

## Git Workflow and Commit Guidelines

### Automatic Commit Creation
When implementing new features or bug fixes, **automatically create commits** after completing each logical unit of work. This ensures continuous development progress is preserved.

#### Commit Creation Rules
1. **Always create commits** when:
   - Adding new features
   - Fixing bugs
   - Improving existing functionality
   - Updating documentation
   - Refactoring code

2. **Commit message format**:
   ```
   <type>: <description>
   
   <detailed explanation if needed>
   
   🤖 Generated with [Claude Code](https://claude.ai/code)
   
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

3. **Commit types**:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `refactor:` - Code refactoring
   - `style:` - UI/styling changes
   - `docs:` - Documentation updates
   - `chore:` - Maintenance tasks

#### Push Policy
- **NEVER push automatically** - pushes should only be done when explicitly requested by the developer
- Always ask for confirmation before pushing: "Should I push these changes to the remote repository?"
- If the developer doesn't explicitly request a push, only create the commit locally

#### Documentation Update Requirements
When completing work, **always update relevant documentation** to reflect changes:

1. **Update CLAUDE.md** when:
   - Adding new components or architectural patterns
   - Changing core functionality or workflows
   - Adding new development commands or processes
   - Modifying key implementation details

2. **Update component documentation** when:
   - Adding new props or interfaces
   - Changing component behavior
   - Adding new features to existing components

3. **Update README or other docs** when:
   - Changing installation or setup procedures
   - Adding new dependencies
   - Modifying user-facing functionality

#### Example Workflow
1. Implement feature/fix
2. Test the implementation
3. **Update relevant documentation** (CLAUDE.md, component docs, etc.)
4. Automatically create commit with descriptive message including doc updates
5. Ask developer: "The changes have been committed locally. Would you like me to push to the remote repository?"
6. Only push if developer confirms

This approach ensures:
- Continuous progress tracking
- No lost work due to missed commits
- Developer control over when changes are shared
- Clean git history with meaningful commits
- **Up-to-date documentation that reflects current implementation**