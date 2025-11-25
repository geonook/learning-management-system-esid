/**
 * Custom Error Page for Pages Router
 * This file is needed to fix the "<Html> should not be imported" error
 * when building a Next.js App Router project
 */

import { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#f9fafb',
      padding: '1rem'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#111827',
          margin: 0
        }}>
          {statusCode || 'Error'}
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: '#6b7280',
          marginTop: '1rem'
        }}>
          {statusCode === 404
            ? 'Page not found'
            : statusCode === 500
            ? 'Internal server error'
            : 'An unexpected error occurred'}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Go back home
        </a>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error
