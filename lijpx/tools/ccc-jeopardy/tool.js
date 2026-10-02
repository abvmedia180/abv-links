// CCC Jeopardy: the trivia game played at CCC events, with its answer key.
// Data: prepared by build/prep/ccc_jeopardy.py.

import answers from './pages/answers.js?v=f72c37f53e';
import game from './pages/game.js?v=da51b7878e';
import { FINAL_JEOPARDY, clueCount } from './model.js?v=abd41379fc';

export default {
  id: 'ccc-jeopardy',
  aliases: ['cccjeopardy'],
  title: 'CCC Jeopardy',
  description: 'Interactive Jeopardy game for CCC team events and training sessions.',
  group: 'Resources',
  icon: 'help',
  pages: [game, answers],

  dataAsOf: (data) => data.asOf,

  summary: (data) => `${data.categories.length} categories | ${clueCount(data)} clues | ${FINAL_JEOPARDY}`,
};
