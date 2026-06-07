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

const frequentlyUsedHeading = document.getElementById('frequentlyUsedHeading');
const frequentlyUsedSubtext = document.getElementById('frequentlyUsedSubtext');
const frequentlyUsedPatientStatus = document.getElementById('frequentlyUsedPatientStatus');

const decreaseCardSizeBtn = document.getElementById('decreaseCardSizeBtn');
const increaseCardSizeBtn = document.getElementById('increaseCardSizeBtn');
const cardSizeValue = document.getElementById('cardSizeValue');

const frequentlyUsedPhraseClicks = document.getElementById('frequentlyUsedPhraseClicks');
const frequentlyUsedVocabularyClicks = document.getElementById('frequentlyUsedVocabularyClicks');
const frequentlyUsedPhraseCards = document.getElementById('frequentlyUsedPhraseCards');
const frequentlyUsedVocabularyCards = document.getElementById('frequentlyUsedVocabularyCards');

const frequentlyUsedPhraseCountLabel = document.getElementById('frequentlyUsedPhraseCountLabel');
const frequentlyUsedVocabularyCountLabel = document.getElementById('frequentlyUsedVocabularyCountLabel');

const frequentlyUsedPhrasesGrid = document.getElementById('frequentlyUsedPhrasesGrid');
const frequentlyUsedVocabularyGrid = document.getElementById('frequentlyUsedVocabularyGrid');

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

if (frequentlyUsedHeading) {
  frequentlyUsedHeading.textContent = `Frequently Used for ${patientName}`;
}

if (frequentlyUsedSubtext) {
  frequentlyUsedSubtext.textContent =
    `Easy access to the phrases and vocabulary cards most often used by ${patientName}.`;
}

if (frequentlyUsedPatientStatus) {
  frequentlyUsedPatientStatus.textContent = patientStatus;
  frequentlyUsedPatientStatus.classList.remove('active-badge', 'inactive-badge');
  frequentlyUsedPatientStatus.classList.add(
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

function getPatientPhrases() {
  const allPhrases = getStoredPhrases();
  return allPhrases[patientId] || {};
}

function getPatientVocabulary() {
  const allVocabulary = getStoredVocabulary();
  return allVocabulary[patientId] || {};
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

function flattenItemsByType(data, type) {
  return Object.entries(data).flatMap(([categoryKey, items]) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      ...item,
      categoryKey,
      type
    }));
  });
}

function mergeItemsWithUsage(items, usageMap) {
  return items
    .map((item) => ({
      ...item,
      clickCount: usageMap[item.id] || 0
    }))
    .filter((item) => item.clickCount > 0)
    .sort((a, b) => b.clickCount - a.clickCount);
}

function countAllClicks(clicksObject) {
  return Object.values(clicksObject).reduce((total, count) => total + count, 0);
}

function getFrequentlyUsedThemeClass(categoryKey, type) {
  const phraseThemeMap = {
    urgent: 'frequent-theme-urgent',
    basic: 'frequent-theme-basic',
    feelings: 'frequent-theme-feelings',
    physical: 'frequent-theme-physical',
    daily: 'frequent-theme-daily',
    social: 'frequent-theme-social',
    rehab: 'frequent-theme-rehab',
    activities: 'frequent-theme-activities'
  };

  const vocabularyThemeMap = {
    people: 'frequent-theme-people',
    food: 'frequent-theme-food',
    places: 'frequent-theme-places',
    body: 'frequent-theme-body',
    feelings: 'frequent-theme-vocab-feelings',
    actions: 'frequent-theme-actions'
  };

  if (type === 'phrases') {
    return phraseThemeMap[categoryKey] || 'frequent-theme-default';
  }

  return vocabularyThemeMap[categoryKey] || 'frequent-theme-default';
}

function recordUsage(type, itemId) {
  const allUsage = getStoredUsageCounts();
  const patientUsage = getPatientUsageCounts();
  const targetUsage = type === 'phrases' ? patientUsage.phrases : patientUsage.vocabulary;

  if (!targetUsage[itemId]) {
    targetUsage[itemId] = 0;
  }

  targetUsage[itemId] += 1;

  allUsage[patientId] = patientUsage;
  saveStoredUsageCounts(allUsage);

  renderFrequentlyUsed();
}

function renderCardGrid(gridElement, items, type) {
  if (!gridElement) return;

  const resolvedLanguage = getResolvedPatientLanguage();

  gridElement.innerHTML = items.length
    ? items.map((item) => {
        const themeClass = getFrequentlyUsedThemeClass(item.categoryKey, type);
        const displayText = getTextByLanguage(item, resolvedLanguage);

        return `
          <button
            type="button"
            class="frequently-used-card ${themeClass}"
            data-item-id="${item.id}"
            data-item-type="${type}"
          >
            <div class="frequently-used-card-image">
              <img src="${item.image || DEFAULT_IMAGE}" alt="${displayText}" />
            </div>
            <div class="frequently-used-card-text">
              <span>${displayText}</span>
              <small>Clicked ${item.clickCount} time${item.clickCount === 1 ? '' : 's'}</small>
            </div>
          </button>
        `;
      }).join('')
    : `<div class="board-empty-state">No frequently used ${type} yet.</div>`;

  const cards = gridElement.querySelectorAll('[data-item-id]');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const itemType = card.dataset.itemType;
      const itemId = card.dataset.itemId;
      recordUsage(itemType, itemId);
    });
  });
}

function renderFrequentlyUsed() {
  const phraseData = getPatientPhrases();
  const vocabularyData = getPatientVocabulary();
  const usageData = getPatientUsageCounts();

  const phraseItems = flattenItemsByType(phraseData, 'phrases');
  const vocabularyItems = flattenItemsByType(vocabularyData, 'vocabulary');

  const topPhrases = mergeItemsWithUsage(phraseItems, usageData.phrases);
  const topVocabulary = mergeItemsWithUsage(vocabularyItems, usageData.vocabulary);

  if (frequentlyUsedPhraseClicks) {
    frequentlyUsedPhraseClicks.textContent = countAllClicks(usageData.phrases);
  }

  if (frequentlyUsedVocabularyClicks) {
    frequentlyUsedVocabularyClicks.textContent = countAllClicks(usageData.vocabulary);
  }

  if (frequentlyUsedPhraseCards) {
    frequentlyUsedPhraseCards.textContent = topPhrases.length;
  }

  if (frequentlyUsedVocabularyCards) {
    frequentlyUsedVocabularyCards.textContent = topVocabulary.length;
  }

  if (frequentlyUsedPhraseCountLabel) {
    frequentlyUsedPhraseCountLabel.textContent = `${topPhrases.length} cards`;
  }

  if (frequentlyUsedVocabularyCountLabel) {
    frequentlyUsedVocabularyCountLabel.textContent = `${topVocabulary.length} cards`;
  }

  renderCardGrid(frequentlyUsedPhrasesGrid, topPhrases, 'phrases');
  renderCardGrid(frequentlyUsedVocabularyGrid, topVocabulary, 'vocabulary');
}

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

renderFrequentlyUsed();
applyCardScale();