import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.js';

describe('App', () => {
  it('renders the ThumbRack brand name', () => {
    render(<App />);
    expect(screen.getByText('ThumbRack')).toBeInTheDocument();
  });

  it('renders the directory path input', () => {
    render(<App />);
    expect(screen.getByRole('textbox', { name: /directory path/i })).toBeInTheDocument();
  });

  it('renders the Load button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
  });

  it('renders the empty state when no folder is loaded', () => {
    render(<App />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
