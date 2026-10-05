const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Organization = require('./models/Organization');
const Membership = require('./models/Membership');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Comment = require('./models/Comment');
const AuditLog = require('./models/AuditLog');
const Notification = require('./models/Notification');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tasknest');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Membership.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await AuditLog.deleteMany({});
    await Notification.deleteMany({});

    console.log('Cleared existing database records.');

    // 1. Create Users
    const owner = await User.create({
      name: 'Alex Owner',
      email: 'owner@test.com',
      password: '123456',
    });

    const admin = await User.create({
      name: 'Sam Admin',
      email: 'admin@test.com',
      password: '123456',
    });

    const member = await User.create({
      name: 'Morgan Member',
      email: 'member@test.com',
      password: '123456',
    });

    const viewer = await User.create({
      name: 'Jordan Viewer',
      email: 'viewer@test.com',
      password: '123456',
    });

    console.log('Created 4 users: owner, admin, member, viewer (password: 123456)');

    // 2. Create Organizations
    const orgA = await Organization.create({
      name: 'Company A',
      createdBy: owner._id,
    });

    const orgB = await Organization.create({
      name: 'Company B',
      createdBy: admin._id,
    });

    console.log('Created 2 organizations: Company A, Company B');

    // 3. Create Memberships
    // Company A memberships
    await Membership.create({ user: owner._id, organization: orgA._id, role: 'OWNER' });
    await Membership.create({ user: admin._id, organization: orgA._id, role: 'ADMIN' });
    await Membership.create({ user: member._id, organization: orgA._id, role: 'MEMBER' });
    await Membership.create({ user: viewer._id, organization: orgA._id, role: 'VIEWER' });

    // Company B memberships (user in both orgs with different roles)
    await Membership.create({ user: admin._id, organization: orgB._id, role: 'OWNER' });
    await Membership.create({ user: owner._id, organization: orgB._id, role: 'ADMIN' });
    await Membership.create({ user: member._id, organization: orgB._id, role: 'VIEWER' });

    console.log('Created memberships (member@test.com is MEMBER in Company A, VIEWER in Company B)');

    // 4. Create Projects
    const project1 = await Project.create({
      name: 'Website Redesign',
      description: 'Modernizing corporate portal with React and Tailwind CSS',
      organization: orgA._id,
      createdBy: owner._id,
    });

    const project2 = await Project.create({
      name: 'Mobile App Dev',
      description: 'Cross-platform mobile application for real-time task tracking',
      organization: orgA._id,
      createdBy: admin._id,
    });

    const project3 = await Project.create({
      name: 'Backend API Microservices',
      description: 'High-throughput Node.js microservices architecture',
      organization: orgB._id,
      createdBy: admin._id,
    });

    console.log('Created 3 projects across Company A and Company B');

    // 5. Create 20 Sample Tasks across projects, statuses, and priorities
    const usersList = [owner._id, admin._id, member._id, viewer._id];
    const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const priorities = ['LOW', 'MEDIUM', 'HIGH'];

    const taskTitles = [
      'Design hero section wireframes',
      'Implement JWT authentication middleware',
      'Set up MongoDB indexes for 100k tasks',
      'Create Kanban drag-and-drop board',
      'Configure Socket.IO real-time event rooms',
      'Build task search and filter bar',
      'Write comprehensive unit & integration tests',
      'Audit log tracking for RBAC actions',
      'Notification bell dropdown component',
      'Setup dark mode palette and design tokens',
      'Optimize database queries with .lean()',
      'Implement organization switcher',
      'Add multi-tenant server validation',
      'Configure node-cron hourly deadline checks',
      'Deploy backend to production server',
      'Mobile responsive sidebar navigation',
      'Refactor state management with React hooks',
      'Add user avatar upload and profile settings',
      'Write README documentation & index strategy',
      'Perform security vulnerability audit',
    ];

    const tasksCreated = [];

    for (let i = 0; i < taskTitles.length; i++) {
      const isCompanyB = i >= 16;
      const targetOrg = isCompanyB ? orgB._id : orgA._id;
      const targetProj = isCompanyB ? project3._id : i % 2 === 0 ? project1._id : project2._id;
      const status = statuses[i % statuses.length];
      const priority = priorities[i % priorities.length];
      const assignee = i % 5 === 0 ? null : usersList[i % usersList.length];

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + ((i % 7) - 2)); // Some past, some upcoming

      const task = await Task.create({
        title: taskTitles[i],
        description: `Detailed task description for ${taskTitles[i]}. Ensure performance and accessibility standard compliance.`,
        status,
        priority,
        assignee,
        dueDate,
        labels: i % 2 === 0 ? ['frontend', 'ui'] : ['backend', 'database', 'security'],
        attachments: i % 3 === 0 ? [{ filename: 'spec.pdf', url: 'https://example.com/spec.pdf' }] : [],
        project: targetProj,
        organization: targetOrg,
        createdBy: owner._id,
      });

      tasksCreated.push(task);
    }

    console.log(`Created ${tasksCreated.length} sample tasks.`);

    // 6. Create sample comments
    const sampleComment = await Comment.create({
      task: tasksCreated[0]._id,
      user: admin._id,
      text: 'Great progress on this! @member@test.com please check the updated wireframes.',
      mentions: [member._id],
    });

    await Comment.create({
      task: tasksCreated[0]._id,
      user: member._id,
      text: 'Will review and report back by end of day.',
      mentions: [],
    });

    console.log('Created sample comments with @mentions');

    // 7. Create sample Audit Logs
    await AuditLog.create({
      user: owner._id,
      organization: orgA._id,
      action: 'TASK_CREATE',
      entity: 'TASK',
      entityId: tasksCreated[0]._id,
      newValue: { title: tasksCreated[0].title, status: tasksCreated[0].status },
    });

    await AuditLog.create({
      user: admin._id,
      organization: orgA._id,
      action: 'TASK_STATUS_CHANGE',
      entity: 'TASK',
      entityId: tasksCreated[0]._id,
      oldValue: { status: 'TODO' },
      newValue: { status: 'IN_PROGRESS' },
    });

    console.log('Created sample audit log records.');

    // 8. Create sample Notification
    await Notification.create({
      user: member._id,
      organization: orgA._id,
      type: 'MENTION',
      message: `${admin.name} mentioned you in a comment on task "${tasksCreated[0].title}"`,
      entityId: tasksCreated[0]._id,
      read: false,
    });

    console.log('Created sample notification.');

    console.log('\n=======================================');
    console.log('SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Users:');
    console.log(' - owner@test.com / 123456  (Owner in Company A, Admin in Company B)');
    console.log(' - admin@test.com / 123456  (Admin in Company A, Owner in Company B)');
    console.log(' - member@test.com / 123456 (Member in Company A, Viewer in Company B)');
    console.log(' - viewer@test.com / 123456 (Viewer in Company A)');
    console.log('=======================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
