import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '3rem 2rem', maxWidth: 600, margin: '0 auto',
        }}>
          <div style={{
            background: 'var(--red-dim)', border: '1px solid rgba(224,92,92,0.25)',
            borderRadius: 'var(--radius-lg)', padding: '1.5rem',
          }}>
            <h3 style={{ color: 'var(--red)', marginBottom: '0.75rem', fontSize: '1rem' }}>
              Something went wrong on this page
            </h3>
            <pre style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
              color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              background: 'var(--ink-3)', padding: '0.85rem', borderRadius: 'var(--radius)',
              maxHeight: 300, overflowY: 'auto',
            }}>
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack}
            </pre>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '1rem' }}
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
