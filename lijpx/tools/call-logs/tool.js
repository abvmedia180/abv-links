// Handwritten Call Log Analysis: one unit's call-light sheets, digitized once and not updated.
// Data: prepared by build/prep/call_logs.py.

import { whole } from '../../shell/format.js?v=4974441338';
import hours from './pages/hours.js?v=1ebd27f6e2';
import needs from './pages/needs.js?v=4b734dc6e4';
import overview from './pages/overview.js?v=8e9d83a837';
import reasons from './pages/reasons.js?v=a530695ff2';
import staff from './pages/staff.js?v=5deb0a2a71';
import time from './pages/time.js?v=dc7f965573';
import week from './pages/week.js?v=890e3b8005';

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
