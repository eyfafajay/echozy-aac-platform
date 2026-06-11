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

const successfulPhrasesCount = document.getElementById('successfulPhrasesCount');
const unsuccessfulPhrasesCount = document.getElementById('unsuccessfulPhrasesCount');
const successfulVocabularyCount = document.getElementById('successfulVocabularyCount');
const unsuccessfulVocabularyCount = document.getElementById('unsuccessfulVocabularyCount');

const frequentlyUsedPhrasesTableBody = document.getElementById('frequentlyUsedPhrasesTableBody');

const SUPABASE_URL = 'https://drvmfnlaxkcqbwoqjefu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_4ugmgc1ktCaLEmwB1ttnbA_XjOCtqDm';

const supabaseClient =
  window.supabase && SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      })
    : null;

let currentPatient = null;
let currentAuthUser = null;

function getResolvedUserId() {
  return currentAuthUser?.id || userId || '';
}

function getSharedUserQuery() {
  return new URLSearchParams({
    role: userRole,
    userId: getResolvedUserId(),
    name: userName
  }).toString();
}

const sharedUserQuery = new URLSearchParams({
  role: userRole,
  userId,
  name: userName
}).toString();

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
  logoutNavLink.addEventListener('click', async () => {
    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem('echozySession');
    }
  });
}

async function loadCurrentAuthUser() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available. Please load the Supabase CDN before this script.');
  }

  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error('No active user session found. Please sign in again.');
  }

  currentAuthUser = user;
}

function getStoredPatients() {
  return JSON.parse(localStorage.getItem('echozyPatients') || '{}');
}

function saveStoredPatients(patients) {
  localStorage.setItem('echozyPatients', JSON.stringify(patients));
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

async function recordSessionEntry(patientId) {
  const { error } = await supabaseClient
    .from('session_logs')
    .insert({
      patient_id: patientId,
      entered_at: new Date().toISOString(),
      quit_at: null
    });

  if (error) {
    throw error;
  }
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

function countTotalItems(data) {
  return Object.values(data).reduce((total, items) => {
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
}

function getAllIds(data) {
  return Object.values(data)
    .flat()
    .map((item) => item.id)
    .filter(Boolean);
}

function countResultItems(resultsObject, validIds, targetStatus) {
  return Object.entries(resultsObject || {}).filter(([itemId, status]) => {
    return validIds.includes(itemId) && status === targetStatus;
  }).length;
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

function flattenItemsWithCategory(data) {
  return Object.entries(data).flatMap(([categoryKey, items]) => {
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

async function removePatientFromCurrentUser(patientId) {
  const { error } = await supabaseClient
    .from('user_patients')
    .delete()
    .eq('user_id', currentAuthUser.id)
    .eq('patient_id', patientId);

  if (error) {
    throw error;
  }
}

function showPatientNotFound() {
  if (patientNameHeading) {
    patientNameHeading.textContent = 'Patient Not Found';
  }

  if (patientDashboardSubtext) {
    patientDashboardSubtext.textContent =
      'The selected patient record could not be found, or it is not linked to your account.';
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
  if (successfulPhrasesCount) successfulPhrasesCount.textContent = '0';
  if (unsuccessfulPhrasesCount) unsuccessfulPhrasesCount.textContent = '0';
  if (successfulVocabularyCount) successfulVocabularyCount.textContent = '0';
  if (unsuccessfulVocabularyCount) unsuccessfulVocabularyCount.textContent = '0';
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

async function getPatientFromSupabase(patientId) {
  const { data, error } = await supabaseClient
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function getMergedPatientPhrases(patientId) {
  const { data: adminPhrases, error: adminError } = await supabaseClient
    .from('admin_phrases')
    .select('*')
    .order('id', { ascending: true });

  if (adminError) {
    throw adminError;
  }

  const { data: patientPhrases, error: patientError } = await supabaseClient
    .from('patient_phrases')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (patientError) {
    throw patientError;
  }

  const merged = {
    urgent: [],
    basic: [],
    feelings: [],
    physical: [],
    daily: [],
    social: [],
    rehab: [],
    activities: []
  };

  (adminPhrases || []).forEach((phrase) => {
    if (!merged[phrase.category]) return;
    merged[phrase.category].push({
      id: phrase.id,
      textEn: phrase.text_en,
      textMs: phrase.text_ms
    });
  });

  (patientPhrases || []).forEach((phrase) => {
    if (!merged[phrase.category]) return;
    merged[phrase.category].push({
      id: phrase.id,
      textEn: phrase.text_en,
      textMs: phrase.text_ms
    });
  });

  return merged;
}

async function getMergedPatientVocabulary(patientId) {
  const { data: adminVocabulary, error: adminError } = await supabaseClient
    .from('admin_vocabulary')
    .select('*')
    .order('id', { ascending: true });

  if (adminError) {
    throw adminError;
  }

  const { data: patientVocabulary, error: patientError } = await supabaseClient
    .from('patient_vocabulary')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });

  if (patientError) {
    throw patientError;
  }

  const merged = {
    people: [],
    food: [],
    places: [],
    body: [],
    feelings: [],
    actions: []
  };

  (adminVocabulary || []).forEach((item) => {
    if (!merged[item.category]) return;
    merged[item.category].push({
      id: item.id,
      textEn: item.text_en,
      textMs: item.text_ms
    });
  });

  (patientVocabulary || []).forEach((item) => {
    if (!merged[item.category]) return;
    merged[item.category].push({
      id: item.id,
      textEn: item.text_en,
      textMs: item.text_ms
    });
  });

  return merged;
}

async function getPatientPracticeResults(patientId) {
  const { data, error } = await supabaseClient
    .from('practice_results')
    .select('content_type, content_id, result_status')
    .eq('patient_id', patientId);

  if (error) {
    throw error;
  }

  const results = {
    phrases: {},
    vocabulary: {}
  };

  (data || []).forEach((row) => {
    if (row.content_type === 'phrases' || row.content_type === 'vocabulary') {
      results[row.content_type][row.content_id] = row.result_status;
    }
  });

  return results;
}

async function getPatientUsageCounts(patientId) {
  const { data, error } = await supabaseClient
    .from('usage_counts')
    .select('content_type, content_id, click_count')
    .eq('patient_id', patientId);

  if (error) {
    throw error;
  }

  const usage = {
    phrases: {},
    vocabulary: {}
  };

  (data || []).forEach((row) => {
    if (row.content_type === 'phrases' || row.content_type === 'vocabulary') {
      usage[row.content_type][row.content_id] = row.click_count || 0;
    }
  });

  return usage;
}

async function getPatientSessionLogs(patientId) {
  const { data, error } = await supabaseClient
    .from('session_logs')
    .select('*')
    .eq('patient_id', patientId)
    .order('entered_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function renderPatientData(patient) {
  currentPatient = {
    id: patient.id,
    name: patient.full_name,
    gender: patient.gender,
    age: patient.age,
    dob: patient.dob,
    status: patient.status || 'Inactive',
    preferredLanguage: patient.preferred_language || 'English',
    notes: patient.notes || ''
  };

  if (patientNameHeading) {
    patientNameHeading.textContent = currentPatient.name;
  }

  if (patientDashboardSubtext) {
    patientDashboardSubtext.textContent =
      `View patient profile, monitor communication activity, and access communication analytics for ${currentPatient.name}.`;
  }

  if (patientProfileName) {
    patientProfileName.textContent = currentPatient.name;
  }

  if (patientProfileId) {
    patientProfileId.textContent = `Patient ID: ${currentPatient.id}`;
  }

  if (patientProfileMeta) {
    patientProfileMeta.textContent = `${currentPatient.gender} • ${currentPatient.age} years old`;
  }

  if (patientProfileStatus) {
    patientProfileStatus.textContent = currentPatient.status;
    patientProfileStatus.classList.remove('active-badge', 'inactive-badge');
    patientProfileStatus.classList.add(
      currentPatient.status === 'Active' ? 'active-badge' : 'inactive-badge'
    );
  }

  if (patientProfileAvatar) {
    patientProfileAvatar.src = getAvatarByGender(currentPatient.gender);
    patientProfileAvatar.alt = currentPatient.name;
  }

  if (editPatientFullname) {
    editPatientFullname.value = currentPatient.name;
  }

  if (editPatientId) {
    editPatientId.value = currentPatient.id;
  }

  if (editPatientAge) {
    editPatientAge.value = currentPatient.age;
  }

  if (editPatientDob) {
    editPatientDob.value = currentPatient.dob || '';
  }

  if (editPatientGender) {
    editPatientGender.value = currentPatient.gender;
  }

  if (editPatientLanguage) {
    editPatientLanguage.value = currentPatient.preferredLanguage || 'English';
  }

  if (editPatientNotes) {
    editPatientNotes.value = currentPatient.notes || '';
  }

  const phraseData = await getMergedPatientPhrases(currentPatient.id);
  const vocabularyData = await getMergedPatientVocabulary(currentPatient.id);
  const patientPracticeResults = await getPatientPracticeResults(currentPatient.id);
  const patientUsageCounts = await getPatientUsageCounts(currentPatient.id);
  const patientSessionLogs = await getPatientSessionLogs(currentPatient.id);

  if (totalPhrasesCount) {
    totalPhrasesCount.textContent = countTotalItems(phraseData);
  }

  if (totalVocabularyCount) {
    totalVocabularyCount.textContent = countTotalItems(vocabularyData);
  }

  if (totalSessionsCount) {
    totalSessionsCount.textContent = patientSessionLogs.length;
  }

  if (lastSessionText) {
    const latestSession = patientSessionLogs.length
      ? (patientSessionLogs[patientSessionLogs.length - 1].quit_at || patientSessionLogs[patientSessionLogs.length - 1].entered_at)
      : '';
    lastSessionText.textContent = formatSessionDateTime(latestSession);
  }

  const phraseIds = getAllIds(phraseData);
  const vocabularyIds = getAllIds(vocabularyData);

  const successfulPhraseTotal = countResultItems(
    patientPracticeResults.phrases,
    phraseIds,
    'success'
  );

  const unsuccessfulPhraseTotal = countResultItems(
    patientPracticeResults.phrases,
    phraseIds,
    'unsuccessful'
  );

  const successfulVocabularyTotal = countResultItems(
    patientPracticeResults.vocabulary,
    vocabularyIds,
    'success'
  );

  const unsuccessfulVocabularyTotal = countResultItems(
    patientPracticeResults.vocabulary,
    vocabularyIds,
    'unsuccessful'
  );

  const phraseProgress = phraseIds.length
    ? Math.round((successfulPhraseTotal / phraseIds.length) * 100)
    : 0;

  const vocabularyProgress = vocabularyIds.length
    ? Math.round((successfulVocabularyTotal / vocabularyIds.length) * 100)
    : 0;

  if (phrasesProgressPercent) {
    phrasesProgressPercent.textContent = `${phraseProgress}%`;
  }
  updateProgressCircle(phrasesProgressCircle, phraseProgress);

  if (vocabularyProgressPercent) {
    vocabularyProgressPercent.textContent = `${vocabularyProgress}%`;
  }
  updateProgressCircle(vocabularyProgressCircle, vocabularyProgress);

  if (successfulPhrasesCount) {
    successfulPhrasesCount.textContent = successfulPhraseTotal;
  }

  if (unsuccessfulPhrasesCount) {
    unsuccessfulPhrasesCount.textContent = unsuccessfulPhraseTotal;
  }

  if (successfulVocabularyCount) {
    successfulVocabularyCount.textContent = successfulVocabularyTotal;
  }

  if (unsuccessfulVocabularyCount) {
    unsuccessfulVocabularyCount.textContent = unsuccessfulVocabularyTotal;
  }

  const flattenedPhraseItems = flattenItemsWithCategory(phraseData);
  const flattenedVocabularyItems = flattenItemsWithCategory(vocabularyData);

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
          <td>${getDisplayTextByLanguage(item, currentPatient.preferredLanguage || 'English')}</td>
          <td>${item.categoryLabel}</td>
          <td>${item.frequency}</td>
        </tr>
      `).join('');
    }
  }

  const sharedPatientUserQuery = new URLSearchParams({
    patient: currentPatient.id,
    name: currentPatient.name,
    status: currentPatient.status,
    language: currentPatient.preferredLanguage || 'English',
    role: userRole,
    userId: getResolvedUserId(),
    user: userName
  }).toString();

  if (managePhrasesBtn) {
    managePhrasesBtn.href = `manage-phrases.html?${sharedPatientUserQuery}`;
  }

  if (manageVocabularyBtn) {
    manageVocabularyBtn.href = `manage-vocabulary.html?${sharedPatientUserQuery}`;
  }

  if (enterSessionBtn) {
    const sessionBoardUrl =
      `../patients/board.html?patient=${encodeURIComponent(currentPatient.id)}` +
      `&name=${encodeURIComponent(currentPatient.name)}` +
      `&status=${encodeURIComponent('Active')}` +
      `&language=${encodeURIComponent(currentPatient.preferredLanguage || 'English')}` +
      `&role=${encodeURIComponent(userRole)}` +
      `&userId=${encodeURIComponent(getResolvedUserId())}` +
      `&user=${encodeURIComponent(userName)}`;

    enterSessionBtn.href = sessionBoardUrl;

    enterSessionBtn.onclick = async (event) => {
      event.preventDefault();

      try {
        const { error } = await supabaseClient
          .from('patients')
          .update({
            status: 'Active'
          })
          .eq('id', currentPatient.id);

        if (error) {
          throw error;
        }

        const updatedPatient = updatePatientStatusInStorage(currentPatient.id, 'Active');
        if (updatedPatient) {
          currentPatient.status = 'Active';
        }

        await recordSessionEntry(currentPatient.id);

        window.location.href = sessionBoardUrl;
      } catch (error) {
        console.error(error);
        alert(error.message || 'Unable to start session.');
      }
    };
  }
}

async function loadPatientData() {
  try {
    const patient = await getPatientFromSupabase(urlPatientId);

    if (patient) {
      await renderPatientData(patient);
      return;
    }

    showPatientNotFound();
  } catch (error) {
    console.error(error);
    showPatientNotFound();
  }
}

async function initializePatientDashboard() {
  try {
    await loadCurrentAuthUser();

    const refreshedSharedUserQuery = getSharedUserQuery();

    if (dashboardNavLink) {
      dashboardNavLink.href = `dashboard.html?${refreshedSharedUserQuery}`;
    }

    if (managePatientsNavLink) {
      managePatientsNavLink.href = `manage-patients.html?${refreshedSharedUserQuery}`;
    }

    if (settingsNavLink) {
      settingsNavLink.href =
        userRole === 'provider'
          ? `settings-provider.html?${refreshedSharedUserQuery}`
          : `settings-caregiver.html?${refreshedSharedUserQuery}`;
    }

    if (backToPatientsBtn) {
      backToPatientsBtn.href = `manage-patients.html?${refreshedSharedUserQuery}`;
    }

    await loadPatientData();
  } catch (error) {
    console.error(error);
    showPatientNotFound();
  }
}

initializePatientDashboard();

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
  editPatientForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!currentAuthUser || !currentPatient) {
      alert('No active user session found. Please sign in again.');
      return;
    }

    const updatedPatient = {
      id: editPatientId.value.trim(),
      full_name: editPatientFullname.value.trim(),
      gender: editPatientGender.value,
      age: Number(editPatientAge.value.trim()),
      dob: editPatientDob.value,
      status: currentPatient.status || 'Inactive',
      preferred_language: editPatientLanguage ? editPatientLanguage.value : 'English',
      notes: editPatientNotes ? editPatientNotes.value.trim() : ''
    };

    try {
      const { error } = await supabaseClient
        .from('patients')
        .update(updatedPatient)
        .eq('id', updatedPatient.id);

      if (error) {
        throw error;
      }

      const localPatients = getStoredPatients();
      if (localPatients[updatedPatient.id]) {
        localPatients[updatedPatient.id] = {
          ...localPatients[updatedPatient.id],
          name: updatedPatient.full_name,
          gender: updatedPatient.gender,
          age: updatedPatient.age,
          dob: updatedPatient.dob,
          status: updatedPatient.status,
          preferredLanguage: updatedPatient.preferred_language,
          notes: updatedPatient.notes,
          avatar: getAvatarByGender(updatedPatient.gender)
        };
        saveStoredPatients(localPatients);
      }

      await loadPatientData();
      editPatientModal.classList.remove('active');
      alert('Patient details updated successfully.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to update patient details.');
    }
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
  confirmDeletePatientModal.addEventListener('click', async () => {
    if (!currentPatient || !currentAuthUser) {
      alert('Unable to find patient record.');
      return;
    }

    try {
      await removePatientFromCurrentUser(currentPatient.id);

      const localPatients = getStoredPatients();
      if (localPatients[currentPatient.id]) {
        delete localPatients[currentPatient.id];
        saveStoredPatients(localPatients);
      }

      deletePatientModal.classList.remove('active');
      alert('Patient removed from your account successfully.');
      window.location.href = `manage-patients.html?${getSharedUserQuery()}`;
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to remove patient from your account.');
    }
  });
}

if (deletePatientModal) {
  deletePatientModal.addEventListener('click', (event) => {
    if (event.target === deletePatientModal) {
      deletePatientModal.classList.remove('active');
    }
  });
}