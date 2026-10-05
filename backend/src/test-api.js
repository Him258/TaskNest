const http = require('http');

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   TASKNEST FULL API & PERMISSION SUITE VERIFICATION');
  console.log('======================================================\n');
  const baseUrl = 'http://localhost:5000/api';
  let totalPassed = 0;
  let totalFailed = 0;

  function assertTest(name, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${name} ${details ? `(${details})` : ''}`);
      totalPassed++;
    } else {
      console.log(`[FAIL] ${name} ${details ? `(${details})` : ''}`);
      totalFailed++;
    }
  }

  try {
    // 1. Authenticate all 4 roles
    console.log('--- 1. Authenticating Roles ---');
    const ownerRes = await request(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'owner@test.com', password: '123456' });
    const ownerToken = ownerRes.data.token;
    assertTest('Owner Login', ownerRes.status === 200, `User: ${ownerRes.data.name}`);

    const adminRes = await request(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'admin@test.com', password: '123456' });
    const adminToken = adminRes.data.token;
    assertTest('Admin Login', adminRes.status === 200, `User: ${adminRes.data.name}`);

    const memberRes = await request(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'member@test.com', password: '123456' });
    const memberToken = memberRes.data.token;
    assertTest('Member Login', memberRes.status === 200, `User: ${memberRes.data.name}`);

    const viewerRes = await request(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'viewer@test.com', password: '123456' });
    const viewerToken = viewerRes.data.token;
    assertTest('Viewer Login', viewerRes.status === 200, `User: ${viewerRes.data.name}`);

    // Fetch Orgs & Projects
    const orgsRes = await request(`${baseUrl}/organizations`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const companyA = orgsRes.data.find((o) => o.name === 'Company A');
    const companyB = orgsRes.data.find((o) => o.name === 'Company B');
    const orgAId = companyA._id;
    const orgBId = companyB ? companyB._id : null;

    const projRes = await request(`${baseUrl}/projects?organizationId=${orgAId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}`, 'x-organization-id': orgAId },
    });
    const projA = projRes.data[0];

    const tasksRes = await request(`${baseUrl}/tasks?organizationId=${orgAId}&page=1&limit=50`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}`, 'x-organization-id': orgAId },
    });
    const tasksA = tasksRes.data.tasks || [];
    const sampleTaskA = tasksA[0];

    // Find a task in Company A NOT assigned to member
    const unassignedOrOtherTask = tasksA.find(
      (t) => (!t.assignee || (t.assignee._id || t.assignee) !== memberRes.data._id) &&
             (!t.createdBy || (t.createdBy._id || t.createdBy) !== memberRes.data._id)
    ) || sampleTaskA;

    console.log('\n--- 2. VIEWER Permission Tests ---');
    // VIEWER: POST /api/tasks -> 403
    const viewerCreateTaskRes = await request(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        'x-organization-id': orgAId,
        'Content-Type': 'application/json',
      },
    }, { title: 'Viewer Task Attempt', projectId: projA._id, organizationId: orgAId });
    assertTest(
      'VIEWER: POST /api/tasks -> 403',
      viewerCreateTaskRes.status === 403,
      `Status: ${viewerCreateTaskRes.status}`
    );

    // VIEWER: POST /api/tasks/:id/comments -> 403
    const viewerCommentRes = await request(`${baseUrl}/tasks/${sampleTaskA._id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${viewerToken}`,
        'x-organization-id': orgAId,
        'Content-Type': 'application/json',
      },
    }, { text: 'Unauthorized Viewer Comment' });
    assertTest(
      'VIEWER: POST /api/tasks/:id/comments -> 403',
      viewerCommentRes.status === 403,
      `Status: ${viewerCommentRes.status}`
    );

    console.log('\n--- 3. MEMBER Permission Tests ---');
    // MEMBER: PUT on a task not assigned to them -> 403
    const memberPutUnassignedRes = await request(`${baseUrl}/tasks/${unassignedOrOtherTask._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'x-organization-id': orgAId,
        'Content-Type': 'application/json',
      },
    }, { title: 'Member Malicious Update' });
    assertTest(
      'MEMBER: PUT on unassigned task -> 403',
      memberPutUnassignedRes.status === 403,
      `Status: ${memberPutUnassignedRes.status}`
    );

    // MEMBER: DELETE task -> 403
    const memberDeleteTaskRes = await request(`${baseUrl}/tasks/${sampleTaskA._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberToken}`, 'x-organization-id': orgAId },
    });
    assertTest(
      'MEMBER: DELETE task -> 403',
      memberDeleteTaskRes.status === 403,
      `Status: ${memberDeleteTaskRes.status}`
    );

    // MEMBER: POST /api/projects -> 403
    const memberCreateProjRes = await request(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${memberToken}`,
        'x-organization-id': orgAId,
        'Content-Type': 'application/json',
      },
    }, { name: 'Unauthorized Member Project', organizationId: orgAId });
    assertTest(
      'MEMBER: POST /api/projects -> 403',
      memberCreateProjRes.status === 403,
      `Status: ${memberCreateProjRes.status}`
    );

    // MEMBER: GET /api/audit-logs -> 403
    const memberAuditRes = await request(`${baseUrl}/audit-logs?organizationId=${orgAId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}`, 'x-organization-id': orgAId },
    });
    assertTest(
      'MEMBER: GET /api/audit-logs -> 403',
      memberAuditRes.status === 403,
      `Status: ${memberAuditRes.status}`
    );

    console.log('\n--- 4. ADMIN Permission Tests ---');
    // ADMIN: DELETE task -> 200
    // Create a temporary task to be safely deleted by admin
    const tempTaskRes = await request(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-organization-id': orgAId,
        'Content-Type': 'application/json',
      },
    }, { title: 'Task to be deleted by Admin', projectId: projA._id, organizationId: orgAId });

    const tempTaskId = tempTaskRes.data._id;
    const adminDeleteTaskRes = await request(`${baseUrl}/tasks/${tempTaskId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-organization-id': orgAId },
    });
    assertTest(
      'ADMIN: DELETE task -> 200',
      adminDeleteTaskRes.status === 200,
      `Status: ${adminDeleteTaskRes.status}`
    );

    console.log('\n--- 5. Tenant Isolation Tests ---');
    // Fetch a task from Company B using owner token (who is in Company B too)
    const companyBOrgsRes = await request(`${baseUrl}/organizations`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const compB = companyBOrgsRes.data.find((o) => o.name === 'Company B');
    
    if (compB) {
      const companyBTasksRes = await request(`${baseUrl}/tasks?organizationId=${compB._id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}`, 'x-organization-id': compB._id },
      });
      const compBTask = (companyBTasksRes.data.tasks || [])[0];

      if (compBTask) {
        // Viewer is NOT in Company B (or Company A user attempting to access Company B task with Company A org context)
        const crossTenantAccessRes = await request(`${baseUrl}/tasks/${compBTask._id}`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${viewerToken}`, 'x-organization-id': orgAId },
        });
        assertTest(
          'Tenant Isolation: Company A user accessing Company B task -> 403/404',
          crossTenantAccessRes.status === 403 || crossTenantAccessRes.status === 404,
          `Status: ${crossTenantAccessRes.status}`
        );
      }
    }

    console.log('\n--- 6. Owner Protection Tests ---');
    // Fetch members of Company A using Admin token
    const ownerUserId = ownerRes.data._id;

    // Admin attempt to remove OWNER -> 403
    const adminRemoveOwnerRes = await request(`${baseUrl}/organizations/${orgAId}/members/${ownerUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}`, 'x-organization-id': orgAId },
    });
    assertTest(
      'Owner Protection: Admin cannot remove OWNER -> 403',
      adminRemoveOwnerRes.status === 403,
      `Status: ${adminRemoveOwnerRes.status}`
    );

    // Admin attempt to demote OWNER -> 403
    const adminDemoteOwnerRes = await request(`${baseUrl}/organizations/${orgAId}/members/${ownerUserId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-organization-id': orgAId,
        'Content-Type': 'application/json',
      },
    }, { role: 'MEMBER' });
    assertTest(
      'Owner Protection: Admin cannot demote OWNER -> 403',
      adminDemoteOwnerRes.status === 403,
      `Status: ${adminDemoteOwnerRes.status}`
    );

    console.log('\n======================================================');
    console.log(` RESULTS: ${totalPassed} PASSED, ${totalFailed} FAILED`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runTests();
