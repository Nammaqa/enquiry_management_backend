const { Billing, Enquiry, Subject } = require('../models');

/**
 * CREATE or UPDATE Billing (COMBINED API - Package or Individual Subjects)
 */
exports.createOrUpdateBilling = async (req, res) => {
  try {
    const { 
      enquiryId, 
      packageCost, 
      amountPaid, 
      discount, 
      gst,
      packageType = 'package',
      subjectIds = [],
      subjectPayments = [] // Array of {subjectId, amountPaid}
    } = req.body;

    // Validate required fields
    if (!enquiryId) {
      return res.status(400).json({ message: 'Enquiry ID is required' });
    }

    // Check if enquiry exists
    const enquiry = await Enquiry.findByPk(enquiryId);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    let billing = await Billing.findOne({ where: { enquiryId } });

    // CASE 1: Package-based billing
    if (packageType === 'package') {
      if (packageCost === undefined) {
        return res.status(400).json({ message: 'Package cost is required' });
      }

      if (amountPaid === undefined) {
        return res.status(400).json({ message: 'Amount paid is required' });
      }

      const finalDiscount = discount || 0;
      const gstPercentage = gst || 0;
      
      const costAfterDiscount = packageCost - finalDiscount;
      const gstAmount = costAfterDiscount * (gstPercentage / 100);
      const totalCost = costAfterDiscount + gstAmount;
      const balance = totalCost - amountPaid;

      if (billing) {
        billing.packageCost = packageCost;
        billing.amountPaid = amountPaid;
        billing.discount = finalDiscount;
        billing.gst = gstPercentage;
        billing.gstAmount = parseFloat(gstAmount.toFixed(2));
        billing.balance = parseFloat(balance.toFixed(2));
        billing.packageType = 'package';
        billing.subjectIds = null;
        billing.subjectWiseBreakdown = null;
        await billing.save();

        return res.status(200).json({
          message: 'Billing updated successfully',
          billing,
        });
      } else {
        billing = await Billing.create({
          enquiryId,
          packageCost,
          amountPaid,
          discount: finalDiscount,
          gst: gstPercentage,
          gstAmount: parseFloat(gstAmount.toFixed(2)),
          balance: parseFloat(balance.toFixed(2)),
          packageType: 'package',
        });

        return res.status(201).json({
          message: 'Billing created successfully',
          billing,
        });
      }
    }

    // CASE 2: Individual subjects billing
    else if (packageType === 'individual') {
      if (!subjectIds || subjectIds.length === 0) {
        return res.status(400).json({ message: 'Subject IDs are required for individual billing' });
      }

      // Fetch all subjects to get their fees
      const subjects = await Subject.findAll({
        where: { id: subjectIds }
      });

      if (subjects.length === 0) {
        return res.status(404).json({ message: 'No subjects found' });
      }

      // Build subject-wise breakdown
      const breakdown = subjects.map(subject => {
        const subjectPayment = subjectPayments.find(p => p.subjectId === subject.id) || {};
        const fee = parseFloat(subject.fees) || 0;
        const paid = parseFloat(subjectPayment.amountPaid) || 0;
        const subBalance = fee - paid;

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          fee: fee,
          paid: parseFloat(paid.toFixed(2)),
          balance: parseFloat(subBalance.toFixed(2))
        };
      });

      // Calculate totals
      const totalPackageCost = breakdown.reduce((sum, b) => sum + b.fee, 0);
      const totalAmountPaid = breakdown.reduce((sum, b) => sum + b.paid, 0);
      const finalDiscount = discount || 0;
      const gstPercentage = gst || 0;

      const costAfterDiscount = totalPackageCost - finalDiscount;
      const gstAmount = costAfterDiscount * (gstPercentage / 100);
      const totalCost = costAfterDiscount + gstAmount;
      const balance = totalCost - totalAmountPaid;

      if (billing) {
        billing.packageCost = parseFloat(totalPackageCost.toFixed(2));
        billing.amountPaid = parseFloat(totalAmountPaid.toFixed(2));
        billing.discount = finalDiscount;
        billing.gst = gstPercentage;
        billing.gstAmount = parseFloat(gstAmount.toFixed(2));
        billing.balance = parseFloat(balance.toFixed(2));
        billing.packageType = 'individual';
        billing.subjectIds = subjectIds;
        billing.subjectWiseBreakdown = breakdown;
        await billing.save();

        return res.status(200).json({
          message: 'Billing updated successfully',
          billing,
        });
      } else {
        billing = await Billing.create({
          enquiryId,
          packageCost: parseFloat(totalPackageCost.toFixed(2)),
          amountPaid: parseFloat(totalAmountPaid.toFixed(2)),
          discount: finalDiscount,
          gst: gstPercentage,
          gstAmount: parseFloat(gstAmount.toFixed(2)),
          balance: parseFloat(balance.toFixed(2)),
          packageType: 'individual',
          subjectIds: subjectIds,
          subjectWiseBreakdown: breakdown,
        });

        return res.status(201).json({
          message: 'Billing created successfully',
          billing,
        });
      }
    }

    return res.status(400).json({ message: 'Invalid packageType. Use "package" or "individual"' });

  } catch (error) {
    console.error('Billing Create/Update Error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};

/**
 * GET Billing by Enquiry ID
 */
exports.getBillingByEnquiryId = async (req, res) => {
  try {
    const { enquiryId } = req.params;

    // Check if enquiry exists
    const enquiry = await Enquiry.findByPk(enquiryId);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    const billing = await Billing.findOne({
      where: { enquiryId },
      include: [
        {
          model: require('../models').Enquiry,
          as: 'enquiry',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });

    if (!billing) {
      return res.status(404).json({
        message: 'Billing record not found for this enquiry',
      });
    }

    res.json(billing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET all Billings
 */
exports.getAllBillings = async (req, res) => {
  try {
    const billings = await Billing.findAll({
      include: [
        {
          model: require('../models').Enquiry,
          as: 'enquiry',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(billings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET Billing by ID
 */
exports.getBillingById = async (req, res) => {
  try {
    const billing = await Billing.findByPk(req.params.id, {
      include: [
        {
          model: require('../models').Enquiry,
          as: 'enquiry',
          attributes: ['id', 'name', 'email', 'phone'],
        },
      ],
    });

    if (!billing) {
      return res.status(404).json({
        message: 'Billing not found',
      });
    }

    res.json(billing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * UPDATE Billing by ID (Package or Individual Subjects)
 */
exports.updateBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      packageCost, 
      amountPaid, 
      discount, 
      gst,
      packageType = 'package',
      subjectIds = [],
      subjectPayments = [] // Array of {subjectId, amountPaid}
    } = req.body;

    // Find billing record
    const billing = await Billing.findByPk(id);
    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }

    // CASE 1: Package-based billing
    if (packageType === 'package') {
      if (packageCost === undefined) {
        return res.status(400).json({ message: 'Package cost is required' });
      }

      if (amountPaid === undefined) {
        return res.status(400).json({ message: 'Amount paid is required' });
      }

      const finalDiscount = discount || 0;
      const gstPercentage = gst || 0;
      
      const costAfterDiscount = packageCost - finalDiscount;
      const gstAmount = costAfterDiscount * (gstPercentage / 100);
      const totalCost = costAfterDiscount + gstAmount;
      const balance = totalCost - amountPaid;

      billing.packageCost = packageCost;
      billing.amountPaid = amountPaid;
      billing.discount = finalDiscount;
      billing.gst = gstPercentage;
      billing.gstAmount = parseFloat(gstAmount.toFixed(2));
      billing.balance = parseFloat(balance.toFixed(2));
      billing.packageType = 'package';
      billing.subjectIds = null;
      billing.subjectWiseBreakdown = null;
      await billing.save();

      return res.status(200).json({
        message: 'Billing updated successfully',
        billing,
      });
    }

    // CASE 2: Individual subjects billing
    else if (packageType === 'individual') {
      if (!subjectIds || subjectIds.length === 0) {
        return res.status(400).json({ message: 'Subject IDs are required for individual billing' });
      }

      // Fetch all subjects to get their fees
      const subjects = await Subject.findAll({
        where: { id: subjectIds }
      });

      if (subjects.length === 0) {
        return res.status(404).json({ message: 'No subjects found' });
      }

      // Build subject-wise breakdown
      const breakdown = subjects.map(subject => {
        const subjectPayment = subjectPayments.find(p => p.subjectId === subject.id) || {};
        const fee = parseFloat(subject.fees) || 0;
        const paid = parseFloat(subjectPayment.amountPaid) || 0;
        const subBalance = fee - paid;

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          fee: fee,
          paid: parseFloat(paid.toFixed(2)),
          balance: parseFloat(subBalance.toFixed(2))
        };
      });

      // Calculate totals
      const totalPackageCost = breakdown.reduce((sum, b) => sum + b.fee, 0);
      const totalAmountPaid = breakdown.reduce((sum, b) => sum + b.paid, 0);
      const finalDiscount = discount || 0;
      const gstPercentage = gst || 0;

      const costAfterDiscount = totalPackageCost - finalDiscount;
      const gstAmount = costAfterDiscount * (gstPercentage / 100);
      const totalCost = costAfterDiscount + gstAmount;
      const balance = totalCost - totalAmountPaid;

      billing.packageCost = parseFloat(totalPackageCost.toFixed(2));
      billing.amountPaid = parseFloat(totalAmountPaid.toFixed(2));
      billing.discount = finalDiscount;
      billing.gst = gstPercentage;
      billing.gstAmount = parseFloat(gstAmount.toFixed(2));
      billing.balance = parseFloat(balance.toFixed(2));
      billing.packageType = 'individual';
      billing.subjectIds = subjectIds;
      billing.subjectWiseBreakdown = breakdown;
      await billing.save();

      return res.status(200).json({
        message: 'Billing updated successfully',
        billing,
      });
    }

    return res.status(400).json({ message: 'Invalid packageType. Use "package" or "individual"' });

  } catch (error) {
    console.error('Billing Update Error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};

/**
 * DELETE Billing (ADMIN ONLY)
 */
exports.deleteBilling = async (req, res) => {
  try {
    const billing = await Billing.findByPk(req.params.id);

    if (!billing) {
      return res.status(404).json({
        message: 'Billing not found',
      });
    }

    await billing.destroy();

    res.json({
      message: 'Billing deleted successfully',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
