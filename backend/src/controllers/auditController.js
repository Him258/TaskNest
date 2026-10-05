const AuditLog = require('../models/AuditLog');

// @desc    Get Audit Logs (ADMIN / OWNER only)
// @route   GET /api/audit-logs
// @access  Private (ADMIN, OWNER)
const getAuditLogs = async (req, res) => {
  try {
    const orgId = req.query.organizationId || req.organizationId;
    if (!orgId) {
      return res.status(400).json({ message: 'organizationId is required' });
    }

    const query = { organization: orgId };

    // Action filter
    if (req.query.action) {
      query.action = req.query.action;
    }

    // Entity filter
    if (req.query.entity) {
      query.entity = req.query.entity;
    }

    // User filter
    if (req.query.user || req.query.userId) {
      query.user = req.query.user || req.query.userId;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    // Search filter (searches action or entity)
    const search = req.query.search || req.query.q;
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { entity: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const total = await AuditLog.countDocuments(query);

    const logs = await AuditLog.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAuditLogs };
