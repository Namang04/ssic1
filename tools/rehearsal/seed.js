// A small school: enough of every record type to exercise a year-end, none of it real.
window.__REHEARSAL_SEED = (function () {
  const stu = (admNo, name, clsNum, section, extra) => Object.assign({ admNo, name, clsNum, cls: clsNum, section, father: 'F ' + name, contact: '98' + String(admNo).padStart(8, '0'), oldNew: 'Old', status: 'Studying' }, extra || {});
  const dir = {
    dir_5: { cls: '5', clsNum: '5', students: [stu('1001', 'ASHA RAI', '5', 'A', { oldNew: 'New' }), stu('1002', 'BANI LEFT', '5', 'A', { status: 'Left' })] },
    dir_6: { cls: '6', clsNum: '6', students: [stu('1003', 'CHARU DEV', '6', 'A'), stu('1004', 'DEEP SINGH', '6', 'B')] },
    dir_7: { cls: '7', clsNum: '7', students: [stu('1005', 'ESHA ROY', '7', 'A')] },
    dir_12: { cls: '12', clsNum: '12', students: [stu('1006', 'FARAH KHAN', '12', 'A')] } };
  const rosterOf = (c) => ({ cls: 'Class ' + c, students: dir['dir_' + c].students.filter(s => s.status !== 'Left').map(s => ({ admNo: s.admNo, name: s.name, section: s.section, contact: s.contact })) });
  const cacheOf = (c) => { const l = dir['dir_' + c].students.filter(s => s.status !== 'Left'), sec = {}, adm = {}; l.forEach(s => { sec[s.name] = s.section; adm[s.name] = s.admNo; }); return { cls: 'Class ' + c, list: l.map(s => s.name), sections: sec, admNo: adm }; };
  const today = new Date().toISOString().slice(0, 10);
  const head = (n) => [{ name: 'Tuition', amount: n, due: '2026-07-01' }];
  return {
    meta: { config: { session: '2026-27', lastBackupAt: { '2026-27': new Date().toISOString() } } },
    accounts: { u_dir: { username: 'director', role: 'admin', name: 'Rehearsal Director' }, u_off: { username: 'office1', role: 'office', name: 'Office One' }, u_vp: { username: 'vp1', role: 'vp', name: 'VP One' }, u_t: { username: 'teach1', role: 'teacher', name: 'Teacher One' }, u_p: { username: '9800001003', role: 'parent', name: 'Parent of CHARU', admNo: '1003' }, u_lp: { username: '9800001002', role: 'parent', name: 'Parent of BANI', admNo: '1002' } },
    users: { director: { username: 'director', role: 'admin', name: 'Rehearsal Director' }, office1: { username: 'office1', role: 'office', name: 'Office One' }, vp1: { username: 'vp1', role: 'vp', name: 'VP One' }, teach1: { username: 'teach1', role: 'teacher', name: 'Teacher One', classes: ['Class 6-A', 'Class 7-A'], subjects: ['Mathematics'], teachingPairs: ['Class 6-A|Mathematics', 'Class 7-A|Mathematics'] }, '9800001003': { username: '9800001003', role: 'parent', name: 'Parent of CHARU', admNo: '1003', cls: 'Class 6' }, '9800001002': { username: '9800001002', role: 'parent', name: 'Parent of BANI', admNo: '1002', cls: 'Class 5' } },
    studentDirectory: dir,
    academicRoster: { Class_5: rosterOf('5'), Class_6: rosterOf('6'), Class_7: rosterOf('7'), Class_12: rosterOf('12') },
    students: { Class_5: cacheOf('5'), Class_6: cacheOf('6'), Class_7: cacheOf('7'), Class_12: cacheOf('12') },
    fees: { __structure: { classes: { 'Class 5': head(10000), 'Class 6': head(12000), 'Class 7': head(13000), 'Class 12': head(20000) } }, __waivers: { byAdm: {} },
      r1: { admNo: '1003', student: 'CHARU DEV', cls: 'Class 6', amount: 5000, date: '2026-07-10', mode: 'Cash', receiptNo: 'SSC/26-27/0001' }, r2: { admNo: '1005', student: 'ESHA ROY', cls: 'Class 7', amount: 13000, date: '2026-07-11', mode: 'Cash', receiptNo: 'SSC/26-27/0002', session: '2026-27' } },
    tests: { Class_6__Mathematics__week1: { cls: 'Class 6', subj: 'Mathematics', week: 1, total: 20, testDate: '2026-04-25', topics: ['Patterns'], name: 'Patterns', by: 'Teacher One', at: '2026-04-25T09:00:00Z', rows: { 'CHARU DEV': 15, 'DEEP SINGH': 12 }, rowsByAdm: { 1003: 15, 1004: 12 } } },
    attendance: { ['Class_6_A__' + today.replace(/-/g, '_')]: { cls: 'Class 6', section: 'A', date: today, status: { 1003: 'P' } } },
    exams: {}, topics: { Class_6__Mathematics: { key: 'Class 6__Mathematics', list: ['Patterns', 'Fractions'] } },
    syllabus: { Class_6__Mathematics: { cls: 'Class 6', subj: 'Mathematics', status: { a: 'done' }, copyChapters: ['Hand added'] }, Class_7__Mathematics: { cls: 'Class 7', subj: 'Mathematics', status: { b: 'done' } } },
    timetables: { '6_A': { cls: 'Class 6', sec: 'A', days: {} } }, timetableSettings: { global: { periods: [] } },
    registrations: { web_WEB_AAAAA: { name: 'NEW CHILD', classSought: 'Class 6', contact: '9811111111', father: 'NEW FATHER', gender: 'Male', dob: '2015-05-05', regNo: 'WEB-AAAAA', status: 'pending', session: '2027-28', source: 'Online form', at: '2026-10-28T10:00:00Z', payAmount: 500, payRef: '123456789012', payVerified: false, address: 'Rehearsal Road' } } };
})();
