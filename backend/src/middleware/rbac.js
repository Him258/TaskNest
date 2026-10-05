const Membership = require('../models/Membership');
const Task = require('../models/Task');
const Project = require('../models/Project');

const ROLE_HIERARCHY = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
};

/**
 * requireOrgRole Middleware
 * @param {Array<string>|string} allowedRoles - Allowed roles, e.g. ['ADMIN', 'OWNER'] or 'MEMBER'
 */
const requireOrgRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // 1. Resolve Organization ID
      let orgId =
        req.headers['x-organization-id'] ||
        req.query.organizationId ||
        req.query.organization ||
        req.body.organizationId ||
        req.body.organization;

      // Check URL route params
      if (!orgId) {
        if (req.params.orgId) orgId = req.params.orgId;
        else if (req.params.organizationId) orgId = req.params.organizationId;
        else if (req.baseUrl.includes('/organizations') && req.params.id) {
          orgId = req.params.id;
        }
      }

      // If orgId is still not found and route has task or project ID, look up entity to get organization
      if (!orgId) {
        if (req.params.id) {
          if (req.baseUrl.includes('/tasks') || req.baseUrl.includes('/comments')) {
            const task = await Task.findById(req.params.id).select('organization assignee').lean();
            if (task) {
              orgId = task.organization.toString();
              req.targetTask = task; // attach for downstream checks if needed
            }
          } else if (req.baseUrl.includes('/projects')) {
            const project = await Project.findById(req.params.id).select('organization').lean();
            if (project) {
              orgId = project.organization.toString();
              req.targetProject = project;
            }
          }
        }
      }

      if (!orgId) {
        return res.status(400).json({ message: 'Organization context (x-organization-id) is required' });
      }

      // 2. Query Membership in DB on EVERY request!
      const membership = await Membership.findOne({
        user: req.user._id,
        organization: orgId,
      }).lean();

      if (!membership) {
        return res.status(403).json({ message: 'Forbidden: You do not belong to this organization' });
      }

      // Attach membership & org info to req
      req.membership = membership;
      req.orgRole = membership.role;
      req.organizationId = orgId;

      // 3. Check permissions if specified
      if (allowedRoles && allowedRoles.length > 0) {
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

        // Check if current user's role is sufficient
        const userRoleLevel = ROLE_HIERARCHY[membership.role] || 0;
        const requiredRoleLevel = Math.min(...rolesArray.map((r) => ROLE_HIERARCHY[r] || 99));

        if (userRoleLevel < requiredRoleLevel) {
          return res.status(403).json({ message: 'Forbidden: Insufficient organization role' });
        }
      }

      next();
    } catch (error) {
      console.error('requireOrgRole error:', error);
      return res.status(500).json({ message: 'Server error checking organization membership' });
    }
  };
};

module.exports = { requireOrgRole, ROLE_HIERARCHY };
