const params = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const urlPatientId = params.get('patient') || '0001';

const userRole = params.get('role') || storedSession.role || 'caregiver';
const userId = params.get('userId') || storedSession.userId || '';
const userName = params.get('user') || params.get('name') || storedSession.fullName || 'User';

const editPatientModal = document.getElementById('editPatientModal');
const openEditPatientModal = document.getElementById('openEditPatientModal');
const closeEditPatientModal = document.getElementById('closeEditPatientModal');
const cancelEditPatientModal = document.getElementById('cancelEditPatientModal');
const editPatientForm = document.getElementById('editPatientForm');

const deletePatientModal = document.getElementById('deletePatientModal');
const openDeletePatientModal = document.getElementById('openDeletePatientModal');
const cancelDeletePatientModal = document.getElementById('cancelDeletePatientModal');
const confirmDeletePatientModal = document.getElementById('confirmDeletePatientModal');

const patientNameHeading = document.getElementById('patientNameHeading');
const patientDashboardSubtext = document.getElementById('patientDashboardSubtext');
const patientProfileName = document.getElementById('patientProfileName');
const patientProfileId = document.getElementById('patientProfileId');
const patientProfileMeta = document.getElementById('patientProfileMeta');
const patientProfileStatus = document.getElementById('patientProfileStatus');
const patientProfileAvatar = document.getElementById('patientProfileAvatar');

const managePhrasesBtn = document.getElementById('managePhrasesBtn');
const manageVocabularyBtn = document.getElementById('manageVocabularyBtn');
const enterSessionBtn = document.getElementById('enterSessionBtn');
const backToPatientsBtn = document.getElementById('backToPatientsBtn');

const dashboardNavLink = document.getElementById('dashboardNavLink');
const managePatientsNavLink = document.getElementById('managePatientsNavLink');
const settingsNavLink = document.getElementById('settingsNavLink');
const logoutNavLink = document.getElementById('logoutNavLink');

const editPatientFullname = document.getElementById('edit-patient-fullname');
const editPatientId = document.getElementById('edit-patient-id');
const editPatientAge = document.getElementById('edit-patient-age');
const editPatientDob = document.getElementById('edit-patient-dob');
const editPatientGender = document.getElementById('edit-patient-gender');
const editPatientLanguage = document.getElementById('edit-patient-language');
const editPatientNotes = document.getElementById('edit-patient-notes');

const totalSessionsCount = document.getElementById('totalSessionsCount');
const frequentPhrasesCount = document.getElementById('frequentPhrasesCount');
const totalPhrasesCount = document.getElementById('totalPhrasesCount');
const totalVocabularyCount = document.getElementById('totalVocabularyCount');
const lastSessionText = document.getElementById('lastSessionText');

const phrasesProgressCircle = document.getElementById('phrasesProgressCircle');
const vocabularyProgressCircle = document.getElementById('vocabularyProgressCircle');
const phrasesProgressPercent = document.getElementById('phrasesProgressPercent');
const vocabularyProgressPercent = document.getElementById('vocabularyProgressPercent');

const frequentlyUsedPhrasesTableBody = document.getElementById('frequentlyUsedPhrasesTableBody');

const sharedUserQuery = new URLSearchParams({
  role: userRole,
  userId,
  name: userName
}).toString();

let currentPatient = null;

if (dashboardNavLink) {
  dashboardNavLink.href = `dashboard.html?${sharedUserQuery}`;
}

if (managePatientsNavLink) {
  managePatientsNavLink.href = `manage-patients.html?${sharedUserQuery}`;
}

if (settingsNavLink) {
  settingsNavLink.href =
    userRole === 'provider'
      ? `settings-provider.html?${sharedUserQuery}`
      : `settings-caregiver.html?${sharedUserQuery}`;
}

if (backToPatientsBtn) {
  backToPatientsBtn.href = `manage-patients.html?${sharedUserQuery}`;
}

if (logoutNavLink) {
  logoutNavLink.addEventListener('click', () => {
    localStorage.removeItem('echozySession');
  });
}

function getStoredPatients() {
  return JSON.parse(localStorage.getItem('echozyPatients') || '{}');
}

function saveStoredPatients(patients) {
  localStorage.setItem('echozyPatients', JSON.stringify(patients));
}

function getStoredPhrases() {
  return JSON.parse(localStorage.getItem('echozyPhrases') || '{}');
}

function getStoredVocabulary() {
  return JSON.parse(localStorage.getItem('echozyVocabulary') || '{}');
}

function getStoredPractice() {
  return JSON.parse(localStorage.getItem('echozyPracticeProgress') || '{}');
}

function getStoredUsageCounts() {
  return JSON.parse(localStorage.getItem('echozyUsageCounts') || '{}');
}

function getStoredSessionLogs() {
  return JSON.parse(localStorage.getItem('echozySessionLogs') || '{}');
}

function saveStoredSessionLogs(data) {
  localStorage.setItem('echozySessionLogs', JSON.stringify(data));
}

function updatePatientStatusInStorage(patientId, nextStatus) {
  const patients = getStoredPatients();

  if (!patients[patientId]) {
    return null;
  }

  patients[patientId].status = nextStatus;
  saveStoredPatients(patients);

  return patients[patientId];
}

function recordSessionEntry(patientId) {
  const allSessionLogs = getStoredSessionLogs();

  if (!allSessionLogs[patientId]) {
    allSessionLogs[patientId] = [];
  }

  allSessionLogs[patientId].push({
    enteredAt: new Date().toISOString(),
    quitAt: ''
  });

  saveStoredSessionLogs(allSessionLogs);
}

function calculateAgeFromDob(dobValue) {
  if (!dobValue) return '';

  const birthDate = new Date(dobValue);
  const currentDate = new Date();

  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = currentDate.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && currentDate.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= 0 ? age : '';
}

function getAvatarByGender(gender) {
  return gender === 'Female'
    ? '../../assets/images/avatars/female.png'
    : '../../assets/images/avatars/male.png';
}

function getDisplayTextByLanguage(item, language) {
  if (!item) return '';

  if (language === 'Bahasa Melayu') {
    return item.textMs || item.textEn || item.text || '';
  }

  return item.textEn || item.text || item.textMs || '';
}

function updateProgressCircle(circleElement, percent) {
  if (!circleElement) return;

  circleElement.style.background = `conic-gradient(
    #2eb872 0% ${percent}%,
    #f0d9d9 ${percent}% 100%
  )`;
}

function countTotalItemsByPatient(data, patientId) {
  const patientData = data[patientId] || {};
  return Object.values(patientData).reduce((total, items) => {
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
}

function getAllIdsByPatient(data, patientId) {
  const patientData = data[patientId] || {};
  return Object.values(patientData)
    .flat()
    .map((item) => item.id)
    .filter(Boolean);
}

function formatSessionDateTime(isoString) {
  if (!isoString) return 'No session yet';

  const date = new Date(isoString);

  return date.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function flattenPatientItemsWithCategory(data, patientId) {
  const patientData = data[patientId] || {};

  return Object.entries(patientData).flatMap(([categoryKey, items]) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      ...item,
      categoryKey
    }));
  });
}

function getPhraseCategoryLabel(categoryKey) {
  const phraseCategoryLabels = {
    urgent: 'Urgent Needs',
    basic: 'Basic Responses',
    feelings: 'Feelings & Emotions',
    physical: 'Physical Condition',
    daily: 'Daily Needs',
    social: 'People & Social Communication',
    rehab: 'Rehabilitation',
    activities: 'Activities & Preferences'
  };

  return phraseCategoryLabels[categoryKey] || categoryKey;
}

function getVocabularyCategoryLabel(categoryKey) {
  const vocabularyCategoryLabels = {
    people: 'People',
    food: 'Food & Drink',
    places: 'Places',
    body: 'Body & Health',
    feelings: 'Feelings',
    actions: 'Actions & Verbs'
  };

  return vocabularyCategoryLabels[categoryKey] || categoryKey;
}

function removePatientFromLocalStorage(patientId) {
  const patients = getStoredPatients();
  delete patients[patientId];
  saveStoredPatients(patients);
}

function showPatientNotFound() {
  if (patientNameHeading) {
    patientNameHeading.textContent = 'Patient Not Found';
  }

  if (patientDashboardSubtext) {
    patientDashboardSubtext.textContent =
      'The selected patient record could not be found.';
  }

  if (patientProfileName) {
    patientProfileName.textContent = 'Patient Not Found';
  }

  if (patientProfileId) {
    patientProfileId.textContent = `Patient ID: ${urlPatientId}`;
  }

  if (patientProfileMeta) {
    patientProfileMeta.textContent = 'No patient data available';
  }

  if (patientProfileStatus) {
    patientProfileStatus.textContent = 'Unavailable';
    patientProfileStatus.classList.remove('active-badge', 'inactive-badge');
    patientProfileStatus.classList.add('inactive-badge');
  }

  if (patientProfileAvatar) {
    patientProfileAvatar.alt = 'Patient not found';
  }

  if (totalSessionsCount) totalSessionsCount.textContent = '0';
  if (frequentPhrasesCount) frequentPhrasesCount.textContent = '0';
  if (totalPhrasesCount) totalPhrasesCount.textContent = '0';
  if (totalVocabularyCount) totalVocabularyCount.textContent = '0';
  if (lastSessionText) lastSessionText.textContent = 'No session yet';

  if (phrasesProgressPercent) phrasesProgressPercent.textContent = '0%';
  if (vocabularyProgressPercent) vocabularyProgressPercent.textContent = '0%';
  updateProgressCircle(phrasesProgressCircle, 0);
  updateProgressCircle(vocabularyProgressCircle, 0);

  if (frequentlyUsedPhrasesTableBody) {
    frequentlyUsedPhrasesTableBody.innerHTML = `
      <tr>
        <td colspan="4">No frequently used data yet.</td>
      </tr>
    `;
  }

  if (managePhrasesBtn) managePhrasesBtn.removeAttribute('href');
  if (manageVocabularyBtn) manageVocabularyBtn.removeAttribute('href');
  if (enterSessionBtn) enterSessionBtn.removeAttribute('href');

  if (openEditPatientModal) openEditPatientModal.disabled = true;
  if (openDeletePatientModal) openDeletePatientModal.disabled = true;
  if (enterSessionBtn) {
    enterSessionBtn.style.pointerEvents = 'none';
    enterSessionBtn.style.opacity = '0.6';
  }
}

function renderPatientData(patient) {
  currentPatient = patient;

  if (patientNameHeading) {
    patientNameHeading.textContent = patient.name;
  }

  if (patientDashboardSubtext) {
    patientDashboardSubtext.textContent =
      `View patient profile, monitor communication activity, and access communication analytics for ${patient.name}.`;
  }

  if (patientProfileName) {
    patientProfileName.textContent = patient.name;
  }

  if (patientProfileId) {
    patientProfileId.textContent = `Patient ID: ${patient.id}`;
  }

  if (patientProfileMeta) {
    patientProfileMeta.textContent = `${patient.gender} • ${patient.age} years old`;
  }

  if (patientProfileStatus) {
    patientProfileStatus.textContent = patient.status;
    patientProfileStatus.classList.remove('active-badge', 'inactive-badge');
    patientProfileStatus.classList.add(
      patient.status === 'Active' ? 'active-badge' : 'inactive-badge'
    );
  }

  if (patientProfileAvatar) {
    patientProfileAvatar.src = getAvatarByGender(patient.gender);
    patientProfileAvatar.alt = patient.name;
  }

  if (editPatientFullname) {
    editPatientFullname.value = patient.name;
  }

  if (editPatientId) {
    editPatientId.value = patient.id;
  }

  if (editPatientAge) {
    editPatientAge.value = patient.age;
  }

  if (editPatientDob) {
    editPatientDob.value = patient.dob || '';
  }

  if (editPatientGender) {
    editPatientGender.value = patient.gender;
  }

  if (editPatientLanguage) {
    editPatientLanguage.value = patient.preferredLanguage || 'English';
  }

  if (editPatientNotes) {
    editPatientNotes.value = patient.notes || '';
  }

  const allPhrases = getStoredPhrases();
  const allVocabulary = getStoredVocabulary();
  const allPractice = getStoredPractice();
  const allUsageCounts = getStoredUsageCounts();
  const allSessionLogs = getStoredSessionLogs();

  const patientPractice = allPractice[patient.id] || { phrases: [], vocabulary: [] };
  const patientUsageCounts = allUsageCounts[patient.id] || { phrases: {}, vocabulary: {} };
  const patientSessionLogs = allSessionLogs[patient.id] || [];

  if (totalPhrasesCount) {
    totalPhrasesCount.textContent = countTotalItemsByPatient(allPhrases, patient.id);
  }

  if (totalVocabularyCount) {
    totalVocabularyCount.textContent = countTotalItemsByPatient(allVocabulary, patient.id);
  }

  if (totalSessionsCount) {
    totalSessionsCount.textContent = patientSessionLogs.length;
  }

  if (lastSessionText) {
    const latestSession = patientSessionLogs.length
      ? (patientSessionLogs[patientSessionLogs.length - 1].quitAt || patientSessionLogs[patientSessionLogs.length - 1].enteredAt)
      : '';
    lastSessionText.textContent = formatSessionDateTime(latestSession);
  }

  const phraseIds = getAllIdsByPatient(allPhrases, patient.id);
  const vocabularyIds = getAllIdsByPatient(allVocabulary, patient.id);

  const practicedPhraseTotal = patientPractice.phrases.filter((id) => phraseIds.includes(id)).length;
  const practicedVocabularyTotal = patientPractice.vocabulary.filter((id) => vocabularyIds.includes(id)).length;

  const phraseProgress = phraseIds.length
    ? Math.round((practicedPhraseTotal / phraseIds.length) * 100)
    : 0;

  const vocabularyProgress = vocabularyIds.length
    ? Math.round((practicedVocabularyTotal / vocabularyIds.length) * 100)
    : 0;

  if (phrasesProgressPercent) {
    phrasesProgressPercent.textContent = `${phraseProgress}%`;
  }
  updateProgressCircle(phrasesProgressCircle, phraseProgress);

  if (vocabularyProgressPercent) {
    vocabularyProgressPercent.textContent = `${vocabularyProgress}%`;
  }
  updateProgressCircle(vocabularyProgressCircle, vocabularyProgress);

  const flattenedPhraseItems = flattenPatientItemsWithCategory(allPhrases, patient.id);
  const flattenedVocabularyItems = flattenPatientItemsWithCategory(allVocabulary, patient.id);

  const usedPhraseItems = flattenedPhraseItems
    .map((item) => ({
      ...item,
      usageType: 'Phrase',
      categoryLabel: getPhraseCategoryLabel(item.categoryKey),
      frequency: patientUsageCounts.phrases[item.id] || 0
    }))
    .filter((item) => item.frequency > 0);

  const usedVocabularyItems = flattenedVocabularyItems
    .map((item) => ({
      ...item,
      usageType: 'Vocabulary',
      categoryLabel: getVocabularyCategoryLabel(item.categoryKey),
      frequency: patientUsageCounts.vocabulary[item.id] || 0
    }))
    .filter((item) => item.frequency > 0);

  const combinedFrequentlyUsedItems = [...usedPhraseItems, ...usedVocabularyItems]
    .sort((a, b) => b.frequency - a.frequency);

  if (frequentPhrasesCount) {
    frequentPhrasesCount.textContent = combinedFrequentlyUsedItems.length;
  }

  if (frequentlyUsedPhrasesTableBody) {
    if (!combinedFrequentlyUsedItems.length) {
      frequentlyUsedPhrasesTableBody.innerHTML = `
        <tr>
          <td colspan="4">No frequently used data yet.</td>
        </tr>
      `;
    } else {
      frequentlyUsedPhrasesTableBody.innerHTML = combinedFrequentlyUsedItems.map((item) => `
        <tr>
          <td>${item.usageType}</td>
          <td>${getDisplayTextByLanguage(item, patient.preferredLanguage || 'English')}</td>
          <td>${item.categoryLabel}</td>
          <td>${item.frequency}</td>
        </tr>
      `).join('');
    }
  }

  const sharedPatientUserQuery = new URLSearchParams({
    patient: patient.id,
    name: patient.name,
    status: patient.status,
    language: patient.preferredLanguage || 'English',
    role: userRole,
    userId,
    user: userName
  }).toString();

  if (managePhrasesBtn) {
    managePhrasesBtn.href = `manage-phrases.html?${sharedPatientUserQuery}`;
  }

  if (manageVocabularyBtn) {
    manageVocabularyBtn.href = `manage-vocabulary.html?${sharedPatientUserQuery}`;
  }

  if (enterSessionBtn) {
    enterSessionBtn.href =
      `../patients/frequently-used.html?patient=${encodeURIComponent(patient.id)}` +
      `&name=${encodeURIComponent(patient.name)}` +
      `&status=${encodeURIComponent('Active')}` +
      `&language=${encodeURIComponent(patient.preferredLanguage || 'English')}` +
      `&role=${encodeURIComponent(userRole)}` +
      `&userId=${encodeURIComponent(userId)}` +
      `&user=${encodeURIComponent(userName)}`;

    enterSessionBtn.onclick = () => {
      const updatedPatient = updatePatientStatusInStorage(patient.id, 'Active');

      if (updatedPatient) {
        currentPatient = updatedPatient;
        recordSessionEntry(patient.id);
      }
    };
  }
}

function loadPatientData() {
  const patients = getStoredPatients();
  const storedPatient = patients[urlPatientId];

  if (storedPatient) {
    renderPatientData(storedPatient);
    return;
  }

  showPatientNotFound();
}

loadPatientData();

if (editPatientDob && editPatientAge) {
  editPatientDob.addEventListener('change', () => {
    editPatientAge.value = calculateAgeFromDob(editPatientDob.value);
  });
}

if (openEditPatientModal && editPatientModal) {
  openEditPatientModal.addEventListener('click', () => {
    editPatientModal.classList.add('active');
  });
}

if (closeEditPatientModal && editPatientModal) {
  closeEditPatientModal.addEventListener('click', () => {
    editPatientModal.classList.remove('active');
  });
}

if (cancelEditPatientModal && editPatientModal) {
  cancelEditPatientModal.addEventListener('click', () => {
    editPatientModal.classList.remove('active');
  });
}

if (editPatientForm) {
  editPatientForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!userId) {
      alert('No active user session found. Please sign in again.');
      return;
    }

    const patients = getStoredPatients();

    const updatedPatient = {
      id: editPatientId.value.trim(),
      name: editPatientFullname.value.trim(),
      gender: editPatientGender.value,
      age: editPatientAge.value.trim(),
      dob: editPatientDob.value,
      status: currentPatient ? currentPatient.status : 'Inactive',
      preferredLanguage: editPatientLanguage ? editPatientLanguage.value : 'English',
      notes: editPatientNotes ? editPatientNotes.value.trim() : '',
      avatar: getAvatarByGender(editPatientGender.value),
      ownerId: userId,
      roleOwner: userRole
    };

    patients[updatedPatient.id] = updatedPatient;
    saveStoredPatients(patients);
    renderPatientData(updatedPatient);

    editPatientModal.classList.remove('active');
    alert('Patient details updated successfully.');
  });
}

if (editPatientModal) {
  editPatientModal.addEventListener('click', (event) => {
    if (event.target === editPatientModal) {
      editPatientModal.classList.remove('active');
    }
  });
}

if (openDeletePatientModal && deletePatientModal) {
  openDeletePatientModal.addEventListener('click', () => {
    deletePatientModal.classList.add('active');
  });
}

if (cancelDeletePatientModal && deletePatientModal) {
  cancelDeletePatientModal.addEventListener('click', () => {
    deletePatientModal.classList.remove('active');
  });
}

if (confirmDeletePatientModal && deletePatientModal) {
  confirmDeletePatientModal.addEventListener('click', () => {
    if (!currentPatient || !userId) {
      alert('Unable to find patient record.');
      return;
    }

    removePatientFromLocalStorage(currentPatient.id);

    deletePatientModal.classList.remove('active');
    alert('Patient record deleted successfully.');
    window.location.href = `manage-patients.html?${sharedUserQuery}`;
  });
}

if (deletePatientModal) {
  deletePatientModal.addEventListener('click', (event) => {
    if (event.target === deletePatientModal) {
      deletePatientModal.classList.remove('active');
    }
  });
}