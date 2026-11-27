const db = require('../models');

const Doubt = db.Doubt;
const Batch = db.Batch;
const Enquiry = db.Enquiry;
const Subject = db.Subject;
const User = db.User;

async function isStudentEnrolledInBatch(enquiryId, batchId) {
  const student = await Enquiry.findByPk(enquiryId, {
    attributes: ['id', 'batchId'],
    include: [
      {
        model: Batch,
        as: 'enrolledBatches',
        where: { id: batchId },
        required: false,
        through: { attributes: [] },
        attributes: ['id'],
      },
    ],
  });
  if (!student) return false;
  if (Number(student.batchId) === Number(batchId)) return true;
  return Array.isArray(student.enrolledBatches) && student.enrolledBatches.length > 0;
}

const doubtIncludes = [
  { model: Subject, as: 'subject', attributes: ['id', 'name', 'code'] },
  { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
  { model: User, as: 'responder', attributes: ['id', 'name', 'email'] },
  { model: Enquiry, as: 'enquiry', attributes: ['id', 'name', 'email'] },
];

exports.getBatchDoubts = async (req, res) => {
  try {
    const batchId = parseInt(req.params.batchId, 10);
    if (!batchId || Number.isNaN(batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batchId' });
    }

    const batch = await Batch.findByPk(batchId, { attributes: ['id', 'name', 'code', 'instructorId'] });
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const where = { batchId };
    if (req.isEnquiryStudent && req.enquiry?.enquiryId) {
      const enrolled = await isStudentEnrolledInBatch(req.enquiry.enquiryId, batchId);
      if (!enrolled) {
        return res.status(403).json({ success: false, message: 'You are not enrolled in this batch' });
      }
      where.enquiryId = req.enquiry.enquiryId;
    }

    const doubts = await Doubt.findAll({
      where,
      include: doubtIncludes,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      count: doubts.length,
      data: doubts,
    });
  } catch (error) {
    console.error('Error in getBatchDoubts:', error);
    return res.status(500).json({ success: false, message: 'Failed to load doubts', error: error.message });
  }
};

exports.createDoubt = async (req, res) => {
  try {
    const enquiryId = req.enquiry?.enquiryId;
    if (!enquiryId) {
      return res.status(401).json({ success: false, message: 'Student authentication required' });
    }

    const { batchId, title, topic, description } = req.body || {};
    const parsedBatchId = parseInt(batchId, 10);
    const cleanTitle = String(title || '').trim();

    if (!parsedBatchId || Number.isNaN(parsedBatchId) || !cleanTitle) {
      return res.status(400).json({ success: false, message: 'batchId and title are required' });
    }

    const batch = await Batch.findByPk(parsedBatchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const enrolled = await isStudentEnrolledInBatch(enquiryId, parsedBatchId);
    if (!enrolled) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this batch' });
    }

    const created = await Doubt.create({
      batchId: parsedBatchId,
      subjectId: batch.subjectId || null,
      enquiryId,
      instructorId: batch.instructorId || batch.createdBy || null,
      title: cleanTitle,
      topic: topic ? String(topic).trim() : null,
      description: description ? String(description).trim() : null,
      status: 'open',
    });

    created.ticketCode = `TKT-${100 + created.id}`;
    await created.save();

    const withIncludes = await Doubt.findByPk(created.id, { include: doubtIncludes });

    return res.status(201).json({
      success: true,
      message: 'Doubt submitted successfully',
      data: withIncludes,
    });
  } catch (error) {
    console.error('Error in createDoubt:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit doubt', error: error.message });
  }
};

exports.answerDoubt = async (req, res) => {
  try {
    const { id } = req.params;
    const { answer, status } = req.body || {};
    const responderId = req.user?.userId || req.user?.id;
    const role = String(req.user?.role || '').toUpperCase();

    if (!responderId || !['ADMIN', 'COUNSELLOR', 'INSTRUCTOR'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Only instructors or staff can answer doubts' });
    }

    const doubt = await Doubt.findByPk(id);
    if (!doubt) {
      return res.status(404).json({ success: false, message: 'Doubt not found' });
    }

    const cleanAnswer = String(answer || '').trim();
    if (!cleanAnswer) {
      return res.status(400).json({ success: false, message: 'answer is required' });
    }

    await doubt.update({
      answer: cleanAnswer,
      answeredBy: responderId,
      answeredAt: new Date(),
      status: status === 'resolved' ? 'resolved' : 'answered',
    });

    const updated = await Doubt.findByPk(id, { include: doubtIncludes });
    return res.status(200).json({ success: true, message: 'Doubt answered successfully', data: updated });
  } catch (error) {
    console.error('Error in answerDoubt:', error);
    return res.status(500).json({ success: false, message: 'Failed to answer doubt', error: error.message });
  }
};

exports.resolveDoubt = async (req, res) => {
  try {
    const { id } = req.params;
    const doubt = await Doubt.findByPk(id);
    if (!doubt) {
      return res.status(404).json({ success: false, message: 'Doubt not found' });
    }

    if (req.isEnquiryStudent && Number(doubt.enquiryId) !== Number(req.enquiry?.enquiryId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await doubt.update({ status: 'resolved' });
    const updated = await Doubt.findByPk(id, { include: doubtIncludes });
    return res.status(200).json({ success: true, message: 'Doubt marked as resolved', data: updated });
  } catch (error) {
    console.error('Error in resolveDoubt:', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve doubt', error: error.message });
  }
};
