// Poster: the What Matters Most poster, a US Letter page that scales to the screen and prints on one
// sheet as the poster alone, without the shell's print header.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { posterIcon } from '../art.js?v=393b8bb9e7';

// The four items sit on the ring at 11, 2, 5 and 7 o'clock, in the payload's order.
const SPOTS = ['at-11', 'at-2', 'at-5', 'at-7'];

export default {
  id: 'poster',
  title: 'Poster',
  printOrientation: 'portrait',
  printHeader: false,

  render(container, data) {
    container.append(h('article', { class: 'poster', 'aria-label': data.headline.map((part) => part.text).join(' ') },
      h('div', { class: 'poster-bar' }),
      h('div', { class: 'poster-ring' }),
      h('div', { class: 'poster-center' },
        h('p', { class: 'poster-eyebrow' }, data.eyebrow),
        h('h2', { class: 'poster-headline' },
          data.headline.map((part) => h('span', { class: part.accent ? 'accent' : null }, part.text))),
        h('div', { class: 'poster-rule' }),
        h('p', { class: 'poster-tagline' }, data.tagline)),
      data.items.map((item, i) => h('div', { class: `poster-item ${SPOTS[i]}` },
        h('p', { class: 'poster-label' }, item.label.flatMap((line, j) => (j === 0 ? [line] : [h('br'), line]))),
        h('div', { class: 'poster-bubble' }, posterIcon(item.icon)))),
    ));
  },
};
