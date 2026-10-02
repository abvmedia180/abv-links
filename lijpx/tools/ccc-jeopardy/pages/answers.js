// Answer Key: every clue and answer by category, for the host.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { card } from '../../../shell/ui.js?v=08586281b3';
import { FINAL_JEOPARDY, answerTable, money } from '../model.js?v=abd41379fc';

export default {
  id: 'answers',
  title: 'Answer Key',
  printOrientation: 'portrait',

  render(container, data) {
    const group = (name) => h('tr', { class: 'group-row' }, h('th', { scope: 'colgroup', colspan: 3 }, name));
    const row = (value, { clue, answer }) => h('tr', {},
      h('td', { class: 'value' }, value),
      h('td', {}, clue),
      h('td', { class: 'answer' }, answer));
    container.append(
      h('p', { class: 'key-note' }, data.subtitle),
      card({ title: 'Clues and Answers', icon: 'clipboard' },
        h('div', { class: 'data-table-wrap' }, h('table', { class: 'data-table answer-key' },
          h('thead', {}, h('tr', {},
            h('th', { scope: 'col', class: 'value' }, 'Value'),
            h('th', { scope: 'col' }, 'Clue'),
            h('th', { scope: 'col' }, 'Answer'))),
          data.categories.map((category) => h('tbody', {},
            group(category.name),
            category.clues.map((clue, i) => row(money(data.values[i]), clue)))),
          h('tbody', {}, group(FINAL_JEOPARDY), row('', data.final))))),
    );
  },

  exports(data) {
    return answerTable(data);
  },
};
