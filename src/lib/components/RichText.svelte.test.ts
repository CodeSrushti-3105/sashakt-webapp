import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import RichText from './RichText.svelte';

describe('RichText', () => {
	let mockMathJax: {
		startup: { promise: Promise<void> };
		typesetClear: ReturnType<typeof vi.fn>;
		typesetPromise: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		// Setup MathJax mock
		mockMathJax = {
			startup: { promise: Promise.resolve() },
			typesetClear: vi.fn(),
			typesetPromise: vi.fn().mockResolvedValue(undefined)
		};
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('Rendering', () => {
		it('should render HTML content in a div by default', () => {
			const { container } = render(RichText, {
				props: {
					content: '<p>Test content</p>'
				}
			});

			const element = container.querySelector('.rich-text');
			expect(element?.tagName).toBe('DIV');
			expect(element).toHaveTextContent('Test content');
		});

		it('should render as a span when as="span"', () => {
			const { container } = render(RichText, {
				props: {
					content: '<strong>Bold text</strong>',
					as: 'span'
				}
			});

			const element = container.querySelector('.rich-text');
			expect(element?.tagName).toBe('SPAN');
			expect(element).toHaveTextContent('Bold text');
		});
	});

	describe('CSS Classes', () => {
		it('should apply the default rich-text class', () => {
			const { container } = render(RichText, {
				props: {
					content: 'Test'
				}
			});

			const element = container.querySelector('.rich-text');
			expect(element).toHaveClass('rich-text');
		});

		it('should combine default class with custom class', () => {
			const { container } = render(RichText, {
				props: {
					content: 'Test',
					class: 'text-lg font-bold'
				}
			});

			const element = container.querySelector('.rich-text');
			expect(element).toHaveClass('rich-text', 'text-lg', 'font-bold');
		});
	});

	describe('Empty Content', () => {
		it.each([null, undefined])('should render correctly when content is %s', (content) => {
			const { container } = render(RichText, {
				props: {
					content
				}
			});

			const element = container.querySelector('.rich-text');
			expect(element).toBeInTheDocument();
			expect(element).toHaveTextContent('');
		});
	});

	describe('MathJax Integration', () => {
		it('should render content when MathJax is unavailable', () => {
			vi.stubGlobal('window', { MathJax: undefined });

			const { container } = render(RichText, {
				props: {
					content: 'Test with \\(x^2\\)'
				}
			});

			const element = container.querySelector('.rich-text');
			expect(element).toHaveTextContent('Test with \\(x^2\\)');
		});

		it('should call typesetClear and typesetPromise when MathJax is available', async () => {
			vi.stubGlobal('window', { MathJax: mockMathJax });

			const { container } = render(RichText, {
				props: {
					content: '<p>Formula: \\(x^2\\)</p>'
				}
			});

			const element = container.querySelector('.rich-text');

			await waitFor(
				() => {
					expect(mockMathJax.typesetClear).toHaveBeenCalledWith([element]);
					expect(mockMathJax.typesetPromise).toHaveBeenCalledWith([element]);
				},
				{ container }
			);
		});

		it('should wait for startup promise before typesetting', async () => {
			let resolveStartup: () => void;
			const startupPromise = new Promise<void>((resolve) => {
				resolveStartup = resolve;
			});

			const mathJaxWithPendingStartup = {
				...mockMathJax,
				startup: { promise: startupPromise }
			};

			vi.stubGlobal('window', { MathJax: mathJaxWithPendingStartup });

			const { container } = render(RichText, {
				props: {
					content: '<p>Formula: \\(x^2\\)</p>'
				}
			});

			// TypesetPromise should not be called yet
			expect(mathJaxWithPendingStartup.typesetPromise).not.toHaveBeenCalled();

			// Resolve startup
			resolveStartup!();

			// Now typesetting should happen
			await waitFor(
				() => {
					expect(mathJaxWithPendingStartup.typesetPromise).toHaveBeenCalled();
				},
				{ container }
			);
		});

		it('should not throw if typesetPromise rejects', async () => {
			const failingMathJax = {
				...mockMathJax,
				typesetPromise: vi.fn().mockRejectedValue(new Error('MathJax error'))
			};

			vi.stubGlobal('window', { MathJax: failingMathJax });

			const { container } = render(RichText, {
				props: {
					content: '<p>Formula: \\(x^2\\)</p>'
				}
			});

			// Content should still be visible despite MathJax error
			await waitFor(
				() => {
					expect(screen.getByText(/Formula:/)).toBeInTheDocument();
				},
				{ container }
			);
		});
	});

	describe('Reactive Updates', () => {
		it('should update rendered HTML when content prop changes', () => {
			const { rerender } = render(RichText, {
				props: {
					content: '<p>Original content</p>'
				}
			});

			expect(screen.getByText('Original content')).toBeInTheDocument();

			rerender({
				content: '<p>Updated content</p>'
			});

			expect(screen.getByText('Updated content')).toBeInTheDocument();
			expect(screen.queryByText('Original content')).not.toBeInTheDocument();
		});

		it('should re-run MathJax typesetting when content changes', async () => {
			vi.stubGlobal('window', { MathJax: mockMathJax });

			const { rerender, container } = render(RichText, {
				props: {
					content: '<p>\\(x^2\\)</p>'
				}
			});

			// Wait for initial typeset
			await waitFor(
				() => {
					expect(mockMathJax.typesetClear).toHaveBeenCalled();
					expect(mockMathJax.typesetPromise).toHaveBeenCalled();
				},
				{ container }
			);

			const clearCallsAfterMount = mockMathJax.typesetClear.mock.calls.length;
			const typesetCallsAfterMount = mockMathJax.typesetPromise.mock.calls.length;

			rerender({
				content: '<p>\\(y^2\\)</p>'
			});

			// Wait for re-typeset with increased call counts
			await waitFor(
				() => {
					expect(mockMathJax.typesetClear).toHaveBeenCalledTimes(clearCallsAfterMount + 1);
					expect(mockMathJax.typesetPromise).toHaveBeenCalledTimes(typesetCallsAfterMount + 1);
				},
				{ container }
			);
		});
	});
});
