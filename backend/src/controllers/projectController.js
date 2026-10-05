const Project = require('../models/Project');
const { logAudit } = require('../utils/auditLogger');

// @desc    Create a project
// @route   POST /api/projects
// @access  Private (MEMBER, ADMIN, OWNER)
const createProject = async (req, res) => {
  try {
    const { name, description, organizationId } = req.body;
    const orgId = organizationId || req.organizationId;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = await Project.create({
      name,
      description: description || '',
      organization: orgId,
      createdBy: req.user._id,
    });

    await logAudit({
      user: req.user._id,
      organization: orgId,
      action: 'PROJECT_CREATE',
      entity: 'PROJECT',
      entityId: project._id,
      newValue: { name: project.name, description: project.description },
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all projects for an organization
// @route   GET /api/projects
// @access  Private (Org Members)
const getProjects = async (req, res) => {
  try {
    const orgId = req.query.organizationId || req.organizationId;
    if (!orgId) {
      return res.status(400).json({ message: 'organizationId query parameter is required' });
    }

    const projects = await Project.find({ organization: orgId })
      .select('name description organization createdBy createdAt updatedAt')
      .populate('createdBy', 'name email')
      .lean();

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private (Org Members)
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
};
