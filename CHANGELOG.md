# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-09

### Added
- Request/Response audit trail copy functionality
- Copy button to export complete request and response details for audit purposes
- Automatic masking of sensitive headers (Authorization, API keys)
- Well-formatted audit trail output with timestamp, method, URL, headers, body, status, and duration

### Fixed
- ResponsePanel content overflow issue in split view mode
- Added proper flexbox constraints to prevent content from being cut off on the right side
- Improved layout stability when resizing panels

### Changed
- Updated version number from 1.0.0 to 1.1.0

### Security
- Removed unnecessary activeTab permission from manifest

## [1.0.0] - 2025-01-06

### Initial Release
- OpenAPI 3.x specification support with $ref resolution
- Custom URL and query parameter support
- Request/Response panel with Podman-like UI
- Dark mode support
- Request history tracking
- Environment management
- Auto-save request parameters per endpoint
- jq query support for JSON response filtering
- Request body builder with form and raw JSON modes
- Collapsible sections for headers and response details
- Copy functionality for URLs, headers, and response bodies