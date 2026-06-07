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

const phrasesVocabularyHeading = document.getElementById('phrasesVocabularyHeading');
const phrasesVocabularySubtext = document.getElementById('phrasesVocabularySubtext');
const phrasesVocabularyPatientStatus = document.getElementById('phrasesVocabularyPatientStatus');

const decreaseCardSizeBtn = document.getElementById('decreaseCardSizeBtn');
const increaseCardSizeBtn = document.getElementById('increaseCardSizeBtn');
const cardSizeValue = document.getElementById('cardSizeValue');

const totalPhraseCardsCount = document.getElementById('totalPhraseCardsCount');
const totalVocabularyCardsCount = document.getElementById('totalVocabularyCardsCount');
const totalPhraseClicksCount = document.getElementById('totalPhraseClicksCount');
const totalVocabularyClicksCount = document.getElementById('totalVocabularyClicksCount');

const phrasesVocabularyCategoryList = document.getElementById('phrasesVocabularyCategoryList');
const phrasesVocabularyCardsGrid = document.getElementById('phrasesVocabularyCardsGrid');
const phrasesVocabularyContentTitle = document.getElementById('phrasesVocabularyContentTitle');
const phrasesVocabularyContentCount = document.getElementById('phrasesVocabularyContentCount');

const pvTabButtons = document.querySelectorAll('[data-pv-type]');

const DEFAULT_IMAGE = '../../assets/images/placeholders/defaultPV.png';

const MIN_CARD_SCALE = 80;
const MAX_CARD_SCALE = 150;
const CARD_SCALE_STEP = 10;

let currentType = 'phrases';
let currentCategory = 'urgent';

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

function getTextByLanguage(item, language) {
  if (!item) return '';

  if (language === 'Bahasa Melayu') {
    return item.textMs || item.textEn || item.text || '';
  }

  return item.textEn || item.text || item.textMs || '';
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

if (phrasesVocabularyHeading) {
  phrasesVocabularyHeading.textContent = `Phrases & Vocabulary for ${patientName}`;
}

if (phrasesVocabularySubtext) {
  phrasesVocabularySubtext.textContent =
    `Tap any card to record patient usage and build personalized frequently used content for ${patientName}.`;
}

if (phrasesVocabularyPatientStatus) {
  phrasesVocabularyPatientStatus.textContent = patientStatus;
  phrasesVocabularyPatientStatus.classList.remove('active-badge', 'inactive-badge');
  phrasesVocabularyPatientStatus.classList.add(
    patientStatus === 'Active' ? 'active-badge' : 'inactive-badge'
  );
}

function getStoredPhrases() {
  return JSON.parse(localStorage.getItem('echozyPhrases') || '{}');
}

function getStoredVocabulary() {
  return JSON.parse(localStorage.getItem('echozyVocabulary') || '{}');
}

function getStoredUsageCounts() {
  return JSON.parse(localStorage.getItem('echozyUsageCounts') || '{}');
}

function saveStoredUsageCounts(data) {
  localStorage.setItem('echozyUsageCounts', JSON.stringify(data));
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

function getPatientUsageCounts() {
  const allUsage = getStoredUsageCounts();

  if (!allUsage[patientId]) {
    allUsage[patientId] = {
      phrases: {},
      vocabulary: {}
    };
    saveStoredUsageCounts(allUsage);
  }

  return allUsage[patientId];
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

const pvCategoryColorClassMap = {
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
  return pvCategoryColorClassMap[category] || 'board-theme-default';
}

function getCurrentData() {
  return currentType === 'phrases' ? getPatientPhrases() : getPatientVocabulary();
}

function getCurrentLabels() {
  return currentType === 'phrases' ? phraseCategoryLabels : vocabularyCategoryLabels;
}

function countAllCards(data) {
  return Object.values(data).reduce((total, items) => {
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
}

function countAllClicks(clicksObject) {
  return Object.values(clicksObject).reduce((total, count) => total + count, 0);
}

function updateTopSummary() {
  const phraseData = getPatientPhrases();
  const vocabularyData = getPatientVocabulary();
  const usageData = getPatientUsageCounts();

  if (totalPhraseCardsCount) {
    totalPhraseCardsCount.textContent = countAllCards(phraseData);
  }

  if (totalVocabularyCardsCount) {
    totalVocabularyCardsCount.textContent = countAllCards(vocabularyData);
  }

  if (totalPhraseClicksCount) {
    totalPhraseClicksCount.textContent = countAllClicks(usageData.phrases);
  }

  if (totalVocabularyClicksCount) {
    totalVocabularyClicksCount.textContent = countAllClicks(usageData.vocabulary);
  }
}

function renderCategories() {
  const labels = getCurrentLabels();
  const data = getCurrentData();
  const categoryKeys = Object.keys(labels);

  if (!currentCategory || !labels[currentCategory]) {
    currentCategory = categoryKeys[0];
  }

  phrasesVocabularyCategoryList.innerHTML = categoryKeys.map((key) => `
    <button
      type="button"
      class="board-category-btn ${getCategoryThemeClass(key)} ${key === currentCategory ? 'active-board-category' : ''}"
      data-category="${key}"
    >
      <span>${labels[key]}</span>
      <small>${(data[key] || []).length} Cards</small>
    </button>
  `).join('');

  const categoryButtons = phrasesVocabularyCategoryList.querySelectorAll('[data-category]');
  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentCategory = button.dataset.category;
      renderCategories();
      renderCards();
    });
  });
}

function recordCardClick(item) {
  const allUsage = getStoredUsageCounts();
  const patientUsage = getPatientUsageCounts();
  const targetUsage = currentType === 'phrases' ? patientUsage.phrases : patientUsage.vocabulary;

  if (!targetUsage[item.id]) {
    targetUsage[item.id] = 0;
  }

  targetUsage[item.id] += 1;

  allUsage[patientId] = patientUsage;
  saveStoredUsageCounts(allUsage);

  updateTopSummary();
  renderCards();
}

function renderCards() {
  const labels = getCurrentLabels();
  const data = getCurrentData();
  const patientUsage = getPatientUsageCounts();
  const items = data[currentCategory] || [];
  const themeClass = getCategoryThemeClass(currentCategory);
  const resolvedLanguage = getResolvedPatientLanguage();

  if (phrasesVocabularyContentTitle) {
    phrasesVocabularyContentTitle.textContent = labels[currentCategory];
  }

  if (phrasesVocabularyContentCount) {
    phrasesVocabularyContentCount.textContent = `${items.length} cards`;
  }

  phrasesVocabularyCardsGrid.innerHTML = items.length
    ? items.map((item) => {
        const clickCount =
          currentType === 'phrases'
            ? (patientUsage.phrases[item.id] || 0)
            : (patientUsage.vocabulary[item.id] || 0);

        const displayText = getTextByLanguage(item, resolvedLanguage);

        return `
          <button
            type="button"
            class="phrases-vocabulary-card ${themeClass}"
            data-item-id="${item.id}"
          >
            <div class="phrases-vocabulary-card-image">
              <img src="${item.image || DEFAULT_IMAGE}" alt="${displayText}" />
            </div>
            <div class="phrases-vocabulary-card-text">
              <span>${displayText}</span>
              <small>Clicked ${clickCount} time${clickCount === 1 ? '' : 's'}</small>
            </div>
          </button>
        `;
      }).join('')
    : `<div class="board-empty-state">No cards available in this category yet.</div>`;

  const cards = phrasesVocabularyCardsGrid.querySelectorAll('[data-item-id]');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const itemId = card.dataset.itemId;
      const selectedItem = items.find((item) => item.id === itemId);
      if (!selectedItem) return;
      recordCardClick(selectedItem);
    });
  });
}

pvTabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    pvTabButtons.forEach((btn) => btn.classList.remove('active-board-tab'));
    button.classList.add('active-board-tab');

    currentType = button.dataset.pvType;
    currentCategory = currentType === 'phrases' ? 'urgent' : 'people';

    renderCategories();
    renderCards();
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

updateTopSummary();
renderCategories();
renderCards();
applyCardScale();