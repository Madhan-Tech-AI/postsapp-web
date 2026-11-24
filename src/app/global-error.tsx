'use client'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  // Log to server (in production this goes to monitoring)
  if (process.env.NODE_ENV !== 'production') {
    console.error('Global error boundary:', error)
  }
  // Note: Never display error.message to users in production — it may contain sensitive info

  return (
    <html>
      <body>
        <main
          id="main-content"
          className="min-h-screen flex items-center justify-center px-4 font-sans"
        >
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-8">
              We're experiencing technical difficulties. Please try again.
            </p>
            <button
              onClick={reset}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
