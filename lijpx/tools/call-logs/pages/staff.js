// Staff Named: the staff names written on the sheets, reconciled to the staff list, with the
// cautions that keep anyone from being credited or blamed for calls that were not theirs.
//
// The page prints but declares no export on purpose: a spreadsheet of staff ranked by how many calls
// name them reads as a performance list once forwarded, without the cautions printed beside it.

import { h } from '../../../shell/dom.js?v=e03acf3e7a';
import { monthLabel, whole } from '../../../shell/format.js?v=4796f631fd';
import { card } from '../../../shell/ui.js?v=08586281b3';

export default {
  id: 'staff',
  title: 'Staff Named',
  printOrientation: 'portrait',

  render(container, data) {
    const staff = data.staff;
    const listMonth = monthLabel(staff.staffListMonth);
    container.append(card({ title: 'Staff named on call sheets', icon: 'users' },
      h('p', { class: 'cl-caption' },
        `Reconciled against the unit's ${listMonth} staff list. How often a name appears shows who was on or assigned; `,
        h('strong', {}, 'it is not a performance measure'), '.'),
      h('div', { class: 'cl-chips cl-staff' }, staff.top.map((person) => h('span', { class: 'cl-chip' }, `${person.name} `, h('b', {}, String(person.calls))))),
      staff.ambiguous.length > 0 && caution('cl-caution-warn',
        [h('strong', {}, 'Do not name anyone for these calls. '),
          'Each of these first names belongs to two different people on the unit, and the sheets only ever write the first name:'],
        staff.ambiguous.map((entry) => [h('strong', {}, `${entry.calls} calls`), `: ${entry.names}`])),
      staff.confusable.length > 0 && caution('cl-caution-warn',
        [h('strong', {}, 'Different people, easy to confuse. '),
          'Say the wrong one and you are talking to someone about work they did not do.'],
        staff.confusable.map((pair) => [h('strong', {}, pair.first), ' is not ', h('strong', {}, pair.second), `: ${pair.note}`])),
      staff.inferred.length > 0 && caution('',
        [h('strong', {}, 'Inferred, not certain. '), 'Caveat these before quoting them:'],
        staff.inferred.map((entry) => [h('strong', {}, entry.name), `: ${entry.note}`])),
      h('p', { class: 'cl-caution' },
        `${whole(staff.spellings)} distinct handwritten spellings collapse to `, h('strong', {}, String(staff.people)), ' real people. ',
        `${whole(staff.attributed)} of ${whole(staff.named)} named calls are attributed to a staff list name; ${whole(staff.ambiguousCalls)} `,
        `cannot be resolved (shared first name), and ${whole(staff.unmatched)} written names are not on the ${listMonth} staff list at all `,
        `(staff who left, per diem, or floats). ${staff.offRoster}`)));
  },
};

function caution(className, lead, items) {
  return h('div', { class: `cl-caution ${className}`.trim() },
    h('p', {}, lead),
    h('ul', {}, items.map((item) => h('li', {}, item))));
}
