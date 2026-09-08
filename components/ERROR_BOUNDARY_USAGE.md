# ErrorBoundary Usage Guide

## Overview

The ErrorBoundary components provide robust error handling for the application, catching JavaScript errors and displaying user-friendly fallback UIs.

## Components

### 1. ErrorBoundary
Main error boundary component that catches errors in child components.

### 2. ErrorFallback
Customizable error UI with different styles for different error types.

## Usage Examples

### Basic Usage

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';
import LessonViewer from './components/LessonViewer';

function App() {
  return (
    <ErrorBoundary>
      <LessonViewer {...props} />
    </ErrorBoundary>
  );
}
```

### With Custom Fallback

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorFallback } from './components/ErrorFallback';

function App() {
  return (
    <ErrorBoundary
      fallback={(error, errorInfo, reset) => (
        <ErrorFallback
          error={error}
          errorType="domain"
          onRetry={reset}
          onGoBack={() => window.history.back()}
        />
      )}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### Nesting Multiple Boundaries

```tsx
<ErrorBoundary> {/* App-level */}
  <Router>
    <ErrorBoundary> {/* Route-level */}
      <LessonViewer />
    </ErrorBoundary>
  </Router>
</ErrorBoundary>
```

## Error Types

- **`domain`**: Validation errors from domain entities
- **`notFound`**: Resource not found errors
- **`network`**: Connection/API errors
- **`unknown`**: Unexpected errors

## Benefits

- ✅ Prevents app crashes
- ✅ User-friendly error messages
- ✅ Error recovery options
- ✅ Developer-friendly stack traces (dev mode)
- ✅ Ready for error tracking services (Sentry, LogRocket)

## Next Steps

Add ErrorBoundary to App.tsx to wrap the entire application or specific routes.
