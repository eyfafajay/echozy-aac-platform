const pageParams = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const currentRole = pageParams.get('role') || storedSession.role || 'caregiver';
const currentUserId = pageParams.get('userId') || storedSession.userId || 'U0001';
const currentName = pageParams.get('name') || storedSession.fullName || 'Caregiver User';
const currentEmail = storedSession.email || 'caregiver@example.com';

const dashboardNavLink = document.getElementById('dashboardNavLink');
const managePatientsNavLink = document.getElementById('managePatientsNavLink');
const settingsNavLink = document.getElementById('settingsNavLink');
const logoutNavLink = document.getElementById('logoutNavLink');

const settingsProfileName = document.getElementById('settingsProfileName');
const settingsProfileEmail = document.getElementById('settingsProfileEmail');
const settingsProfileAvatar = document.getElementById('settingsProfileAvatar');

const caregiverFullname = document.getElementById('caregiver-fullname');
const caregiverEmail = document.getElementById('caregiver-email');
const caregiverPhone = document.getElementById('caregiver-phone');
const caregiverGender = document.getElementById('caregiver-gender');

const settingsLinkedPatientsCount = document.getElementById('settingsLinkedPatientsCount');

const caregiverSettingsForm = document.getElementById('caregiverSettingsForm');

const sharedUserQuery = new URLSearchParams({
  role: currentRole,
  userId: currentUserId,
  name: currentName
}).toString();

if (currentRole === 'provider') {
  window.location.href = `settings-provider.html?${sharedUserQuery}`;
}

if (dashboardNavLink) {
  dashboardNavLink.href = `dashboard.html?${sharedUserQuery}`;
}

if (managePatientsNavLink) {
  managePatientsNavLink.href = `manage-patients.html?${sharedUserQuery}`;
}

if (settingsNavLink) {
  settingsNavLink.href = `settings-caregiver.html?${sharedUserQuery}`;
}

if (logoutNavLink) {
  logoutNavLink.addEventListener('click', () => {
    localStorage.removeItem('echozySession');
  });
}

const PLACEHOLDER_AVATAR = `data:image/svg+xml;utf8,
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="80" fill="%23e8f3fb"/>
  <circle cx="80" cy="60" r="26" fill="%239fc0e7"/>
  <path d="M38 128c8-22 29-34 42-34s34 12 42 34" fill="%239fc0e7"/>
</svg>`;

function getAvatarByGender(gender) {
  if (gender === 'Male') {
    return '../../assets/images/avatars/male.png';
  }

  if (gender === 'Female') {
    return '../../assets/images/avatars/female.png';
  }

  return PLACEHOLDER_AVATAR;
}

function getStoredPatients() {
  return JSON.parse(localStorage.getItem('echozyPatients') || '{}');
}

function getStoredUsers() {
  return JSON.parse(localStorage.getItem('echozyUsers') || '{}');
}

function saveStoredUsers(users) {
  localStorage.setItem('echozyUsers', JSON.stringify(users));
}

function formatPatientCount(count) {
  return `${count} ${count === 1 ? 'Patient' : 'Patients'}`;
}

function getCurrentSignedInUser() {
  const users = getStoredUsers();

  if (currentUserId && users[currentUserId]) {
    return users[currentUserId];
  }

  return (
    Object.values(users).find(
      (user) =>
        user.email &&
        storedSession.email &&
        user.email.toLowerCase() === storedSession.email.toLowerCase()
    ) || null
  );
}

const storedCaregiverSettings = JSON.parse(localStorage.getItem('echozyCaregiverSettings') || '{}');
const signedInUser = getCurrentSignedInUser();

const caregiverData = {
  fullName:
    storedCaregiverSettings.fullName ||
    signedInUser?.fullName ||
    currentName ||
    '',
  email:
    storedCaregiverSettings.email ||
    signedInUser?.email ||
    currentEmail ||
    '',
  phone: storedCaregiverSettings.phone || signedInUser?.phone || '',
  gender: storedCaregiverSettings.gender || signedInUser?.gender || ''
};

if (settingsProfileName) {
  settingsProfileName.textContent = caregiverData.fullName || '';
}

if (settingsProfileEmail) {
  settingsProfileEmail.textContent = caregiverData.email || '';
}

if (settingsProfileAvatar) {
  settingsProfileAvatar.src = getAvatarByGender(caregiverData.gender);
}

if (caregiverFullname) {
  caregiverFullname.value = caregiverData.fullName || '';
}

if (caregiverEmail) {
  caregiverEmail.value = caregiverData.email || '';
}

if (caregiverPhone) {
  caregiverPhone.value = caregiverData.phone || '';
}

if (caregiverGender) {
  caregiverGender.value = caregiverData.gender || '';
}

if (caregiverGender) {
  caregiverGender.addEventListener('change', () => {
    if (settingsProfileAvatar) {
      settingsProfileAvatar.src = getAvatarByGender(caregiverGender.value);
    }
  });
}

const linkedPatientsTotal = Object.keys(getStoredPatients()).length;

if (settingsLinkedPatientsCount) {
  settingsLinkedPatientsCount.textContent = formatPatientCount(linkedPatientsTotal);
}

if (caregiverSettingsForm) {
  caregiverSettingsForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const updatedCaregiverSettings = {
      fullName: caregiverFullname ? caregiverFullname.value.trim() : caregiverData.fullName,
      email: caregiverEmail ? caregiverEmail.value.trim() : caregiverData.email,
      phone: caregiverPhone ? caregiverPhone.value.trim() : caregiverData.phone,
      gender: caregiverGender ? caregiverGender.value : caregiverData.gender
    };

    localStorage.setItem('echozyCaregiverSettings', JSON.stringify(updatedCaregiverSettings));

    const users = getStoredUsers();
    const userKey =
      currentUserId && users[currentUserId]
        ? currentUserId
        : Object.keys(users).find((key) => {
            const user = users[key];
            return (
              user.email &&
              storedSession.email &&
              user.email.toLowerCase() === storedSession.email.toLowerCase()
            );
          });

    if (userKey) {
      users[userKey] = {
        ...users[userKey],
        fullName: updatedCaregiverSettings.fullName,
        email: updatedCaregiverSettings.email,
        phone: updatedCaregiverSettings.phone,
        gender: updatedCaregiverSettings.gender,
        updatedAt: new Date().toISOString()
      };
      saveStoredUsers(users);
    }

    const updatedSession = {
      ...storedSession,
      role: currentRole,
      userId: currentUserId,
      fullName: updatedCaregiverSettings.fullName,
      email: updatedCaregiverSettings.email
    };

    localStorage.setItem('echozySession', JSON.stringify(updatedSession));

    alert('Settings updated successfully.');

    window.location.href =
      `settings-caregiver.html?role=${encodeURIComponent(currentRole)}&userId=${encodeURIComponent(currentUserId)}&name=${encodeURIComponent(updatedCaregiverSettings.fullName)}`;
  });
}