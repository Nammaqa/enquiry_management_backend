const { Billing, Enquiry } = require('../models');

/**
 * CREATE or UPDATE Billing (COMBINED API)
 */
exports.createOrUpdateBilling = async (req, res) => {
  try {
    const { enquiryId, packageCost, amountPaid, discount } = req.body;

    // Validate required fields
    if (!enquiryId) {
      return res.status(400).json({ message: 'Enquiry ID is required' });
    }

    if (packageCost === undefined) {
      return res.status(400).json({ message: 'Package cost is required' });
    }

    if (amountPaid === undefined) {
      return res.status(400).json({ message: 'Amount paid is required' });
    }

    // Check if enquiry exists
    const enquiry = await Enquiry.findByPk(enquiryId);
    if (!enquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  

    // Calculate balance: packageCost - discount - amountPaid
    const finalDiscount = discount || 0;
    const balance = packageCost - finalDiscount - amountPaid;

    // Check if billing record already exists for this enquiry
    let billing = await Billing.findOne({ where: { enquiryId } });

    if (billing) {
      // Update existing billing
      billing.packageCost = packageCost;
      billing.amountPaid = amountPaid;
      billing.discount = finalDiscount;
      billing.balance = balance;
      await billing.save();

      res.status(200).json({
        message: 'Billing updated successfully',
        billing,
      });
    } else {
      // Create new billing
      billing = await Billing.create({
        enquiryId,
        packageCost,
        amountPaid,
        discount: finalDiscount,
        balance,
      });

      res.status(201).json({
        message: 'Billing created successfully',
        billing,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
