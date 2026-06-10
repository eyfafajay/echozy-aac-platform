const pageParams = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const currentRole = pageParams.get('role') || storedSession.role || 'provider';
const currentUserId = pageParams.get('userId') || storedSession.userId || '';
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

const providerCurrentPasswordInput = document.getElementById('provider-current-password');
const providerNewPasswordInput = document.getElementById('provider-new-password');
const providerConfirmPasswordInput = document.getElementById('provider-confirm-password');

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

const PLACEHOLDER_AVATAR = `data:image/svg+xml;utf8,
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="80" fill="%23e8f3fb"/>
  <circle cx="80" cy="60" r="26" fill="%239fc0e7"/>
  <path d="M38 128c8-22 29-34 42-34s34 12 42 34" fill="%239fc0e7"/>
</svg>`;

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

let currentAuthUser = null;
let currentProfile = null;

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

function formatPatientCount(count) {
  return `${count} ${count === 1 ? 'Patient' : 'Patients'}`;
}

function showError(error) {
  console.error(error);
  alert(error?.message || 'Something went wrong. Please try again.');
}

function updateSessionWithProfile(profile, authUser) {
  const updatedSession = {
    ...storedSession,
    role: profile?.role || currentRole,
    userId: authUser?.id || currentUserId,
    fullName: profile?.full_name || currentName,
    email: authUser?.email || currentEmail,
    staffId: profile?.license || storedSession.staffId || ''
  };

  localStorage.setItem('echozySession', JSON.stringify(updatedSession));
}

function fillProviderSettings(profile, authUser) {
  const fullName = profile?.full_name || currentName || '';
  const email = authUser?.email || currentEmail || '';
  const phone = profile?.phone || '';
  const gender = profile?.gender || '';
  const organization = profile?.organization || '';
  const department = profile?.department || '';
  const position = profile?.position || '';
  const license = profile?.license || '';

  if (settingsProfileName) {
    settingsProfileName.textContent = fullName;
  }

  if (settingsProfileEmail) {
    settingsProfileEmail.textContent = email;
  }

  if (settingsProfileDepartment) {
    settingsProfileDepartment.textContent = department;
  }

  if (settingsProfileAvatar) {
    settingsProfileAvatar.src = getAvatarByGender(gender);
  }

  if (providerFullname) {
    providerFullname.value = fullName;
  }

  if (providerEmail) {
    providerEmail.value = email;
  }

  if (providerPhone) {
    providerPhone.value = phone;
  }

  if (providerGender) {
    providerGender.value = gender;
  }

  if (providerOrganization) {
    providerOrganization.value = organization;
  }

  if (providerDepartment) {
    providerDepartment.value = department;
  }

  if (providerPosition) {
    providerPosition.value = position;
  }

  if (providerLicense) {
    providerLicense.value = license;
  }
}

async function loadCurrentProviderProfile() {
  if (!supabaseClient) {
    throw new Error('Supabase client is not available. Please load the Supabase CDN before this script.');
  }

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error('No signed-in user found. Please sign in again.');
  }

  currentAuthUser = user;

  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    throw profileError;
  }

  currentProfile = profile;

  if (profile.role !== 'provider') {
    const fallbackQuery = new URLSearchParams({
      role: profile.role || 'caregiver',
      userId: user.id,
      name: profile.full_name || currentName
    }).toString();

    window.location.href = `settings-caregiver.html?${fallbackQuery}`;
    return;
  }

  updateSessionWithProfile(profile, user);
  fillProviderSettings(profile, user);
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

if (logoutNavLink) {
  logoutNavLink.addEventListener('click', async (event) => {
    event.preventDefault();

    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem('echozySession');
      window.location.href = '../../index.html';
    }
  });
}

if (providerSettingsForm) {
  providerSettingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      alert('Supabase client is not available. Please load the Supabase CDN before this script.');
      return;
    }

    if (!currentAuthUser || !currentProfile) {
      alert('Unable to load your profile. Please refresh and try again.');
      return;
    }

    const updatedFullName = providerFullname ? providerFullname.value.trim() : '';
    const updatedEmail = providerEmail ? providerEmail.value.trim() : '';
    const updatedPhone = providerPhone ? providerPhone.value.trim() : '';
    const updatedGender = providerGender ? providerGender.value : '';
    const updatedOrganization = providerOrganization ? providerOrganization.value.trim() : '';
    const updatedDepartment = providerDepartment ? providerDepartment.value.trim() : '';
    const updatedPosition = providerPosition ? providerPosition.value.trim() : '';
    const updatedLicense = providerLicense ? providerLicense.value.trim() : '';

    if (!updatedFullName || !updatedEmail) {
      alert('Full name and email address are required.');
      return;
    }

    const currentPassword = providerCurrentPasswordInput ? providerCurrentPasswordInput.value : '';
    const newPassword = providerNewPasswordInput ? providerNewPasswordInput.value : '';
    const confirmPassword = providerConfirmPasswordInput ? providerConfirmPasswordInput.value : '';

    if ((currentPassword || newPassword || confirmPassword) && !currentPassword) {
      alert('Please enter your current password to change your password.');
      return;
    }

    if ((currentPassword || newPassword || confirmPassword) && !newPassword) {
      alert('Please enter your new password.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      alert('New password and confirm password do not match.');
      return;
    }

    try {
      const { error: profileUpdateError } = await supabaseClient
        .from('profiles')
        .update({
          full_name: updatedFullName,
          phone: updatedPhone || null,
          gender: updatedGender || null,
          organization: updatedOrganization || null,
          department: updatedDepartment || null,
          position: updatedPosition || null,
          license: updatedLicense || null
        })
        .eq('id', currentAuthUser.id);

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      if (updatedEmail !== (currentAuthUser.email || '')) {
        const { error: emailUpdateError } = await supabaseClient.auth.updateUser({
          email: updatedEmail
        });

        if (emailUpdateError) {
          throw emailUpdateError;
        }
      }

      if (newPassword) {
        const { error: passwordUpdateError } = await supabaseClient.auth.updateUser({
          password: newPassword
        });

        if (passwordUpdateError) {
          throw passwordUpdateError;
        }
      }

      const refreshedProfile = {
        ...currentProfile,
        full_name: updatedFullName,
        phone: updatedPhone || null,
        gender: updatedGender || null,
        organization: updatedOrganization || null,
        department: updatedDepartment || null,
        position: updatedPosition || null,
        license: updatedLicense || null
      };

      const refreshedAuthUser = {
        ...currentAuthUser,
        email: updatedEmail
      };

      currentProfile = refreshedProfile;
      currentAuthUser = refreshedAuthUser;

      updateSessionWithProfile(refreshedProfile, refreshedAuthUser);
      fillProviderSettings(refreshedProfile, refreshedAuthUser);

      if (providerCurrentPasswordInput) providerCurrentPasswordInput.value = '';
      if (providerNewPasswordInput) providerNewPasswordInput.value = '';
      if (providerConfirmPasswordInput) providerConfirmPasswordInput.value = '';

      alert('Settings updated successfully.');

      const refreshedQuery = new URLSearchParams({
        role: refreshedProfile.role || currentRole,
        userId: currentAuthUser.id,
        name: refreshedProfile.full_name || updatedFullName
      }).toString();

      window.history.replaceState({}, '', `settings-provider.html?${refreshedQuery}`);
    } catch (error) {
      showError(error);
    }
  });
}

loadCurrentProviderProfile().catch((error) => {
  showError(error);
});