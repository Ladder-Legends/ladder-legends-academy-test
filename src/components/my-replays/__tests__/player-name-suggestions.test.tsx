/**
 * Tests for PlayerNameSuggestionCard component
 * Verifies player name confirmation/rejection UI works correctly
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlayerNameSuggestionCard } from '../player-name-suggestion-card';

describe('PlayerNameSuggestionCard', () => {
  it('should display the player name and count', () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn();

    render(
      <PlayerNameSuggestionCard
        playerName="Lotus"
        count={5}
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );

    expect(screen.getByText('Is this your player name?')).toBeInTheDocument();
    expect(screen.getByText('Lotus')).toBeInTheDocument();
    expect(screen.getByText(/5 of your uploaded replays/)).toBeInTheDocument();
  });

  it('should call onConfirm when check button is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onReject = vi.fn();

    render(
      <PlayerNameSuggestionCard
        playerName="Lotus"
        count={3}
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );

    // Find the confirm button (green background with Check icon)
    const confirmButton = screen.getAllByRole('button')[1]; // Second button is confirm
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('Lotus');
    });
    expect(onReject).not.toHaveBeenCalled();
  });

  it('should call onReject when X button is clicked', async () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn().mockResolvedValue(undefined);

    render(
      <PlayerNameSuggestionCard
        playerName="WrongName"
        count={4}
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );

    // Find the reject button (first button with X icon)
    const rejectButton = screen.getAllByRole('button')[0];
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(onReject).toHaveBeenCalledWith('WrongName');
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should disable buttons while processing', async () => {
    // Create a promise that we can resolve manually
    let resolvePromise: () => void;
    const onConfirm = vi.fn().mockImplementation(() => new Promise<void>(resolve => {
      resolvePromise = resolve;
    }));
    const onReject = vi.fn();

    render(
      <PlayerNameSuggestionCard
        playerName="Lotus"
        count={3}
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );

    const buttons = screen.getAllByRole('button');
    const rejectButton = buttons[0];
    const confirmButton = buttons[1];

    // Initially buttons should be enabled
    expect(rejectButton).not.toBeDisabled();
    expect(confirmButton).not.toBeDisabled();

    // Click confirm to start processing
    fireEvent.click(confirmButton);

    // Buttons should be disabled during processing
    await waitFor(() => {
      expect(rejectButton).toBeDisabled();
      expect(confirmButton).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!();

    // After processing, buttons should be enabled again
    await waitFor(() => {
      expect(rejectButton).not.toBeDisabled();
      expect(confirmButton).not.toBeDisabled();
    });
  });

  it('should handle different player names correctly', () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn();

    const { rerender } = render(
      <PlayerNameSuggestionCard
        playerName="Player1"
        count={10}
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );

    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText(/10 of your uploaded replays/)).toBeInTheDocument();

    // Rerender with different props
    rerender(
      <PlayerNameSuggestionCard
        playerName="DifferentPlayer"
        count={25}
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );

    expect(screen.getByText('DifferentPlayer')).toBeInTheDocument();
    expect(screen.getByText(/25 of your uploaded replays/)).toBeInTheDocument();
  });

  it('should handle special characters in player names', () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn();

    render(
      <PlayerNameSuggestionCard
        playerName="[TAG]Player<123>"
        count={7}
        onConfirm={onConfirm}
        onReject={onReject}
      />
    );

    expect(screen.getByText('[TAG]Player<123>')).toBeInTheDocument();
  });
});
