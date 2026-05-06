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
      subjectPayments = [], // Array of {subjectId, amountPaid}
      transaction_id
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
      const totalCost = costAfterDiscount;  // Package cost already includes GST
      const balance = totalCost - amountPaid;

      if (billing) {
        // ACCUMULATE the new payment with existing amount paid
        const newTotalAmountPaid = parseFloat((parseFloat(billing.amountPaid) + parseFloat(amountPaid)).toFixed(2));
        const newBalance = parseFloat((totalCost - newTotalAmountPaid).toFixed(2));

        billing.packageCost = packageCost;
        billing.amountPaid = newTotalAmountPaid;
        billing.discount = finalDiscount;
        billing.gst = gstPercentage;
        billing.gstAmount = parseFloat(gstAmount.toFixed(2));
        billing.balance = newBalance;
        billing.packageType = 'package';
        if (transaction_id !== undefined) {
          billing.transaction_id = transaction_id;
        }
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
          transaction_id,
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
      const totalCost = costAfterDiscount;  // Package cost already includes GST
      const balance = totalCost - totalAmountPaid;

      if (billing) {
        // ACCUMULATE the new payment with existing amount paid
        const newTotalAmountPaidIndividual = parseFloat((parseFloat(billing.amountPaid) + parseFloat(totalAmountPaid)).toFixed(2));
        const newBalanceIndividual = parseFloat((totalCost - newTotalAmountPaidIndividual).toFixed(2));

        billing.packageCost = parseFloat(totalPackageCost.toFixed(2));
        billing.amountPaid = newTotalAmountPaidIndividual;
        billing.discount = finalDiscount;
        billing.gst = gstPercentage;
        billing.gstAmount = parseFloat(gstAmount.toFixed(2));
        billing.balance = newBalanceIndividual;
        billing.packageType = 'individual';
        if (transaction_id !== undefined) {
          billing.transaction_id = transaction_id;
        }
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
          transaction_id,
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


// exports.updateBilling = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { 
//       packageCost, 
//       amountPaid, 
//       discount, 
//       gst,
//       packageType,
//       subjectIds = [],
//       subjectPayments = [] // Array of {subjectId, amountPaid}
//     } = req.body;

//     // Find billing record
//     const billing = await Billing.findByPk(id);
//     if (!billing) {
//       return res.status(404).json({ message: 'Billing not found' });
//     }

//     // Validate amountPaid
//     if (amountPaid === undefined) {
//       return res.status(400).json({ message: 'Amount paid is required' });
//     }

//     // Use provided values or fall back to existing database values
//     const finalPackageCost = packageCost !== undefined ? packageCost : billing.packageCost;
//     const finalDiscount = discount !== undefined ? discount : billing.discount;
//     const finalGst = gst !== undefined ? gst : billing.gst;
//     const finalPackageType = packageType !== undefined ? packageType : billing.packageType;

//     // CASE 1: Package-based billing
//     if (finalPackageType === 'package') {
//       const costAfterDiscount = parseFloat(finalPackageCost) - parseFloat(finalDiscount);
//       // GST calculation - using the fixed formula for inclusive pricing
//       const gstAmount = costAfterDiscount > 0 ? 
//         parseFloat((costAfterDiscount * (parseFloat(finalGst) / (100 + parseFloat(finalGst)))).toFixed(2)) : 0;
//       const totalCost = costAfterDiscount;

//       // ACCUMULATE the new payment with existing amount paid
//       const newTotalAmountPaid = parseFloat((parseFloat(billing.amountPaid) + parseFloat(amountPaid)).toFixed(2));
//       let newBalance = parseFloat((totalCost - newTotalAmountPaid).toFixed(2));

//       // Cap balance at 0 (no negative balances)
//       if (newBalance < 0) {
//         newBalance = 0;
//       }

//       await billing.update({
//         packageCost: finalPackageCost,
//         amountPaid: newTotalAmountPaid,
//         discount: finalDiscount,
//         gst: finalGst,
//         gstAmount: gstAmount,
//         balance: newBalance,
//         packageType: 'package',
//         subjectIds: null,
//         subjectWiseBreakdown: null,
//       });

//       return res.status(200).json({
//         message: 'Billing updated successfully',
//         billing: await Billing.findByPk(id),
//       });
//     }

//     // CASE 2: Individual subjects billing
//     else if (finalPackageType === 'individual') {
//       const subjectIdsToUse = subjectIds && subjectIds.length > 0 ? subjectIds : billing.subjectIds;

//       if (!subjectIdsToUse || subjectIdsToUse.length === 0) {
//         return res.status(400).json({ message: 'Subject IDs are required for individual billing' });
//       }

//       // Fetch all subjects to get their fees
//       const subjects = await Subject.findAll({
//         where: { id: subjectIdsToUse }
//       });

//       if (subjects.length === 0) {
//         return res.status(404).json({ message: 'No subjects found' });
//       }

//       // Build subject-wise breakdown with accumulated payments
//       const breakdown = subjects.map(subject => {
//         const newSubjectPayment = subjectPayments.find(p => p.subjectId === subject.id) || {};
//         const fee = parseFloat(subject.fees) || 0;
//         const newPaymentAmount = parseFloat(newSubjectPayment.amountPaid) || 0;

//         // Find existing paid amount for this subject from breakdown
//         const existingBreakdown = billing.subjectWiseBreakdown || [];
//         const existingPaid = existingBreakdown.find(b => b.subjectId === subject.id)?.paid || 0;

//         // Accumulate payments
//         const totalPaid = parseFloat((existingPaid + newPaymentAmount).toFixed(2));
//         let subBalance = fee - totalPaid;
//         if (subBalance < 0) {
//           subBalance = 0;
//         }

//         return {
//           subjectId: subject.id,
//           subjectName: subject.name,
//           fee: fee,
//           paid: totalPaid,
//           balance: subBalance
//         };
//       });

//       // Calculate totals
//       const totalPackageCost = breakdown.reduce((sum, b) => sum + b.fee, 0);
//       const totalAmountPaidSum = breakdown.reduce((sum, b) => sum + b.paid, 0);
//       const costAfterDiscount = parseFloat(totalPackageCost) - parseFloat(finalDiscount);

//       // GST calculation - using the fixed formula for inclusive pricing
//       const gstAmount = costAfterDiscount > 0 ? 
//         parseFloat((costAfterDiscount * (parseFloat(finalGst) / (100 + parseFloat(finalGst)))).toFixed(2)) : 0;
//       const totalCost = costAfterDiscount;

//       let balance = parseFloat((totalCost - totalAmountPaidSum).toFixed(2));
//       if (balance < 0) {
//         balance = 0;
//       }

//       await billing.update({
//         packageCost: parseFloat(totalPackageCost.toFixed(2)),
//         amountPaid: parseFloat(totalAmountPaidSum.toFixed(2)),
//         discount: finalDiscount,
//         gst: finalGst,
//         gstAmount: gstAmount,
//         balance: balance,
//         packageType: 'individual',
//         subjectIds: subjectIdsToUse,
//         subjectWiseBreakdown: breakdown,
//       });

//       return res.status(200).json({
//         message: 'Billing updated successfully',
//         billing: await Billing.findByPk(id),
//       });
//     }

//     return res.status(400).json({ message: 'Invalid packageType in billing record' });

//   } catch (error) {
//     console.error('Billing Update Error:', error);
//     res.status(500).json({ 
//       message: 'Server error',
//       error: error.message 
//     });
//   }
// };
exports.updateBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      packageCost,
      amountPaid,
      discount,
      gst,
      gstAmount,
      balance,
      transaction_id,
    } = req.body;

    const billing = await Billing.findByPk(id);
    if (!billing) {
      return res.status(404).json({ message: 'Billing not found' });
    }
    console.log('beofre paid ',amountPaid)
    // Direct update — no calculations, no accumulation, just set what comes in
    await billing.update({
      packageCost: packageCost !== undefined ? packageCost : billing.packageCost,
      amountPaid: amountPaid !== undefined ? amountPaid : billing.amountPaid,
      discount: discount !== undefined ? discount : billing.discount,
      gst: gst !== undefined ? gst : billing.gst,
      gstAmount: gstAmount !== undefined ? gstAmount : billing.gstAmount,
      balance: balance !== undefined ? balance : billing.balance,
      transaction_id: transaction_id !== undefined ? transaction_id : billing.transaction_id,
    });
    
    console.log('updated amount paid',billing.amountPaid)
    return res.status(200).json({
      message: 'Billing updated successfully 2',
      billing: await Billing.findByPk(id),
    });

  } catch (error) {
    console.error('Billing Update Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
