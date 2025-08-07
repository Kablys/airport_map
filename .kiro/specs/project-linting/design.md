# Design Document

## Overview

The project linting system will use Biome as the primary linting and formatting tool, supplemented with specialized tools for file types not covered by Biome. This approach provides a unified, fast solution that handles JavaScript, TypeScript, HTML, CSS, JSON, and GraphQL, while adding minimal additional tools for TOML, Markdown, and SVG validation.

Biome was chosen because it:

- Combines formatting and linting in one tool (like Prettier + ESLint)
- Is significantly faster than traditional toolchains
- Requires minimal configuration
- Supports most of our target file types natively
- Aligns with the project's preference for simple, direct solutions

## Architecture

### Primary Tool: Biome

- **Handles**: JavaScript, TypeScript, HTML, CSS, JSON
- **Features**: Linting, formatting, auto-fixing
- **Configuration**: Single `biome.json` file
- **Performance**: ~35x faster than Prettier

### Supplementary Tools

- **markdownlint-cli2**: Markdown linting and formatting
- **taplo**: TOML linting and formatting
- **svglint**: SVG validation and optimization

### Integration Layer

- **Package.json scripts**: Unified commands for all linting operations
- **Parallel execution**: Run multiple linters simultaneously for speed
- **Exit code aggregation**: Proper error reporting across all tools

## Components and Interfaces

### 1. Biome Configuration (`biome.json`)

```json
{
  "files": {
    "include": ["src/**/*", "*.{js,ts,html,css,json}"],
    "ignore": ["node_modules/**", "dist/**", ".git/**"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "parser": {
      "unsafeParameterDecoratorsEnabled": false
    }
  }
}
```

### 2. Markdownlint Configuration (`.markdownlint.json`)

```json
{
  "default": true,
  "MD013": false,
  "MD033": false,
  "MD041": false
}
```

### 3. SVGLint Configuration (`.svglintrc.js`)

```javascript
module.exports = {
  rules: {
    valid: true,
    "elm-content": true,
    "attr-pattern": {
      "class": /^[a-z][a-z0-9\-]*$/
    }
  }
}
```

### 4. Package.json Scripts

```json
{
  "scripts": {
    "lint": "npm run lint:biome && npm run lint:markdown && npm run lint:toml && npm run lint:svg",
    "lint:biome": "biome check .",
    "lint:markdown": "markdownlint-cli2 \"**/*.md\"",
    "lint:toml": "taplo check **/*.toml",
    "lint:svg": "svglint assets/icons/*.svg",
    "lint:fix": "npm run lint:fix:biome && npm run lint:fix:markdown && npm run lint:fix:toml",
    "lint:fix:biome": "biome check --write .",
    "lint:fix:markdown": "markdownlint-cli2 --fix \"**/*.md\"",
    "lint:fix:toml": "taplo format **/*.toml"
  }
}
```

## Data Models

### Linting Result Structure

```typescript
interface LintResult {
  tool: string;
  files: string[];
  errors: LintError[];
  warnings: LintWarning[];
  fixable: boolean;
  exitCode: number;
}

interface LintError {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}
```

### Configuration Schema

```typescript
interface ProjectLintConfig {
  biome: BiomeConfig;
  markdownlint: MarkdownlintConfig;
  svglint: SVGLintConfig;
  taplo: TaploConfig;
  filePatterns: {
    [key: string]: string[];
  };
}
```

## Error Handling

### 1. Tool Availability Checks

- Verify all linting tools are installed before execution
- Provide clear installation instructions if tools are missing
- Graceful degradation if optional tools are unavailable

### 2. File Processing Errors

- Continue linting other files if individual files fail
- Report file-specific errors with context
- Aggregate results across all tools

### 3. Configuration Validation

- Validate configuration files on startup
- Provide helpful error messages for invalid configurations
- Fall back to default configurations if custom configs are invalid

### 4. Exit Code Management

```javascript
// Aggregate exit codes from all linting tools
const aggregateExitCode = (results) => {
  return results.some(result => result.exitCode !== 0) ? 1 : 0;
};
```

## Implementation Considerations

### 1. Tool Installation Strategy

- Use exact versions in package.json for consistency
- Install as devDependencies to keep production bundle clean
- Consider using npm scripts vs global installations

### 2. Configuration Management

- Keep configurations minimal and focused
- Use extends/presets where possible to reduce maintenance
- Document any custom rule overrides

### 3. IDE Integration

- Ensure configurations work with VS Code extensions
- Provide editor settings for consistent formatting
- Consider adding .editorconfig for cross-editor consistency

### 4. CI/CD Integration

- Design scripts to work in CI environments
- Ensure proper exit codes for build pipeline integration
- Consider adding pre-commit hooks for automatic linting
