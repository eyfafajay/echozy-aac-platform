const pageParams = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const currentRole = pageParams.get('role') || storedSession.role || 'caregiver';
const currentUserId = pageParams.get('userId') || storedSession.userId || '';
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

const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmPasswordInput = document.getElementById('confirm-password');

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

function fillCaregiverSettings(profile, authUser) {
  const fullName = profile?.full_name || currentName || '';
  const email = authUser?.email || currentEmail || '';
  const phone = profile?.phone || '';
  const gender = profile?.gender || '';

  if (settingsProfileName) {
    settingsProfileName.textContent = fullName;
  }

  if (settingsProfileEmail) {
    settingsProfileEmail.textContent = email;
  }

  if (settingsProfileAvatar) {
    settingsProfileAvatar.src = getAvatarByGender(gender);
  }

  if (caregiverFullname) {
    caregiverFullname.value = fullName;
  }

  if (caregiverEmail) {
    caregiverEmail.value = email;
  }

  if (caregiverPhone) {
    caregiverPhone.value = phone;
  }

  if (caregiverGender) {
    caregiverGender.value = gender;
  }
}

async function loadCurrentCaregiverProfile() {
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

  if (profile.role === 'provider') {
    const providerQuery = new URLSearchParams({
      role: profile.role,
      userId: user.id,
      name: profile.full_name || currentName
    }).toString();

    window.location.href = `settings-provider.html?${providerQuery}`;
    return;
  }

  updateSessionWithProfile(profile, user);
  fillCaregiverSettings(profile, user);
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

if (caregiverSettingsForm) {
  caregiverSettingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      alert('Supabase client is not available. Please load the Supabase CDN before this script.');
      return;
    }

    if (!currentAuthUser || !currentProfile) {
      alert('Unable to load your profile. Please refresh and try again.');
      return;
    }

    const updatedFullName = caregiverFullname ? caregiverFullname.value.trim() : '';
    const updatedEmail = caregiverEmail ? caregiverEmail.value.trim() : '';
    const updatedPhone = caregiverPhone ? caregiverPhone.value.trim() : '';
    const updatedGender = caregiverGender ? caregiverGender.value : '';

    if (!updatedFullName || !updatedEmail) {
      alert('Full name and email address are required.');
      return;
    }

    const currentPassword = currentPasswordInput ? currentPasswordInput.value : '';
    const newPassword = newPasswordInput ? newPasswordInput.value : '';
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';

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
          gender: updatedGender || null
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
        gender: updatedGender || null
      };

      const refreshedAuthUser = {
        ...currentAuthUser,
        email: updatedEmail
      };

      currentProfile = refreshedProfile;
      currentAuthUser = refreshedAuthUser;

      updateSessionWithProfile(refreshedProfile, refreshedAuthUser);
      fillCaregiverSettings(refreshedProfile, refreshedAuthUser);

      if (currentPasswordInput) currentPasswordInput.value = '';
      if (newPasswordInput) newPasswordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';

      alert('Settings updated successfully.');

      const refreshedQuery = new URLSearchParams({
        role: refreshedProfile.role || currentRole,
        userId: currentAuthUser.id,
        name: refreshedProfile.full_name || updatedFullName
      }).toString();

      window.history.replaceState({}, '', `settings-caregiver.html?${refreshedQuery}`);
    } catch (error) {
      showError(error);
    }
  });
}

loadCurrentCaregiverProfile().catch((error) => {
  showError(error);
});