import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

describe('EDUCATERASTA App component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders application header and foundation baseline title', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          status: 'healthy',
          service: 'Educaterasta',
          version: '0.1.0',
          environment: 'development',
          database_connected: true,
          timestamp: new Date().toISOString(),
        }),
      } as Response)
    );

    render(<App />);

    expect(screen.getByText('EDUCATERASTA')).toBeInTheDocument();
    expect(screen.getByText('System Foundation Baseline')).toBeInTheDocument();
    expect(screen.getByText('Phase 00: Foundation')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('displays error notice when backend health check fails', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.reject(new Error('Network error connecting to API'))
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Backend Connection Notice:')).toBeInTheDocument();
      expect(screen.getByText('Network error connecting to API')).toBeInTheDocument();
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });
});

