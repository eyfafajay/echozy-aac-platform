const pageParams = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const currentRole = pageParams.get('role') || storedSession.role || 'provider';
const currentUserId = pageParams.get('userId') || storedSession.userId || 'U0001';
const currentName = pageParams.get('name') || storedSession.fullName || 'Healthcare Provider';
const currentEmail = storedSession.email || 'provider@example.com';

const dashboardNavLink = document.getElementById('dashboardNavLink');
const managePatientsNavLink = document.getElementById('managePatientsNavLink');
const settingsNavLink = document.getElementById('settingsNavLink');
const logoutNavLink = document.getElementById('logoutNavLink');

const settingsProfileName = document.getElementById('settingsProfileName');
const settingsProfileEmail = document.getElementById('settingsProfileEmail');
const settingsProfileAvatar = document.getElementById('settingsProfileAvatar');
const settingsProfileDepartment = document.getElementById('settingsProfileDepartment');

const providerFullname = document.getElementById('provider-fullname');
const providerEmail = document.getElementById('provider-email');
const providerPhone = document.getElementById('provider-phone');
const providerGender = document.getElementById('provider-gender');
const providerOrganization = document.getElementById('provider-organization');
const providerDepartment = document.getElementById('provider-department');
const providerPosition = document.getElementById('provider-position');
const providerLicense = document.getElementById('provider-license');

const settingsAssignedPatientsCount = document.getElementById('settingsAssignedPatientsCount');

const providerSettingsForm = document.getElementById('providerSettingsForm');

const sharedUserQuery = new URLSearchParams({
  role: currentRole,
  userId: currentUserId,
  name: currentName
}).toString();

if (currentRole !== 'provider') {
  window.location.href = `settings-caregiver.html?${sharedUserQuery}`;
}

if (dashboardNavLink) {
  dashboardNavLink.href = `dashboard.html?${sharedUserQuery}`;
}

if (managePatientsNavLink) {
  managePatientsNavLink.href = `manage-patients.html?${sharedUserQuery}`;
}

if (settingsNavLink) {
  settingsNavLink.href = `settings-provider.html?${sharedUserQuery}`;
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
  if (gender === 'Female') {
    return '../../assets/images/avatars/female.png';
  }

  if (gender === 'Male') {
    return '../../assets/images/avatars/male.png';
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

const storedProviderSettings = JSON.parse(localStorage.getItem('echozyProviderSettings') || '{}');
const signedInUser = getCurrentSignedInUser();

const providerData = {
  fullName:
    storedProviderSettings.fullName ||
    signedInUser?.fullName ||
    currentName ||
    '',
  email:
    storedProviderSettings.email ||
    signedInUser?.email ||
    currentEmail ||
    '',
  phone: storedProviderSettings.phone || signedInUser?.phone || '',
  gender: storedProviderSettings.gender || signedInUser?.gender || '',
  organization: storedProviderSettings.organization || signedInUser?.organization || '',
  department: storedProviderSettings.department || signedInUser?.department || '',
  position: storedProviderSettings.position || signedInUser?.position || '',
  license:
    storedProviderSettings.license ||
    signedInUser?.license ||
    signedInUser?.staffId ||
    ''
};

if (settingsProfileName) {
  settingsProfileName.textContent = providerData.fullName || '';
}

if (settingsProfileEmail) {
  settingsProfileEmail.textContent = providerData.email || '';
}

if (settingsProfileDepartment) {
  settingsProfileDepartment.textContent = providerData.department || '';
}

if (settingsProfileAvatar) {
  settingsProfileAvatar.src = getAvatarByGender(providerData.gender);
}

if (providerFullname) {
  providerFullname.value = providerData.fullName || '';
}

if (providerEmail) {
  providerEmail.value = providerData.email || '';
}

if (providerPhone) {
  providerPhone.value = providerData.phone || '';
}

if (providerGender) {
  providerGender.value = providerData.gender || '';
}

if (providerOrganization) {
  providerOrganization.value = providerData.organization || '';
}

if (providerDepartment) {
  providerDepartment.value = providerData.department || '';
}

if (providerPosition) {
  providerPosition.value = providerData.position || '';
}

if (providerLicense) {
  providerLicense.value = providerData.license || '';
}

if (providerGender) {
  providerGender.addEventListener('change', () => {
    if (settingsProfileAvatar) {
      settingsProfileAvatar.src = getAvatarByGender(providerGender.value);
    }
  });
}

const assignedPatientsTotal = Object.keys(getStoredPatients()).length;

if (settingsAssignedPatientsCount) {
  settingsAssignedPatientsCount.textContent = formatPatientCount(assignedPatientsTotal);
}

if (providerSettingsForm) {
  providerSettingsForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const updatedProviderSettings = {
      fullName: providerFullname ? providerFullname.value.trim() : providerData.fullName,
      email: providerEmail ? providerEmail.value.trim() : providerData.email,
      phone: providerPhone ? providerPhone.value.trim() : providerData.phone,
      gender: providerGender ? providerGender.value : providerData.gender,
      organization: providerOrganization ? providerOrganization.value.trim() : providerData.organization,
      department: providerDepartment ? providerDepartment.value.trim() : providerData.department,
      position: providerPosition ? providerPosition.value.trim() : providerData.position,
      license: providerLicense ? providerLicense.value.trim() : providerData.license
    };

    localStorage.setItem('echozyProviderSettings', JSON.stringify(updatedProviderSettings));

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
        fullName: updatedProviderSettings.fullName,
        email: updatedProviderSettings.email,
        phone: updatedProviderSettings.phone,
        gender: updatedProviderSettings.gender,
        organization: updatedProviderSettings.organization,
        department: updatedProviderSettings.department,
        position: updatedProviderSettings.position,
        license: updatedProviderSettings.license,
        updatedAt: new Date().toISOString()
      };
      saveStoredUsers(users);
    }

    const updatedSession = {
      ...storedSession,
      role: currentRole,
      userId: currentUserId,
      fullName: updatedProviderSettings.fullName,
      email: updatedProviderSettings.email
    };

    localStorage.setItem('echozySession', JSON.stringify(updatedSession));

    alert('Settings updated successfully.');

    window.location.href =
      `settings-provider.html?role=${encodeURIComponent(currentRole)}&userId=${encodeURIComponent(currentUserId)}&name=${encodeURIComponent(updatedProviderSettings.fullName)}`;
  });
}