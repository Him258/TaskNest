const AuditLog = require('../models/AuditLog');

/**
 * Log an action to AuditLog collection
 */
const logAudit = async ({ user, organization, action, entity, entityId, oldValue = null, newValue = null }) => {
  try {
    if (!user || !organization || !action || !entity || !entityId) {
      console.warn('logAudit missing required parameters:', { user, organization, action, entity, entityId });
      return null;
    }
    const log = await AuditLog.create({
      user,
      organization,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
    });
    return log;
  } catch (error) {
    console.error('Failed to log audit:', error.message);
    return null;
  }
};

module.exports = { logAudit };
