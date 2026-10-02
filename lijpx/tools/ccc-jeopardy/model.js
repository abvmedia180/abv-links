// The board's content as one table, shared by both pages' exports and the Answer Key.

export const FINAL_JEOPARDY = 'Final Jeopardy!';

export function money(value) {
  return `$${value}`;
}

export function clueCount(data) {
  return data.categories.length * data.values.length;
}

export function answerTable(data) {
  return {
    columns: [
      { key: 'category', label: 'Category' },
      { key: 'value', label: 'Value', decimals: 0 },
      { key: 'clue', label: 'Clue' },
      { key: 'answer', label: 'Answer' },
    ],
    rows: [
      ...data.categories.flatMap((category) => category.clues.map((clue, row) => ({
        category: category.name, value: data.values[row], clue: clue.clue, answer: clue.answer,
      }))),
      { category: FINAL_JEOPARDY, value: null, clue: data.final.clue, answer: data.final.answer },
    ],
  };
}
