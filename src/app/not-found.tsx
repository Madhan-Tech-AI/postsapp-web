import React from 'react'

export default function NotFound() {
  // Global root 404 page with navigation links to both language editions
  return (
    <main
      id="main-content"
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold text-primary-200 dark:text-primary-900 mb-4">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Page not found
        </h2>
        <p className="text-muted mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/en"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Go Home (English)
          </a>
          <a
            href="/ta"
            className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            முகப்பு (தமிழ்)
          </a>
        </div>
      </div>
    </main>
  )
}
