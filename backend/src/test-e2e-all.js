const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { checkDeadlines } = require('./services/cronService');
const Task = require('./models/Task');
const User = require('./models/User');
const Organization = require('./models/Organization');

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

const results = [];

function recordResult(category, testName, isPass, details = '') {
  results.push({ category, testName, status: isPass ? 'PASS' : 'FAIL', details });
  const icon = isPass ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] [${category}] ${testName} ${details ? `(${details})` : ''}`);
}

async function runFullCheck() {
  console.log('\n======================================================================');
  console.log('       TASKNEST COMPLETE E2E SUITE VERIFICATION REPORT');
  console.log('======================================================================\n');
  const baseUrl = 'http://localhost:5000/api';

  try {
    // 1. Authenticate users
    const ownerRes = await request(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'owner@test.com', password: '123456' });
    const ownerToken = ownerRes.data.token;
    const ownerUser = ownerRes.data;

    const adminRes = await request(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'admin@test.com', password: '123456' });
    const adminToken = adminRes.data.token;

    const memberRes = await request(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'member@test.com', password: '123456' });
    const memberToken = memberRes.data.token;
    const memberUser = memberRes.data;

    const viewerRes = await request(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { email: 'viewer@test.com', password: '123456' });
    const viewerToken = viewerRes.data.token;

    const orgsRes = await request(`${baseUrl}/organizations`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const companyA = orgsRes.data.find((o) => o.name === 'Company A');
    const orgId = companyA._id;

    const projsRes = await request(`${baseUrl}/projects?organizationId=${orgId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}`, 'x-organization-id': orgId },
    });
    const projA = projsRes.data[0];

    // -------------------------------------------------------------------
    // ITEM 1: NOTIFICATIONS VERIFICATION
    // -------------------------------------------------------------------
    console.log('--- ITEM 1: Notifications Verification ---');

    // 1a. Task assigned notification
    const newTaskAssignedRes = await request(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
      },
    }, {
      title: 'Task Assigned Notification Test',
      assignee: memberUser._id,
      projectId: projA._id,
      organizationId: orgId,
    });

    const notifMemberRes1 = await request(`${baseUrl}/notifications`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}`, 'x-organization-id': orgId },
    });
    const hasTaskAssignedNotif = (notifMemberRes1.data.notifications || []).some(
      (n) => n.type === 'TASK_ASSIGNED'
    );
    recordResult('1. Notifications', 'Task Assigned Notification Created', hasTaskAssignedNotif);

    // 1b. @mention in comment notification
    await request(`${baseUrl}/tasks/${newTaskAssignedRes.data._id}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
      },
    }, { text: `Please review @${memberUser.email}` });

    const notifMemberRes2 = await request(`${baseUrl}/notifications`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}`, 'x-organization-id': orgId },
    });
    const hasMentionNotif = (notifMemberRes2.data.notifications || []).some(
      (n) => n.type === 'MENTION'
    );
    recordResult('1. Notifications', '@mention in Comment Notification Created', hasMentionNotif);

    // 1c. Task status change notification
    await request(`${baseUrl}/tasks/${newTaskAssignedRes.data._id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
      },
    }, { status: 'IN_PROGRESS' });

    const notifMemberRes3 = await request(`${baseUrl}/notifications`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}`, 'x-organization-id': orgId },
    });
    const hasStatusNotif = (notifMemberRes3.data.notifications || []).some(
      (n) => n.type === 'STATUS_CHANGE'
    );
    recordResult('1. Notifications', 'Status Change Notification Created', hasStatusNotif);

    // 1d. Added to organization notification
    // Register temporary user and add to org
    const tempEmail = `testuser_${Date.now()}@test.com`;
    const tempRegRes = await request(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { name: 'Temp User', email: tempEmail, password: '123456' });
    const tempToken = tempRegRes.data.token;

    await request(`${baseUrl}/organizations/${orgId}/members`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'x-organization-id': orgId,
        'Content-Type': 'application/json',
      },
    }, { email: tempEmail, role: 'MEMBER' });

    const notifTempRes = await request(`${baseUrl}/notifications`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tempToken}`, 'x-organization-id': orgId },
    });
    const hasOrgAddedNotif = (notifTempRes.data.notifications || []).some(
      (n) => n.type === 'ORG_ADDED'
    );
    recordResult('1. Notifications', 'Added to Organization Notification Created', hasOrgAddedNotif);

    // 1e. Deadline approaching notification (trigger cron check manually)
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tasknest');
    const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
    await Task.create({
      title: 'Imminent Deadline Task Test',
      organization: orgId,
      project: projA._id,
      assignee: memberUser._id,
      createdBy: ownerUser._id,
      dueDate: tomorrow,
      status: 'TODO',
      deadlineNotified: false,
    });

    const cronCount = await checkDeadlines(null);
    const notifMemberRes4 = await request(`${baseUrl}/notifications`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}`, 'x-organization-id': orgId },
    });
    const hasDeadlineNotif = (notifMemberRes4.data.notifications || []).some(
      (n) => n.type === 'DEADLINE_APPROACHING'
    );
    recordResult('1. Notifications', 'Deadline Approaching Notification Created (Cron triggered)', hasDeadlineNotif, `Sent: ${cronCount}`);

    // -------------------------------------------------------------------
    // ITEM 2: GET /api/audit-logs VERIFICATION
    // -------------------------------------------------------------------
    console.log('\n--- ITEM 2: GET /api/audit-logs Verification ---');

    const auditFilterRes = await request(
      `${baseUrl}/audit-logs?organizationId=${orgId}&action=TASK_STATUS_CHANGE&entity=TASK&page=1&limit=10`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${ownerToken}`, 'x-organization-id': orgId },
      }
    );
    const hasAuditFilters =
      auditFilterRes.status === 200 &&
      Array.isArray(auditFilterRes.data.logs) &&
      auditFilterRes.data.pagination &&
      typeof auditFilterRes.data.pagination.total === 'number';
    recordResult('2. Audit Logs', 'GET /api/audit-logs supports filters & pagination', hasAuditFilters, `Total: ${auditFilterRes.data.pagination?.total}`);

    const memberAuditAccessRes = await request(`${baseUrl}/audit-logs?organizationId=${orgId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${memberToken}`, 'x-organization-id': orgId },
    });
    recordResult('2. Audit Logs', 'GET /api/audit-logs returns 403 for MEMBER', memberAuditAccessRes.status === 403, `Status: ${memberAuditAccessRes.status}`);

    // -------------------------------------------------------------------
    // ITEM 3: GET /api/tasks ADVANCED SEARCH VERIFICATION
    // -------------------------------------------------------------------
    console.log('\n--- ITEM 3: GET /api/tasks Advanced Search Verification ---');

    const tasksFilterRes = await request(
      `${baseUrl}/tasks?organizationId=${orgId}&status=IN_PROGRESS&priority=HIGH,MEDIUM&search=Task&page=1&limit=5`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${ownerToken}`, 'x-organization-id': orgId },
      }
    );
    const hasTasksFilters =
      tasksFilterRes.status === 200 &&
      Array.isArray(tasksFilterRes.data.tasks) &&
      tasksFilterRes.data.pagination &&
      typeof tasksFilterRes.data.pagination.total === 'number' &&
      typeof tasksFilterRes.data.pagination.page === 'number' &&
      typeof tasksFilterRes.data.pagination.limit === 'number';
    recordResult('3. Tasks Search', 'GET /api/tasks supports combined filters, text search & pagination', hasTasksFilters, `Total: ${tasksFilterRes.data.pagination?.total}`);

    // -------------------------------------------------------------------
    // ITEM 4: VIEWER PERMISSIONS VERIFICATION
    // -------------------------------------------------------------------
    console.log('\n--- ITEM 4: VIEWER Permissions Verification ---');

    const viewerCreateRes = await request(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${viewerToken}`, 'x-organization-id': orgId, 'Content-Type': 'application/json' },
    }, { title: 'Viewer Task', projectId: projA._id, organizationId: orgId });
    recordResult('4. VIEWER Permissions', 'VIEWER cannot create task (403)', viewerCreateRes.status === 403, `Status: ${viewerCreateRes.status}`);

    const viewerEditRes = await request(`${baseUrl}/tasks/${newTaskAssignedRes.data._id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${viewerToken}`, 'x-organization-id': orgId, 'Content-Type': 'application/json' },
    }, { title: 'Viewer Edit' });
    recordResult('4. VIEWER Permissions', 'VIEWER cannot edit task (403)', viewerEditRes.status === 403, `Status: ${viewerEditRes.status}`);

    const viewerDeleteRes = await request(`${baseUrl}/tasks/${newTaskAssignedRes.data._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${viewerToken}`, 'x-organization-id': orgId },
    });
    recordResult('4. VIEWER Permissions', 'VIEWER cannot delete task (403)', viewerDeleteRes.status === 403, `Status: ${viewerDeleteRes.status}`);

    const viewerCommentRes = await request(`${baseUrl}/tasks/${newTaskAssignedRes.data._id}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${viewerToken}`, 'x-organization-id': orgId, 'Content-Type': 'application/json' },
    }, { text: 'Viewer Comment' });
    recordResult('4. VIEWER Permissions', 'VIEWER cannot comment (403)', viewerCommentRes.status === 403, `Status: ${viewerCommentRes.status}`);

    // -------------------------------------------------------------------
    // ITEM 5: README.md INDEXING STRATEGY VERIFICATION
    // -------------------------------------------------------------------
    console.log('\n--- ITEM 5: README.md Indexing Strategy Verification ---');

    const fs = require('fs');
    const path = require('path');
    const readmePath = path.join(__dirname, '../../README.md');
    const readmeContent = fs.readFileSync(readmePath, 'utf8');

    const hasIndexingSection =
      readmeContent.includes('Indexing Strategy') &&
      readmeContent.includes('Membership') &&
      readmeContent.includes('Task') &&
      readmeContent.includes('AuditLog') &&
      readmeContent.includes('Notification');

    recordResult('5. Documentation', 'README.md contains detailed Indexing Strategy section', hasIndexingSection);

    // -------------------------------------------------------------------
    // SUMMARY REPORT
    // -------------------------------------------------------------------
    console.log('\n======================================================================');
    console.log('                     E2E FINAL SUMMARY TABLE');
    console.log('======================================================================');
    const totalCount = results.length;
    const passedCount = results.filter((r) => r.status === 'PASS').length;
    const failedCount = results.filter((r) => r.status === 'FAIL').length;

    results.forEach((r, idx) => {
      console.log(`${idx + 1}. [${r.status}] [${r.category}] ${r.testName}`);
    });

    console.log('----------------------------------------------------------------------');
    console.log(`TOTAL TESTS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
    console.log('======================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Fatal E2E runner error:', err);
    process.exit(1);
  }
}

runFullCheck();
