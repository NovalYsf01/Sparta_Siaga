const http = require('http');

let mockUser = null;

const ssoServer = http.createServer((req, res) => {
  if (req.url === '/v1/sso/me' && req.method === 'GET') {
    const auth = req.headers.authorization;
    if (auth === 'Bearer valid_token' && mockUser) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { user: mockUser } }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'unauthorized' }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

ssoServer.listen(10000, async () => {
  console.log('Mock SSO server running on port 10000');
  
  await runTests();
  
  ssoServer.close();
});

const API_BASE = 'http://localhost:3004/api';

async function fetchApi(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let body;
  try {
    body = await res.json();
  } catch (e) {
    body = await res.text();
  }
  return { status: res.status, body };
}

async function runTests() {
  console.log('--- RUNNING QA MATRIX ---');

  // A1. Unauth GET
  console.log('Test: Unauthenticated GET /incidents');
  let res = await fetchApi('/incidents');
  console.log(`Expected: 401, Actual: ${res.status}`);

  // A2. Unauth POST
  console.log('Test: Unauthenticated POST /incidents');
  res = await fetchApi('/incidents', { method: 'POST', body: JSON.stringify({}) });
  console.log(`Expected: 401, Actual: ${res.status}`);
  
  // A4. Auth GET (HO Admin)
  mockUser = { id: 'u1', name: 'Admin', role: 'ho_admin', branch: 'HO' };
  console.log('Test: Authenticated GET /incidents (HO Admin)');
  res = await fetchApi('/incidents', { headers: { Cookie: 'siaga_session=valid_token' } });
  console.log(`Expected: 200, Actual: ${res.status}, Type: ${Array.isArray(res.body.data)}`);

  // Let's create an incident to test mutations
  console.log('Test: Create Incident (HO Admin)');
  res = await fetchApi('/incidents', {
    method: 'POST',
    headers: { Cookie: 'siaga_session=valid_token', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'TEST-INC-' + Date.now(),
      disasterType: 'earthquake',
      storeId: 'SAT-1111',
      storeName: 'Alfamart Test',
      branch: 'SIDOARJO',
      locationCity: 'Sidoarjo',
      reportOrigin: 'manual',
      tkpType: 'Toko',
      date: '2026-09-30',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'verifying',
      progress: 10,
      fieldPhotos: [],
      timeline: []
    })
  });
  console.log(`Status: ${res.status}`);
  const incidentId = res.body.data?.id;
  console.log(`Created Incident: ${incidentId}`);

  // Get Incident directly (should be protected but let's see)
  console.log('Test: Unauthenticated GET /incidents/' + incidentId);
  res = await fetchApi(`/incidents/${incidentId}`);
  console.log(`Expected: 401, Actual: ${res.status}`);

  // Test: Unauth GET instructions
  console.log('Test: Unauthenticated GET /incidents/' + incidentId + '/instructions');
  res = await fetchApi(`/incidents/${incidentId}/instructions`);
  console.log(`Expected: 401, Actual: ${res.status}`);

  // Branch user acting on their own report
  mockUser = { id: 'u2', name: 'Branch Man', role: 'store_manager', branch: 'SIDOARJO' };
  console.log('Test: Branch user viewing own report');
  res = await fetchApi(`/incidents/${incidentId}`, { headers: { Cookie: 'siaga_session=valid_token' } });
  console.log(`Expected: 200, Actual: ${res.status}`);

  console.log('Test: Branch user creating report for another branch');
  res = await fetchApi('/incidents', {
    method: 'POST',
    headers: { Cookie: 'siaga_session=valid_token', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'TEST-INC-FAKE', disasterType: 'earthquake', storeId: 'SAT-9999', storeName: 'Alfamart Fake', branch: 'JAKARTA', locationCity: 'Jakarta', reportOrigin: 'manual', tkpType: 'Toko', date: '2026-09-30', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'verifying', progress: 10, fieldPhotos: [], timeline: []
    })
  });
  console.log(`Expected: 403, Actual: ${res.status}`);

  console.log('Test: Branch user confirming own report');
  res = await fetchApi(`/incidents/${incidentId}/confirm`, {
    method: 'POST',
    headers: { Cookie: 'siaga_session=valid_token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_damaged: true })
  });
  console.log(`Expected: 200, Actual: ${res.status}`);

  // Branch user acting on ANOTHER branch's report
  mockUser = { id: 'u3', name: 'Other Branch Man', role: 'store_manager', branch: 'JAKARTA' };
  console.log('Test: Branch user viewing OTHER branch report');
  res = await fetchApi(`/incidents/${incidentId}`, { headers: { Cookie: 'siaga_session=valid_token' } });
  console.log(`Expected: 403, Actual: ${res.status}`);
  console.log('Test: Branch user confirming OTHER branch report');
  res = await fetchApi(`/incidents/${incidentId}/confirm`, {
    method: 'POST',
    headers: { Cookie: 'siaga_session=valid_token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_damaged: true })
  });
  console.log(`Expected: 403, Actual: ${res.status}`);

  mockUser = { id: 'u1', name: 'Admin', role: 'ho_admin', branch: 'HO' };
  console.log('Test: HO Admin confirming report');
  res = await fetchApi(`/incidents/${incidentId}/confirm`, {
    method: 'POST',
    headers: { Cookie: 'siaga_session=valid_token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_damaged: true })
  });
  console.log(`Expected: 403, Actual: ${res.status}`);

  // Test: GM HO creating management instruction
  mockUser = { id: 'gm1', name: 'GM', role: 'gm_ho', branch: 'HO' };
  console.log('Test: GM HO creating instruction');
  res = await fetchApi(`/incidents/${incidentId}/instructions`, {
    method: 'POST',
    headers: { Cookie: 'siaga_session=valid_token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction_text: 'Tingkatkan kewaspadaan.' })
  });
  console.log(`Expected: 201, Actual: ${res.status}`);

  // Test: Branch User creating management instruction
  mockUser = { id: 'u2', name: 'Branch Man', role: 'store_manager', branch: 'SIDOARJO' };
  console.log('Test: Branch user creating instruction');
  res = await fetchApi(`/incidents/${incidentId}/instructions`, {
    method: 'POST',
    headers: { Cookie: 'siaga_session=valid_token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction_text: 'Tingkatkan kewaspadaan.' })
  });
  console.log(`Expected: 403, Actual: ${res.status}`);

  // Delete incident
  mockUser = { id: 'u1', name: 'Admin', role: 'ho_admin', branch: 'HO' };
  res = await fetchApi(`/incidents/${incidentId}`, { method: 'DELETE', headers: { Cookie: 'siaga_session=valid_token' } });
  console.log(`Deleted incident: ${res.status}`);
}
