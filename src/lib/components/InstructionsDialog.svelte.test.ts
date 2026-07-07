import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import InstructionsDialog from './InstructionsDialog.svelte';
import { setLocaleForTests } from '$lib/test-utils';

describe('InstructionsDialog', () => {
	beforeEach(async () => {
		await setLocaleForTests('en-US');
	});

	// Helper functions to reduce duplication
	function getInstructionsButton(name: string | RegExp = /instructions/i) {
		// Bits UI renders multiple buttons with the same accessible name.
		// The first button is the visible trigger used for user interaction.
		const buttons = screen.getAllByRole('button', { name });
		return buttons[0];
	}

	async function getInstructionsButtonAsync(name: string | RegExp = /instructions/i) {
		const buttons = await screen.findAllByRole('button', { name });
		return buttons[0];
	}

	async function openDialog(buttonName?: string | RegExp) {
		const button = getInstructionsButton(buttonName);
		await fireEvent.click(button);
	}

	describe('Rendering', () => {
		it('should render trigger button when iconOnly is false', () => {
			render(InstructionsDialog, {
				props: {
					instructions: 'Test instructions',
					iconOnly: false
				}
			});

			const button = getInstructionsButton();
			expect(button).toHaveAccessibleName('Instructions');
		});

		it('should render trigger button when iconOnly is true', () => {
			render(InstructionsDialog, {
				props: {
					instructions: 'Test instructions',
					iconOnly: true
				}
			});

			const button = getInstructionsButton();
			expect(button).toHaveAccessibleName('Instructions');
		});
	});

	describe('Dialog Behaviour', () => {
		it('should open dialog when trigger button is clicked', async () => {
			render(InstructionsDialog, {
				props: {
					instructions: 'Test instructions content'
				}
			});

			await openDialog();

			expect(await screen.findByRole('dialog')).toBeInTheDocument();
		});

		it('should display dialog title after opening', async () => {
			render(InstructionsDialog, {
				props: {
					instructions: 'Test instructions'
				}
			});

			await openDialog();

			const dialogTitle = await screen.findByRole('heading', { name: 'Instructions' });
			expect(dialogTitle).toBeInTheDocument();
		});
	});

	describe('Instructions Content', () => {
		it('should display provided instructions', async () => {
			const instructionText = 'Read these instructions carefully';

			render(InstructionsDialog, {
				props: {
					instructions: instructionText
				}
			});

			await openDialog();

			expect(await screen.findByText(instructionText)).toBeInTheDocument();
		});

		it('should show fallback message when instructions is undefined', async () => {
			render(InstructionsDialog, {
				props: {
					instructions: undefined
				}
			});

			await openDialog();

			expect(await screen.findByText('No instructions available.')).toBeInTheDocument();
		});

		it('should show fallback message when instructions is empty', async () => {
			render(InstructionsDialog, {
				props: {
					instructions: ''
				}
			});

			await openDialog();

			expect(await screen.findByText('No instructions available.')).toBeInTheDocument();
		});
	});

	describe('State Updates', () => {
		it('should update instructions content when rerendered', async () => {
			const { rerender } = render(InstructionsDialog, {
				props: {
					instructions: 'Original instructions'
				}
			});

			await openDialog();
			expect(await screen.findByText('Original instructions')).toBeInTheDocument();

			rerender({
				instructions: 'Updated instructions'
			});

			expect(await screen.findByText('Updated instructions')).toBeInTheDocument();
		});

		it('should update trigger button when iconOnly changes', () => {
			const { rerender } = render(InstructionsDialog, {
				props: {
					instructions: 'Test',
					iconOnly: false
				}
			});

			let button = getInstructionsButton();
			expect(button).toHaveAccessibleName('Instructions');

			rerender({
				instructions: 'Test',
				iconOnly: true
			});

			button = getInstructionsButton();
			expect(button).toHaveAccessibleName('Instructions');
		});
	});

	describe('Accessibility', () => {
		it('should have accessible dialog after opening', async () => {
			render(InstructionsDialog, {
				props: {
					instructions: 'Test instructions'
				}
			});

			await openDialog();

			const dialog = await screen.findByRole('dialog');
			expect(dialog).toHaveAccessibleName('Instructions');
		});
	});

	describe('Localization', () => {
		it('should render English translations', async () => {
			render(InstructionsDialog, {
				props: {
					instructions: undefined
				}
			});

			const button = getInstructionsButton('Instructions');
			expect(button).toHaveAccessibleName('Instructions');

			await openDialog('Instructions');

			expect(await screen.findByText('No instructions available.')).toBeInTheDocument();
		});

		it('should render Hindi translations', async () => {
			await setLocaleForTests('hi-IN');

			render(InstructionsDialog, {
				props: {
					instructions: undefined
				}
			});

			const button = await getInstructionsButtonAsync('निर्देश');
			expect(button).toHaveAccessibleName('निर्देश');

			await fireEvent.click(button);

			expect(await screen.findByText('कोई निर्देश उपलब्ध नहीं हैं।')).toBeInTheDocument();
		});
	});
});
