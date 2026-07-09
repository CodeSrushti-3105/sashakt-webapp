import { describe, it, expect } from 'vitest';
import {
	sortQuestionSets,
	normalizeTestQuestions,
	buildQuestionSetGroups,
	canAttemptAllQuestions,
	getQuestionSetQuestionCount
} from './questionSetHelpers';
import type {
	TQuestion,
	TQuestionSetCandidate,
	TQuestionSetSummary,
	TTestQuestionsResponse
} from '$lib/types';
import { question_type_enum } from '$lib/types';

// Helper to create mock questions
const createQuestion = (id: number, text: string = `Question ${id}`): TQuestion => ({
	id,
	question_text: text,
	instructions: '',
	question_type: question_type_enum.SINGLE,
	options: [{ id: id * 10, key: 'A', value: 'Option A' }],
	subjective_answer_limit: 0,
	is_mandatory: false,
	marking_scheme: { correct: 1, wrong: 0, skipped: 0 },
	media: null
});

// Helper to create mock question sets
const createQuestionSet = (
	id: number,
	displayOrder: number,
	questions: TQuestion[] = []
): TQuestionSetCandidate => ({
	id,
	display_order: displayOrder,
	title: `Section ${id}`,
	description: null,
	max_questions_allowed_to_attempt: questions.length,
	question_revisions: questions
});

describe('sortQuestionSets', () => {
	it('should sort by display_order ascending', () => {
		const sets = [
			createQuestionSet(1, 3, []),
			createQuestionSet(2, 1, []),
			createQuestionSet(3, 2, [])
		];

		const result = sortQuestionSets(sets);

		expect(result.map((s) => s.id)).toEqual([2, 3, 1]);
	});

	it('should use id as tiebreaker when display_order is same', () => {
		const sets = [
			createQuestionSet(3, 1, []),
			createQuestionSet(1, 1, []),
			createQuestionSet(2, 1, [])
		];

		const result = sortQuestionSets(sets);

		expect(result.map((s) => s.id)).toEqual([1, 2, 3]);
	});

	it('should handle null id as 0', () => {
		const sets = [
			{ ...createQuestionSet(5, 1, []), id: null },
			createQuestionSet(2, 1, [])
		];

		const result = sortQuestionSets(sets);

		expect(result.map((s) => s.id)).toEqual([null, 2]);
	});

	it.each([null, undefined])('should return empty array when input is %s', (input) => {
		expect(sortQuestionSets(input)).toEqual([]);
	});

	it('should return empty array when input is empty', () => {
		expect(sortQuestionSets([])).toEqual([]);
	});

	it('should not mutate original array', () => {
		const sets = [createQuestionSet(1, 3, []), createQuestionSet(2, 1, [])];
		const originalOrder = sets.map((s) => s.id);

		sortQuestionSets(sets);

		expect(sets.map((s) => s.id)).toEqual(originalOrder);
	});
});

describe('normalizeTestQuestions', () => {
	it('should use question_revisions when available', () => {
		const questions = [createQuestion(1), createQuestion(2)];
		const testQuestions: TTestQuestionsResponse = {
			question_revisions: questions,
			question_sets: []
		};

		const result = normalizeTestQuestions(testQuestions);

		expect(result.questions).toEqual(questions);
		expect(result.isSectioned).toBe(false);
	});

	it('should prefer question_revisions over question_sets when both present', () => {
		const directQuestions = [createQuestion(1), createQuestion(2)];
		const setQuestions = [createQuestion(3), createQuestion(4)];
		const testQuestions: TTestQuestionsResponse = {
			question_revisions: directQuestions,
			question_sets: [createQuestionSet(1, 1, setQuestions)]
		};

		const result = normalizeTestQuestions(testQuestions);

		expect(result.questions).toEqual(directQuestions);
		expect(result.isSectioned).toBe(true);
	});

	it('should flatten questions from question_sets when no question_revisions', () => {
		const q1 = createQuestion(1);
		const q2 = createQuestion(2);
		const testQuestions: TTestQuestionsResponse = {
			question_revisions: [],
			question_sets: [createQuestionSet(1, 1, [q1]), createQuestionSet(2, 2, [q2])]
		};

		const result = normalizeTestQuestions(testQuestions);

		expect(result.questions).toEqual([q1, q2]);
		expect(result.isSectioned).toBe(true);
	});

	it('should sort question sets by display_order', () => {
		const q1 = createQuestion(1);
		const q2 = createQuestion(2);
		const testQuestions: TTestQuestionsResponse = {
			question_revisions: [],
			question_sets: [createQuestionSet(2, 2, [q2]), createQuestionSet(1, 1, [q1])]
		};

		const result = normalizeTestQuestions(testQuestions);

		expect(result.questionSets.map((s) => s.id)).toEqual([1, 2]);
	});

	it('should create sectionByQuestionId map', () => {
		const q1 = createQuestion(1);
		const q2 = createQuestion(2);
		const set1 = createQuestionSet(10, 1, [q1]);
		const set2 = createQuestionSet(20, 2, [q2]);
		const testQuestions: TTestQuestionsResponse = {
			question_revisions: [],
			question_sets: [set1, set2]
		};

		const result = normalizeTestQuestions(testQuestions);

		expect(result.sectionByQuestionId.get(1)).toEqual(set1);
		expect(result.sectionByQuestionId.get(2)).toEqual(set2);
	});

	it('should handle null question_revisions in question_sets', () => {
		const testQuestions: TTestQuestionsResponse = {
			question_revisions: [],
			question_sets: [{ ...createQuestionSet(1, 1, []), question_revisions: null as any }]
		};

		const result = normalizeTestQuestions(testQuestions);

		expect(result.questionSets[0].question_revisions).toEqual([]);
	});

	it.each([null, undefined])('should return empty arrays when testQuestions is %s', (input) => {
		const result = normalizeTestQuestions(input);

		expect(result.questions).toEqual([]);
		expect(result.questionSets).toEqual([]);
		expect(result.isSectioned).toBe(false);
		expect(result.sectionByQuestionId.size).toBe(0);
	});

	it('should set isSectioned to true when question_sets exist', () => {
		const testQuestions: TTestQuestionsResponse = {
			question_revisions: [],
			question_sets: [createQuestionSet(1, 1, [])]
		};

		expect(normalizeTestQuestions(testQuestions).isSectioned).toBe(true);
	});

	it('should set isSectioned to false when no question_sets', () => {
		const testQuestions: TTestQuestionsResponse = {
			question_revisions: [createQuestion(1)],
			question_sets: []
		};

		expect(normalizeTestQuestions(testQuestions).isSectioned).toBe(false);
	});
});

describe('buildQuestionSetGroups', () => {
	it('should return empty array when questionSets is empty', () => {
		expect(buildQuestionSetGroups([createQuestion(1)], [])).toEqual([]);
	});

	it('should group questions by section', () => {
		const q1 = createQuestion(1);
		const q2 = createQuestion(2);
		const q3 = createQuestion(3);
		const questions = [q1, q2, q3];
		const set1 = createQuestionSet(10, 1, [q1, q2]);
		const set2 = createQuestionSet(20, 2, [q3]);

		const result = buildQuestionSetGroups(questions, [set1, set2]);

		expect(result).toHaveLength(2);
		expect(result[0].section.id).toBe(10);
		expect(result[0].questions).toEqual([q1, q2]);
		expect(result[1].section.id).toBe(20);
		expect(result[1].questions).toEqual([q3]);
	});

	it('should calculate startIndex correctly', () => {
		const q1 = createQuestion(1);
		const q2 = createQuestion(2);
		const q3 = createQuestion(3);
		const questions = [q1, q2, q3];
		const set1 = createQuestionSet(10, 1, [q2, q3]);
		const set2 = createQuestionSet(20, 2, [q1]);

		const result = buildQuestionSetGroups(questions, [set1, set2]);

		expect(result[0].startIndex).toBe(0); // q1 at index 0
		expect(result[1].startIndex).toBe(1); // q2 at index 1
	});

	it('should sort groups by startIndex', () => {
		const q1 = createQuestion(1);
		const q2 = createQuestion(2);
		const q3 = createQuestion(3);
		const questions = [q1, q2, q3];
		const set1 = createQuestionSet(10, 1, [q3]);
		const set2 = createQuestionSet(20, 2, [q1]);

		const result = buildQuestionSetGroups(questions, [set1, set2]);

		expect(result.map((g) => g.section.id)).toEqual([20, 10]);
	});

	it('should filter out sections with no questions', () => {
		const q1 = createQuestion(1);
		const set1 = createQuestionSet(10, 1, [q1]);
		const set2 = createQuestionSet(20, 2, [createQuestion(99)]);

		const result = buildQuestionSetGroups([q1], [set1, set2]);

		expect(result).toHaveLength(1);
		expect(result[0].section.id).toBe(10);
	});

	it('should only include questions present in questions array', () => {
		const q1 = createQuestion(1);
		const q2 = createQuestion(2);
		const q3 = createQuestion(3);
		const set1 = createQuestionSet(10, 1, [q1, q2, q3]);

		const result = buildQuestionSetGroups([q1, q2], [set1]);

		expect(result[0].questions).toEqual([q1, q2]);
		expect(result[0].questions).not.toContainEqual(q3);
	});

	it('should handle empty questions array', () => {
		const set1 = createQuestionSet(10, 1, [createQuestion(1)]);

		expect(buildQuestionSetGroups([], [set1])).toEqual([]);
	});
});

describe('canAttemptAllQuestions', () => {
	it('should return true when maxAllowed equals questionCount', () => {
		expect(canAttemptAllQuestions(10, 10)).toBe(true);
	});

	it('should return true when maxAllowed is greater than questionCount', () => {
		expect(canAttemptAllQuestions(15, 10)).toBe(true);
	});

	it('should return false when maxAllowed is less than questionCount', () => {
		expect(canAttemptAllQuestions(5, 10)).toBe(false);
	});

	it('should return true when maxAllowed is 0 and questionCount is 0', () => {
		expect(canAttemptAllQuestions(0, 0)).toBe(true);
	});

	it('should handle large numbers correctly', () => {
		expect(canAttemptAllQuestions(1000, 500)).toBe(true);
	});
});

describe('getQuestionSetQuestionCount', () => {
	it('should return question_count when available (TQuestionSetSummary)', () => {
		const questionSet: TQuestionSetSummary = {
			id: 1,
			title: 'Section 1',
			description: null,
			display_order: 1,
			max_questions_allowed_to_attempt: 10,
			question_count: 10
		};

		expect(getQuestionSetQuestionCount(questionSet)).toBe(10);
	});

	it('should return question_revisions length when question_count not available (TQuestionSetCandidate)', () => {
		const questionSet = createQuestionSet(1, 1, [
			createQuestion(1),
			createQuestion(2),
			createQuestion(3)
		]);

		expect(getQuestionSetQuestionCount(questionSet)).toBe(3);
	});

	it('should return 0 when question_revisions is empty', () => {
		expect(getQuestionSetQuestionCount(createQuestionSet(1, 1, []))).toBe(0);
	});

	it('should prefer question_count over question_revisions length', () => {
		const questionSet = {
			...createQuestionSet(1, 1, [createQuestion(1), createQuestion(2)]),
			question_count: 5
		} as TQuestionSetSummary;

		expect(getQuestionSetQuestionCount(questionSet)).toBe(5);
	});
});
