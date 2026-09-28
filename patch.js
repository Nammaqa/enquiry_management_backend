const fs = require('fs');

let content = fs.readFileSync('src/controllers/assignmentresponse.controller.js', 'utf8');

// Replace createAssignmentResponse logic to support JSON
content = content.replace(
  /const form = new Formidable\(\{[\s\S]*?const submissionNotes = fields\.submissionNotes \? fields\.submissionNotes\[0\] : null;/m,
  `let assignmentId, batchId, submissionNotes, filesArray = [];
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      const form = new Formidable({
        multiples: true,
        maxFileSize: 10 * 1024 * 1024,
        keepExtensions: true
      });

      const [fields, files] = await form.parse(req);

      assignmentId = fields.assignmentId ? fields.assignmentId[0] : null;
      batchId = fields.batchId ? fields.batchId[0] : null;
      submissionNotes = fields.submissionNotes ? fields.submissionNotes[0] : null;

      const uploadedFiles = files.submissionFiles || [];
      filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    } else {
      assignmentId = req.body.assignmentId;
      batchId = req.body.batchId;
      submissionNotes = req.body.submissionNotes;
      // files are empty for json
    }
`
);

// Remove the now-redundant uploadedFiles normalization from later in the function
content = content.replace(
  /\/\/ Normalise files to an array \(formidable can return a single object or an array\)[\s\S]*?const filesArray = Array\.isArray\(uploadedFiles\) \? uploadedFiles : \[uploadedFiles\];/m,
  `// filesArray is already prepared`
);


// Replace updateStudentSubmission logic to support JSON
content = content.replace(
  /const form = new Formidable\(\{[\s\S]*?const submissionNotes = fields\.submissionNotes \? fields\.submissionNotes\[0\] : null;/m,
  `let submissionNotes, filesArray = [];
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      const form = new Formidable({
        multiples: true,
        maxFileSize: 10 * 1024 * 1024,
        keepExtensions: true
      });

      const [fields, files] = await form.parse(req);
      submissionNotes = fields.submissionNotes ? fields.submissionNotes[0] : null;

      const uploadedFiles = files.submissionFiles || [];
      filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    } else {
      submissionNotes = req.body.submissionNotes;
    }`
);

// Remove the now-redundant uploadedFiles normalization from later in update function
content = content.replace(
  /const uploadedFiles = files\.submissionFiles \|\| \[\];\s*const filesArray = Array\.isArray\(uploadedFiles\) \? uploadedFiles : \[uploadedFiles\];/m,
  `// filesArray is already prepared`
);

// Append getAllResponses
const newFunction = `

/**
 * GET All Assignment Responses (Instructors/Admins)
 * GET /api/assignment-responses?assignmentId=X&batchId=Y
 */
exports.getAllResponses = async (req, res) => {
  try {
    const { assignmentId, batchId } = req.query;

    const where = {};
    if (assignmentId) where.assignmentId = assignmentId;
    if (batchId) where.batchId = batchId;

    const submissions = await AssignmentResponse.findAll({
      where,
      include: [
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'description', 'dueDate']
        },
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'code']
        },
        {
          model: Enquiry,
          as: 'enquiry',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['submittedOn', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    console.error('Error in getAllResponses:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
`;

content += newFunction;
fs.writeFileSync('src/controllers/assignmentresponse.controller.js', content, 'utf8');
console.log('Done patch');
