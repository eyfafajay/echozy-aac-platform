const params = new URLSearchParams(window.location.search);
const storedSession = JSON.parse(localStorage.getItem('echozySession') || '{}');

const role = params.get('role') || storedSession.role || 'caregiver';
const userId = params.get('userId') || storedSession.userId || '';
const name = params.get('name') || storedSession.fullName || 'User';
const email = params.get('email') || storedSession.email || '';

const dashboardRoleLabel = document.getElementById('dashboardRoleLabel');
const dashboardGreeting = document.getElementById('dashboardGreeting');
const dashboardSubtext = document.getElementById('dashboardSubtext');

const dashboardNavLink = document.getElementById('dashboardNavLink');
const managePatientsNavLink = document.getElementById('managePatientsNavLink');
const settingsNavLink = document.getElementById('settingsNavLink');
const logoutNavLink = document.getElementById('logoutNavLink');

const dashboardTotalPatients = document.getElementById('dashboardTotalPatients');
const dashboardTotalSessions = document.getElementById('dashboardTotalSessions');
const dashboardActivityLogBody = document.getElementById('dashboardActivityLogBody');

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

function getResolvedUserId() {
  return currentAuthUser?.id || userId || '';
}

function getSharedQuery() {
  return new URLSearchParams({
    role,
    userId: getResolvedUserId(),
    name
  }).toString();
}

const sharedQuery = new URLSearchParams({
  role,
  userId,
  name
}).toString();

if (dashboardRoleLabel) {
  dashboardRoleLabel.textContent =
    role === 'provider'
      ? 'HEALTHCARE PROVIDER DASHBOARD'
      : 'CAREGIVER DASHBOARD';
}

if (dashboardGreeting) {
  dashboardGreeting.textContent =
    role === 'provider'
      ? `Welcome back, ${name}`
      : `Hello, ${name}`;
}

if (dashboardSubtext) {
  dashboardSubtext.textContent =
    role === 'provider'
      ? 'Monitor assigned patients, track rehabilitation progress, and manage communication support from one place.'
      : 'Support your linked patient, manage communication content, and track daily communication progress from one place.';
}

if (dashboardNavLink) {
  dashboardNavLink.href = `dashboard.html?${sharedQuery}`;
}

if (managePatientsNavLink) {
  managePatientsNavLink.href = `manage-patients.html?${sharedQuery}`;
}

if (settingsNavLink) {
  settingsNavLink.href =
    role === 'provider'
      ? `settings-provider.html?${sharedQuery}`
      : `settings-caregiver.html?${sharedQuery}`;
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

  if (userId && userId !== user.id) {
    localStorage.removeItem('echozySession');
    await supabaseClient.auth.signOut();
    throw new Error('Session mismatch detected. Please sign in again.');
  }
}

function refreshNavigationLinks() {
  const refreshedSharedQuery = getSharedQuery();

  if (dashboardNavLink) {
    dashboardNavLink.href = `dashboard.html?${refreshedSharedQuery}`;
  }

  if (managePatientsNavLink) {
    managePatientsNavLink.href = `manage-patients.html?${refreshedSharedQuery}`;
  }

  if (settingsNavLink) {
    settingsNavLink.href =
      role === 'provider'
        ? `settings-provider.html?${refreshedSharedQuery}`
        : `settings-caregiver.html?${refreshedSharedQuery}`;
  }
}

function formatDate(isoString) {
  if (!isoString) return '—';

  return new Date(isoString).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTime(isoString) {
  if (!isoString) return '—';

  return new Date(isoString).toLocaleTimeString('en-MY', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatDurationFromRecord(record) {
  const enteredAt = record.enteredAt ? new Date(record.enteredAt) : null;
  const quitAt = record.quitAt ? new Date(record.quitAt) : null;

  if (!enteredAt || !quitAt) {
    return '—';
  }

  if (Number.isNaN(enteredAt.getTime()) || Number.isNaN(quitAt.getTime())) {
    return '—';
  }

  const diffMs = quitAt - enteredAt;

  if (diffMs <= 0) {
    return '—';
  }

  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} mins`;
}

async function getPatientsForCurrentUser() {
  if (!currentAuthUser) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from('user_patients')
    .select(`
      assigned_at,
      patients (
        *
      )
    `)
    .eq('user_id', currentAuthUser.id)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .map((row) => row.patients)
    .filter(Boolean);
}

async function getSessionEntriesForCurrentUser() {
  const patients = await getPatientsForCurrentUser();

  if (!patients.length) {
    return [];
  }

  const patientMap = new Map(
    patients.map((patient) => [
      patient.id,
      {
        patientName: patient.full_name,
        patientId: patient.id,
        patientStatus: patient.status || 'Inactive',
        patientLanguage: patient.preferred_language || 'English'
      }
    ])
  );

  const patientIds = patients.map((patient) => patient.id);

  const { data, error } = await supabaseClient
    .from('session_logs')
    .select('*')
    .in('patient_id', patientIds)
    .order('entered_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((log) => patientMap.has(log.patient_id))
    .map((log) => {
      const patientInfo = patientMap.get(log.patient_id);

      return {
        patientName: patientInfo?.patientName || 'Unknown Patient',
        patientId: log.patient_id,
        patientStatus: patientInfo?.patientStatus || 'Inactive',
        patientLanguage: patientInfo?.patientLanguage || 'English',
        enteredAt: log.entered_at || '',
        quitAt: log.quit_at || ''
      };
    })
    .sort((a, b) => {
      const aTime = a.quitAt || a.enteredAt || '';
      const bTime = b.quitAt || b.enteredAt || '';
      return new Date(bTime) - new Date(aTime);
    });
}

async function renderDashboardSummary() {
  const patients = await getPatientsForCurrentUser();
  const sessionEntries = await getSessionEntriesForCurrentUser();

  if (dashboardTotalPatients) {
    dashboardTotalPatients.textContent = patients.length;
  }

  if (dashboardTotalSessions) {
    dashboardTotalSessions.textContent = sessionEntries.length;
  }
}

async function renderActivityLog() {
  if (!dashboardActivityLogBody) return;

  const sessionEntries = await getSessionEntriesForCurrentUser();

  if (!sessionEntries.length) {
    dashboardActivityLogBody.innerHTML = `
      <tr>
        <td colspan="7">No session activity yet.</td>
      </tr>
    `;
    return;
  }

  dashboardActivityLogBody.innerHTML = sessionEntries.map((entry) => {
    const sessionDate = entry.enteredAt || entry.quitAt;

    const patientDashboardQuery = new URLSearchParams({
      patient: entry.patientId,
      name: entry.patientName,
      status: entry.patientStatus || 'Active',
      language: entry.patientLanguage || 'English',
      role,
      userId: getResolvedUserId(),
      user: name
    }).toString();

    return `
      <tr>
        <td>${entry.patientName}</td>
        <td>
          <a
            href="patient-dashboard.html?${patientDashboardQuery}"
            class="patient-dashboard-link-btn"
            title="View Patient Dashboard"
            aria-label="View Patient Dashboard"
          >↗</a>
        </td>
        <td>${entry.patientId}</td>
        <td>${formatDate(sessionDate)}</td>
        <td>${formatTime(entry.enteredAt)}</td>
        <td>${formatTime(entry.quitAt)}</td>
        <td>${formatDurationFromRecord(entry)}</td>
      </tr>
    `;
  }).join('');
}

async function initializeDashboard() {
  try {
    await loadCurrentAuthUser();
    refreshNavigationLinks();
    await renderDashboardSummary();
    await renderActivityLog();
  } catch (error) {
    console.error(error);

    if (dashboardTotalPatients) {
      dashboardTotalPatients.textContent = '0';
    }

    if (dashboardTotalSessions) {
      dashboardTotalSessions.textContent = '0';
    }

    if (dashboardActivityLogBody) {
      dashboardActivityLogBody.innerHTML = `
        <tr>
          <td colspan="7">Unable to load dashboard activity right now.</td>
        </tr>
      `;
    }
  }
}

initializeDashboard();