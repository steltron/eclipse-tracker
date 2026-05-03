const STORAGE_KEY = 'eclipse-tracker-settings';

const DEFAULTS = {
  emails: ['nathan.todd.miller@gmail.com', 'rebekah.a.miller@gmail.com']
};

function load() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getEmails() {
  return load().emails;
}

export function setEmails(emails) {
  const settings = load();
  settings.emails = emails;
  save(settings);
}

export function addEmail(email) {
  const settings = load();
  if (!settings.emails.includes(email)) {
    settings.emails.push(email);
    save(settings);
  }
  return settings.emails;
}

export function removeEmail(email) {
  const settings = load();
  settings.emails = settings.emails.filter(e => e !== email);
  save(settings);
  return settings.emails;
}
