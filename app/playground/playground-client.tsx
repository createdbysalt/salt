"use client";

// Note: This playground feature requires the 'shaders' package to be installed
// npm install shaders
// For now, rendering a placeholder

export default function PlaygroundClient() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4 p-8">
        <h1 className="text-2xl font-medium">Shader Playground</h1>
        <p className="text-muted-foreground">
          This feature requires the shaders package to be installed.
        </p>
        <code className="text-sm bg-muted px-2 py-1 rounded">
          npm install shaders
        </code>
      </div>
    </div>
  );
}
