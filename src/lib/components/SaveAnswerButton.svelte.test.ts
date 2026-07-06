import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SaveAnswerButton from './SaveAnswerButton.svelte';
import { setLocaleForTests } from '$lib/test-utils';

describe('SaveAnswerButton', () => {
	describe('Rendering', () => {
		it('should show "Save Answer" for new answer', () => {
			render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: true,
					hasSaved: false
				}
			});

			expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();
		});

		it('should show "Update Answer" when modifying saved answer', () => {
			render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: true,
					hasSaved: true
				}
			});

			expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
		});

		it('should show "Saved" with check icon when answer is unchanged', () => {
			render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: false,
					hasSaved: true
				}
			});

			const button = screen.getByRole('button', { name: /saved/i });
			const icon = button.querySelector('svg');
			
			expect(button).toBeInTheDocument();
			expect(icon).toBeInTheDocument();
			expect(icon).toHaveClass('mr-1', 'h-4', 'w-4');
		});

		it('should not show check icon for "Save Answer" and "Update Answer"', () => {
			const { rerender } = render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: true,
					hasSaved: false
				}
			});

			expect(screen.getByRole('button').querySelector('svg')).not.toBeInTheDocument();

			rerender({
				onclick: vi.fn(),
				hasUnsaved: true,
				hasSaved: true
			});

			expect(screen.getByRole('button').querySelector('svg')).not.toBeInTheDocument();
		});
	});

	describe('Interactions', () => {
		it('should call onclick when clicked', async () => {
			const handleClick = vi.fn();

			render(SaveAnswerButton, {
				props: {
					onclick: handleClick,
					hasUnsaved: true,
					hasSaved: false
				}
			});

			await fireEvent.click(screen.getByRole('button'));

			expect(handleClick).toHaveBeenCalledOnce();
		});
	});

	describe('Disabled State', () => {
		it('should be disabled when hasUnsaved is false', () => {
			render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: false,
					hasSaved: true
				}
			});

			expect(screen.getByRole('button')).toBeDisabled();
		});

		it('should be disabled when disabled prop is true', () => {
			render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					disabled: true,
					hasUnsaved: true,
					hasSaved: false
				}
			});

			expect(screen.getByRole('button')).toBeDisabled();
		});

		it('should update disabled state when props change', () => {
			const { rerender } = render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					disabled: false,
					hasUnsaved: true,
					hasSaved: false
				}
			});

			expect(screen.getByRole('button')).not.toBeDisabled();

			rerender({
				onclick: vi.fn(),
				disabled: true,
				hasUnsaved: true,
				hasSaved: false
			});

			expect(screen.getByRole('button')).toBeDisabled();
		});
	});

	describe('State Transitions', () => {
		it('should transition from "Save Answer" to "Saved"', () => {
			const { rerender } = render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: true,
					hasSaved: false
				}
			});

			expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();

			rerender({
				onclick: vi.fn(),
				hasUnsaved: false,
				hasSaved: true
			});

			expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
		});

		it('should transition from "Saved" to "Update Answer"', () => {
			const { rerender } = render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: false,
					hasSaved: true
				}
			});

			expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();

			rerender({
				onclick: vi.fn(),
				hasUnsaved: true,
				hasSaved: true
			});

			expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();
		});
	});

	describe('Localization', () => {
		it('should render all states in English', async () => {
			await setLocaleForTests('en-US');

			const { rerender } = render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: true,
					hasSaved: false
				}
			});

			expect(screen.getByRole('button', { name: /save answer/i })).toBeInTheDocument();

			rerender({
				onclick: vi.fn(),
				hasUnsaved: true,
				hasSaved: true
			});

			expect(screen.getByRole('button', { name: /update answer/i })).toBeInTheDocument();

			rerender({
				onclick: vi.fn(),
				hasUnsaved: false,
				hasSaved: true
			});

			expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
		});

		it('should render all states in Hindi', async () => {
			await setLocaleForTests('hi-IN');

			const { rerender } = render(SaveAnswerButton, {
				props: {
					onclick: vi.fn(),
					hasUnsaved: true,
					hasSaved: false
				}
			});

			await screen.findByRole('button', { name: /उत्तर संग्रहित करें/i });

			rerender({
				onclick: vi.fn(),
				hasUnsaved: true,
				hasSaved: true
			});

			await screen.findByRole('button', { name: /उत्तर अपडेट करें/i });

			rerender({
				onclick: vi.fn(),
				hasUnsaved: false,
				hasSaved: true
			});

			await screen.findByRole('button', { name: /उत्तर सहेजा गया/i });
		});
	});
});
