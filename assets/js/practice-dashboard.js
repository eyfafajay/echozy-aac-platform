const params = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const patientId = params.get('patient') || '0832';
const patientName = params.get('name') || 'Adam Lim';
const patientStatus = params.get('status') || 'Active';
const patientLanguage = params.get('language') || 'English';

const userRole = params.get('role') || storedSession.role || 'caregiver';
const userId = params.get('userId') || storedSession.userId || 'U0001';
const userName = params.get('user') || storedSession.fullName || 'User';

const frequentlyUsedNavLink = document.getElementById('frequentlyUsedNavLink');
const phrasesVocabularyNavLink = document.getElementById('phrasesVocabularyNavLink');
const boardNavLink = document.getElementById('boardNavLink');
const practiceDashboardNavLink = document.getElementById('practiceDashboardNavLink');
const backToPatientDashboardBtn = document.getElementById('backToPatientDashboardBtn');

const practiceHeading = document.getElementById('practiceHeading');
const practiceSubtext = document.getElementById('practiceSubtext');
const practicePatientStatus = document.getElementById('practicePatientStatus');

const decreaseCardSizeBtn = document.getElementById('decreaseCardSizeBtn');
const increaseCardSizeBtn = document.getElementById('increaseCardSizeBtn');
const cardSizeValue = document.getElementById('cardSizeValue');

const practicedPhrasesPercent = document.getElementById('practicedPhrasesPercent');
const practicedVocabularyPercent = document.getElementById('practicedVocabularyPercent');
const practicedPhrasesCount = document.getElementById('practicedPhrasesCount');
const practicedVocabularyCount = document.getElementById('practicedVocabularyCount');

const practiceCategoryList = document.getElementById('practiceCategoryList');
const practiceCardsGrid = document.getElementById('practiceCardsGrid');
const practiceContentTitle = document.getElementById('practiceContentTitle');
const practiceContentCount = document.getElementById('practiceContentCount');
const practiceContentHeader = document.querySelector('.practice-content-header');

const practiceTabButtons = document.querySelectorAll('[data-practice-type]');

let currentType = 'phrases';
let currentCategory = 'urgent';
let currentAudio = null;

const DEFAULT_IMAGE = '../../assets/images/placeholders/defaultPV.png';

const MIN_CARD_SCALE = 80;
const MAX_CARD_SCALE = 150;
const CARD_SCALE_STEP = 10;

function getStoredPatients() {
  return JSON.parse(localStorage.getItem('echozyPatients') || '{}');
}

function saveStoredPatients(patients) {
  localStorage.setItem('echozyPatients', JSON.stringify(patients));
}

function updatePatientStatusInStorage(patientId, nextStatus) {
  const patients = getStoredPatients();

  if (!patients[patientId]) {
    return;
  }

  patients[patientId].status = nextStatus;
  saveStoredPatients(patients);
}

function getResolvedPatientLanguage() {
  const storedPatients = getStoredPatients();
  return patientLanguage || storedPatients[patientId]?.preferredLanguage || 'English';
}

function getTtsLanguageCode() {
  return getResolvedPatientLanguage() === 'Bahasa Melayu' ? 'ms-MY' : 'en-US';
}

function getTextByLanguage(item, language) {
  if (!item) return '';

  if (language === 'Bahasa Melayu') {
    return item.textMs || item.textEn || item.text || '';
  }

  return item.textEn || item.text || item.textMs || '';
}

async function speakCardWithOpenAITTS(text) {
  if (!text) return;

  try {
    const response = await fetch('http://localhost:3000/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        language: getTtsLanguageCode()
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate speech.');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    currentAudio = new Audio(audioUrl);

    currentAudio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
    };

    currentAudio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      console.error('Unable to play generated card audio.');
    };

    await currentAudio.play();
  } catch (error) {
    console.error('Practice Dashboard card TTS error:', error);
  }
}

function getStoredCardScale() {
  const storedScale = Number(localStorage.getItem(`echozyCardScale_${patientId}`));

  if (!Number.isFinite(storedScale)) {
    return 100;
  }

  return Math.min(MAX_CARD_SCALE, Math.max(MIN_CARD_SCALE, storedScale));
}

function saveStoredCardScale(scaleValue) {
  const safeScale = Math.min(MAX_CARD_SCALE, Math.max(MIN_CARD_SCALE, scaleValue));
  localStorage.setItem(`echozyCardScale_${patientId}`, String(safeScale));
}

function applyCardScale() {
  const currentScale = getStoredCardScale();
  document.body.style.setProperty('--echozy-card-scale', String(currentScale / 100));

  if (cardSizeValue) {
    cardSizeValue.textContent = `${currentScale}%`;
  }

  if (decreaseCardSizeBtn) {
    decreaseCardSizeBtn.disabled = currentScale <= MIN_CARD_SCALE;
  }

  if (increaseCardSizeBtn) {
    increaseCardSizeBtn.disabled = currentScale >= MAX_CARD_SCALE;
  }
}

const sharedPatientQuery = new URLSearchParams({
  patient: patientId,
  name: patientName,
  status: patientStatus,
  language: getResolvedPatientLanguage(),
  role: userRole,
  userId,
  user: userName
}).toString();

if (frequentlyUsedNavLink) {
  frequentlyUsedNavLink.href = `frequently-used.html?${sharedPatientQuery}`;
}

if (phrasesVocabularyNavLink) {
  phrasesVocabularyNavLink.href = `phrases-vocabulary.html?${sharedPatientQuery}`;
}

if (boardNavLink) {
  boardNavLink.href = `board.html?${sharedPatientQuery}`;
}

if (practiceDashboardNavLink) {
  practiceDashboardNavLink.href = `practice-dashboard.html?${sharedPatientQuery}`;
}

if (backToPatientDashboardBtn) {
  backToPatientDashboardBtn.href = `../main/patient-dashboard.html?${sharedPatientQuery}`;

  backToPatientDashboardBtn.addEventListener('click', () => {
    recordQuitSession();
    updatePatientStatusInStorage(patientId, 'Inactive');
  });
}

if (practiceHeading) {
  practiceHeading.textContent = `Practice for ${patientName}`;
}

if (practiceSubtext) {
  practiceSubtext.textContent =
    `Mark phrases and vocabulary as practiced to track communication progress for ${patientName}.`;
}

if (practicePatientStatus) {
  practicePatientStatus.textContent = patientStatus;
  practicePatientStatus.classList.remove('active-badge', 'inactive-badge');
  practicePatientStatus.classList.add(
    patientStatus === 'Active' ? 'active-badge' : 'inactive-badge'
  );
}

function getStoredPhrases() {
  return JSON.parse(localStorage.getItem('echozyPhrases') || '{}');
}

function getStoredVocabulary() {
  return JSON.parse(localStorage.getItem('echozyVocabulary') || '{}');
}

function getStoredPracticeClickCounts() {
  return JSON.parse(localStorage.getItem('echozyPracticeClickCounts') || '{}');
}

function saveStoredPracticeClickCounts(data) {
  localStorage.setItem('echozyPracticeClickCounts', JSON.stringify(data));
}

function getPatientPracticeClickCounts() {
  const allPracticeClicks = getStoredPracticeClickCounts();

  if (!allPracticeClicks[patientId]) {
    allPracticeClicks[patientId] = {
      phrases: {},
      vocabulary: {}
    };
    saveStoredPracticeClickCounts(allPracticeClicks);
  }

  return allPracticeClicks[patientId];
}

function recordPracticeCardClick(itemId) {
  const allPracticeClicks = getStoredPracticeClickCounts();
  const patientPracticeClicks = getPatientPracticeClickCounts();
  const targetClicks = currentType === 'phrases'
    ? patientPracticeClicks.phrases
    : patientPracticeClicks.vocabulary;

  if (!itemId) {
    return;
  }

  if (!targetClicks[itemId]) {
    targetClicks[itemId] = 0;
  }

  targetClicks[itemId] += 1;

  allPracticeClicks[patientId] = patientPracticeClicks;
  saveStoredPracticeClickCounts(allPracticeClicks);
}

function getStoredSessionLogs() {
  return JSON.parse(localStorage.getItem('echozySessionLogs') || '{}');
}

function saveStoredSessionLogs(data) {
  localStorage.setItem('echozySessionLogs', JSON.stringify(data));
}

function recordQuitSession() {
  const allSessionLogs = getStoredSessionLogs();

  if (!allSessionLogs[patientId] || !allSessionLogs[patientId].length) {
    return;
  }

  const patientLogs = allSessionLogs[patientId];

  for (let i = patientLogs.length - 1; i >= 0; i--) {
    if (patientLogs[i].enteredAt && !patientLogs[i].quitAt) {
      patientLogs[i].quitAt = new Date().toISOString();
      break;
    }
  }

  allSessionLogs[patientId] = patientLogs;
  saveStoredSessionLogs(allSessionLogs);
}

function getPatientPhrases() {
  const allPhrases = getStoredPhrases();
  return allPhrases[patientId] || {};
}

function getPatientVocabulary() {
  const allVocabulary = getStoredVocabulary();
  return allVocabulary[patientId] || {};
}

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

const vocabularyCategoryLabels = {
  people: 'People',
  food: 'Food & Drink',
  places: 'Places',
  body: 'Body & Health',
  feelings: 'Feelings',
  actions: 'Actions & Verbs'
};

const practiceCategoryThemeMap = {
  urgent: 'board-theme-urgent',
  basic: 'board-theme-basic',
  feelings: 'board-theme-feelings',
  physical: 'board-theme-physical',
  daily: 'board-theme-daily',
  social: 'board-theme-social',
  rehab: 'board-theme-rehab',
  activities: 'board-theme-activities',
  people: 'board-theme-people',
  food: 'board-theme-food',
  places: 'board-theme-places',
  body: 'board-theme-body',
  actions: 'board-theme-actions'
};

function getCategoryThemeClass(category) {
  return practiceCategoryThemeMap[category] || 'board-theme-default';
}

function getCurrentData() {
  return currentType === 'phrases' ? getPatientPhrases() : getPatientVocabulary();
}

function getCurrentLabels() {
  return currentType === 'phrases' ? phraseCategoryLabels : vocabularyCategoryLabels;
}

function countAllItems(data) {
  return Object.values(data).reduce((total, items) => {
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
}

function getAllIds(data) {
  return Object.values(data).flat().map((item) => item.id).filter(Boolean);
}

function sumClickCounts(clicksObject) {
  return Object.values(clicksObject || {}).reduce((total, count) => total + count, 0);
}

function countPracticedItems(clicksObject, validIds) {
  return Object.entries(clicksObject || {}).filter(([itemId, count]) => {
    return validIds.includes(itemId) && count > 0;
  }).length;
}

function updatePracticeSummary() {
  const patientPracticeClicks = getPatientPracticeClickCounts();
  const phraseData = getPatientPhrases();
  const vocabularyData = getPatientVocabulary();

  const totalPhraseItems = countAllItems(phraseData);
  const totalVocabularyItems = countAllItems(vocabularyData);

  const phraseIds = getAllIds(phraseData);
  const vocabularyIds = getAllIds(vocabularyData);

  const practicedPhraseItems = countPracticedItems(patientPracticeClicks.phrases, phraseIds);
  const practicedVocabularyItems = countPracticedItems(patientPracticeClicks.vocabulary, vocabularyIds);

  const totalPhrasePracticeClicks = sumClickCounts(patientPracticeClicks.phrases);
  const totalVocabularyPracticeClicks = sumClickCounts(patientPracticeClicks.vocabulary);

  const phrasePercent = totalPhraseItems
    ? Math.round((practicedPhraseItems / totalPhraseItems) * 100)
    : 0;

  const vocabularyPercent = totalVocabularyItems
    ? Math.round((practicedVocabularyItems / totalVocabularyItems) * 100)
    : 0;

  if (practicedPhrasesPercent) {
    practicedPhrasesPercent.textContent = `${phrasePercent}%`;
  }

  if (practicedVocabularyPercent) {
    practicedVocabularyPercent.textContent = `${vocabularyPercent}%`;
  }

  if (practicedPhrasesCount) {
    practicedPhrasesCount.textContent = totalPhrasePracticeClicks;
  }

  if (practicedVocabularyCount) {
    practicedVocabularyCount.textContent = totalVocabularyPracticeClicks;
  }
}

function renderCategories() {
  const labels = getCurrentLabels();
  const data = getCurrentData();
  const categoryKeys = Object.keys(labels);

  if (!currentCategory || !labels[currentCategory]) {
    currentCategory = categoryKeys[0];
  }

  practiceCategoryList.innerHTML = categoryKeys.map((key) => `
    <button
      type="button"
      class="board-category-btn ${getCategoryThemeClass(key)} ${key === currentCategory ? 'active-board-category' : ''}"
      data-category="${key}"
    >
      <span>${labels[key]}</span>
      <small>${(data[key] || []).length} Cards</small>
    </button>
  `).join('');

  const categoryButtons = practiceCategoryList.querySelectorAll('[data-category]');
  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentCategory = button.dataset.category;
      renderCategories();
      renderPracticeCards();
    });
  });
}

function renderPracticeCards() {
  const labels = getCurrentLabels();
  const data = getCurrentData();
  const patientPracticeClicks = getPatientPracticeClickCounts();

  const items = data[currentCategory] || [];
  const practiceClicks = currentType === 'phrases'
    ? patientPracticeClicks.phrases
    : patientPracticeClicks.vocabulary;
  const resolvedLanguage = getResolvedPatientLanguage();
  const themeClass = getCategoryThemeClass(currentCategory);

  if (practiceContentTitle) {
    practiceContentTitle.textContent = labels[currentCategory];
  }

  if (practiceContentCount) {
    practiceContentCount.textContent = `${items.length} cards`;
  }

  if (practiceContentHeader) {
    practiceContentHeader.className = 'practice-content-header';
    practiceContentHeader.classList.add(themeClass);
  }

  practiceCardsGrid.innerHTML = items.length
    ? items.map((item) => {
        const practiceCount = practiceClicks[item.id] || 0;
        const displayText = getTextByLanguage(item, resolvedLanguage);

        return `
          <button
            type="button"
            class="phrases-vocabulary-card ${themeClass}"
            data-item-id="${item.id}"
            data-item-text="${displayText}"
          >
            <div class="phrases-vocabulary-card-image">
              <img src="${item.image || DEFAULT_IMAGE}" alt="${displayText}" />
            </div>
            <div class="phrases-vocabulary-card-text">
              <span>${displayText}</span>
              <small>Practiced ${practiceCount} time${practiceCount === 1 ? '' : 's'}</small>
            </div>
          </button>
        `;
      }).join('')
    : `<div class="board-empty-state">No cards available in this category yet.</div>`;

  const cards = practiceCardsGrid.querySelectorAll('[data-item-id]');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const itemId = card.dataset.itemId;
      const itemText = card.dataset.itemText;

      recordPracticeCardClick(itemId);
      updatePracticeSummary();
      renderPracticeCards();
      speakCardWithOpenAITTS(itemText);
    });
  });
}

practiceTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    practiceTabButtons.forEach((btn) => btn.classList.remove('active-board-tab'));
    button.classList.add('active-board-tab');

    currentType = button.dataset.practiceType;
    currentCategory = currentType === 'phrases' ? 'urgent' : 'people';

    renderCategories();
    renderPracticeCards();
  });
});

if (decreaseCardSizeBtn) {
  decreaseCardSizeBtn.addEventListener('click', () => {
    const currentScale = getStoredCardScale();
    const nextScale = Math.max(MIN_CARD_SCALE, currentScale - CARD_SCALE_STEP);
    saveStoredCardScale(nextScale);
    applyCardScale();
  });
}

if (increaseCardSizeBtn) {
  increaseCardSizeBtn.addEventListener('click', () => {
    const currentScale = getStoredCardScale();
    const nextScale = Math.min(MAX_CARD_SCALE, currentScale + CARD_SCALE_STEP);
    saveStoredCardScale(nextScale);
    applyCardScale();
  });
}

updatePracticeSummary();
renderCategories();
renderPracticeCards();
applyCardScale();