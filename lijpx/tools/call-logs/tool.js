// Handwritten Call Log Analysis: one unit's call-light sheets, digitized once and not updated.
// Data: prepared by build/prep/call_logs.py.

import { whole } from '../../shell/format.js?v=4796f631fd';
import hours from './pages/hours.js?v=2130841579';
import needs from './pages/needs.js?v=c577316c96';
import overview from './pages/overview.js?v=2e41e58b91';
import reasons from './pages/reasons.js?v=d8e01d37d4';
import staff from './pages/staff.js?v=3079e2aefb';
import time from './pages/time.js?v=1958036a2d';
import week from './pages/week.js?v=cde4c647a9';

export default {
  id: 'call-logs',
  aliases: ['calllogs'],
  title: 'Handwritten Call Log Analysis',
  description: 'A one-time analysis of handwritten call-light logs from one unit: when patients call, what they ask for, and which calls a purposeful round could prevent. Not updated.',
  group: 'Past Analyses',
  icon: 'clipboard',
  pages: [overview, week, needs, reasons, hours, time, staff],

  dataAsOf: (data) => data.lastDay,

  summary: (data) => `${data.unit} | ${whole(data.calls)} calls over ${data.daysLogged} days | not updated`,
};
