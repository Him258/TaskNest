const Organization = require('../models/Organization');
const Membership = require('../models/Membership');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');
const { createNotification } = require('../utils/notifications');

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private
const createOrganization = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const org = await Organization.create({
      name,
      createdBy: req.user._id,
    });

    // Create OWNER membership
    const membership = await Membership.create({
      user: req.user._id,
      organization: org._id,
      role: 'OWNER',
    });

    // Log audit
    await logAudit({
      user: req.user._id,
      organization: org._id,
      action: 'ORGANIZATION_CREATE',
      entity: 'ORGANIZATION',
      entityId: org._id,
      newValue: { name: org.name },
    });

    res.status(201).json({
      ...org.toObject(),
      role: membership.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all organizations user belongs to
// @route   GET /api/organizations
// @access  Private
const getUserOrganizations = async (req, res) => {
  try {
    const memberships = await Membership.find({ user: req.user._id })
      .populate({
        path: 'organization',
        select: 'name createdBy createdAt updatedAt',
      })
      .lean();

    const organizations = memberships
      .filter((m) => m.organization)
      .map((m) => ({
        _id: m.organization._id,
        name: m.organization.name,
        createdBy: m.organization.createdBy,
        createdAt: m.organization.createdAt,
        role: m.role,
      }));

    res.json(organizations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get members of an organization
// @route   GET /api/organizations/:id/members
// @access  Private (Org Members)
const getOrgMembers = async (req, res) => {
  try {
    const orgId = req.params.id;

    const memberships = await Membership.find({ organization: orgId })
      .populate('user', 'name email')
      .lean();

    const members = memberships.map((m) => ({
      membershipId: m._id,
      user: m.user,
      role: m.role,
      createdAt: m.createdAt,
    }));

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to organization
// @route   POST /api/organizations/:id/members
// @access  Private (ADMIN / OWNER)
const addOrgMember = async (req, res) => {
  try {
    const orgId = req.params.id;
    const { email, userId, role = 'MEMBER' } = req.body;

    let targetUser;
    if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase() });
    } else if (userId) {
      targetUser = await User.findById(userId);
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if membership exists
    let membership = await Membership.findOne({ user: targetUser._id, organization: orgId });
    if (membership) {
      return res.status(400).json({ message: 'User is already a member of this organization' });
    }

    // Only OWNER can assign OWNER role
    if (role === 'OWNER' && req.orgRole !== 'OWNER') {
      return res.status(403).json({ message: 'Only an organization OWNER can assign OWNER role' });
    }

    membership = await Membership.create({
      user: targetUser._id,
      organization: orgId,
      role: role.toUpperCase(),
    });

    const org = await Organization.findById(orgId).select('name').lean();

    // Log audit
    await logAudit({
      user: req.user._id,
      organization: orgId,
      action: 'MEMBER_ADD',
      entity: 'MEMBER',
      entityId: targetUser._id,
      newValue: { userId: targetUser._id, role: membership.role },
    });

    // Notify added user
    await createNotification({
      user: targetUser._id,
      organization: orgId,
      type: 'ORG_ADDED',
      message: `You were added to organization "${org ? org.name : 'Organization'}" as ${membership.role}`,
      entityId: orgId,
      io: req.app.get('io'),
    });

    const populated = await Membership.findById(membership._id).populate('user', 'name email').lean();

    res.status(201).json({
      membershipId: populated._id,
      user: populated.user,
      role: populated.role,
      createdAt: populated.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove member from organization
// @route   DELETE /api/organizations/:id/members/:userId
// @access  Private (ADMIN / OWNER)
const removeOrgMember = async (req, res) => {
  try {
    const orgId = req.params.id;
    const { userId } = req.params;

    const membership = await Membership.findOne({ user: userId, organization: orgId });
    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    // Admin cannot remove an organization OWNER
    if (membership.role === 'OWNER' && req.orgRole !== 'OWNER') {
      return res.status(403).json({ message: 'Cannot remove an organization OWNER' });
    }

    await Membership.findByIdAndDelete(membership._id);

    // Log audit
    await logAudit({
      user: req.user._id,
      organization: orgId,
      action: 'MEMBER_REMOVE',
      entity: 'MEMBER',
      entityId: userId,
      oldValue: { userId, role: membership.role },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update member role in organization
// @route   PATCH /api/organizations/:id/members/:userId
// @access  Private (ADMIN / OWNER)
const updateMemberRole = async (req, res) => {
  try {
    const orgId = req.params.id;
    const { userId } = req.params;
    const { role } = req.body;

    if (!['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const membership = await Membership.findOne({ user: userId, organization: orgId });
    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    // Admin cannot demote or change role of an organization OWNER
    if (membership.role === 'OWNER' && req.orgRole !== 'OWNER') {
      return res.status(403).json({ message: 'Cannot demote or change role of an organization OWNER' });
    }

    // Only OWNER can promote someone to OWNER
    if (role === 'OWNER' && req.orgRole !== 'OWNER') {
      return res.status(403).json({ message: 'Only an organization OWNER can assign OWNER role' });
    }

    const oldRole = membership.role;
    membership.role = role;
    await membership.save();

    await logAudit({
      user: req.user._id,
      organization: orgId,
      action: 'MEMBER_ROLE_UPDATE',
      entity: 'MEMBER',
      entityId: userId,
      oldValue: { role: oldRole },
      newValue: { role },
    });

    res.json({ message: 'Role updated successfully', role: membership.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrganization,
  getUserOrganizations,
  getOrgMembers,
  addOrgMember,
  removeOrgMember,
  updateMemberRole,
};
