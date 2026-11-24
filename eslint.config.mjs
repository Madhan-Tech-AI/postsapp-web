import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Disallow dangerouslySetInnerHTML (XSS prevention)
      'react/no-danger': 'error',
      // Require alt text on images
      'jsx-a11y/alt-text': 'error',
      // No console.log in production code (use structured logging)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // TypeScript strict
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]

export default eslintConfig
