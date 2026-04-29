const bcrypt = require("bcryptjs");
const EmployeeModel = require("../models/employee.model");
const AttachmentService = require("./attachment.service");
const DatabaseUtils = require("../utils/database.utils");

const ADDRESS_TABLE = "tbl_addressdetails";
const ACCOUNT_TABLE = "tbl_accountdetails";

// Entity types must match the ENUM in tbl_attachmentdetails
const ENTITY_TYPE_PROFILE = "profileImage";   // profile image upload
const ENTITY_TYPE_EMPLOYEE = "user";           // general employee attachments (docs etc.)

class EmployeeService {
  /**
   * Create employee — accepts PHP-style nested payload:
   *  addressDetails: { address, cityId, stateId, countryId, postalCode }
   *  bankAccount:    { accountHolder, accountNumber, ifscCode, branch }
   *  profileUrl:     [{ fileName, imageData, imageType }]  (array, matching PHP)
   *  attachments:    [{ fileName, imageData, imageType }]
   */
  static async createEmployee(data) {
    return await DatabaseUtils.executeTransaction(async (connection) => {
      const {
        fullName, gender, dateOfBirth, dateOfJoining, role, employeeType,
        phoneNumber, email, companyName = "", gstNumber = "", password,
        openingbalance = "0", billingaddressId = "",
        // nested (PHP style)
        addressDetails = {},
        bankAccount = {},
        profileUrl = [],      // array like PHP profileUrl
        attachments = [],
      } = data;

      const { address, cityId, stateId, countryId, postalCode } = addressDetails;
      const { accountHolder, accountNumber, ifscCode, branch } = bankAccount;

      // --- Validation ---
      if (!fullName || !gender || !role || !employeeType || !phoneNumber || !password) {
        throw new Error(
          "fullName, gender, role, employeeType, phoneNumber and password are required"
        );
      }
      if (await EmployeeModel.phoneExists(phoneNumber)) {
        throw new Error("Phone number already registered");
      }
      if (email && (await EmployeeModel.emailExists(email))) {
        throw new Error("Email already registered");
      }

      // --- Address ---
      let addressId = null;
      if (address && cityId && stateId && countryId && postalCode) {
        addressId = await DatabaseUtils.insert(ADDRESS_TABLE, {
          address, cityId, stateId, countryId, postalCode,
        });
      }

      // --- Account ---
      let accountId = null;
      if (accountHolder && accountNumber && ifscCode) {
        accountId = await DatabaseUtils.insert(ACCOUNT_TABLE, {
          accountHolder, accountNumber, ifscCode, branch: branch || null,
        });
      }

      // --- Password ---
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // --- Create Employee row ---
      const employeeId = await EmployeeModel.create({
        fullName, gender,
        dateOfBirth: dateOfBirth || null,
        dateOfJoining: dateOfJoining || null,
        role, employeeType, phoneNumber,
        email: email || null,
        addressId, accountId,
        billingaddressId,
        companyName, gstNumber,
        password: hashedPassword,
        openingbalance,
        logincount: "0",
        status: 1,
      });

      // --- Profile Image (PHP sends profileUrl as array) ---
      let profileAttachment = null;
      const profileArr = Array.isArray(profileUrl) ? profileUrl : (profileUrl ? [profileUrl] : []);
      if (profileArr.length > 0 && profileArr[0].imageData) {
        const p = profileArr[0];
        profileAttachment = await AttachmentService.saveAttachment(
          p.imageData,
          p.imageType,
          ENTITY_TYPE_PROFILE,
          p.fileName || null,
          employeeId
        );
      }

      // --- General Attachments ---
      let savedAttachments = [];
      if (attachments && attachments.length > 0) {
        savedAttachments = await AttachmentService.handleMultipleAttachments(
          attachments,
          employeeId,
          ENTITY_TYPE_EMPLOYEE
        );
      }

      return { employeeId, profileAttachment, attachments: savedAttachments };
    });
  }

  /**
   * Update employee — accepts PHP-style nested bankAccount + addressDetails
   */
  static async updateEmployee(id, data) {
    return await DatabaseUtils.executeTransaction(async (connection) => {
      const existing = await EmployeeModel.getById(id);
      if (!existing) throw new Error("Employee not found");

      const {
        fullName, gender, dateOfBirth, dateOfJoining, role, employeeType,
        phoneNumber, email, companyName, gstNumber, openingbalance, billingaddressId,
        // nested (PHP style)
        addressDetails = {},
        bankAccount = {},
        profileUrl = [],    // PHP sends profileUrl as array
        attachments = [],
        password,
      } = data;

      const { address, cityId, stateId, countryId, postalCode } = addressDetails;
      const { accountHolder, accountNumber, ifscCode, branch } = bankAccount;

      if (phoneNumber && (await EmployeeModel.phoneExists(phoneNumber, id))) {
        throw new Error("Phone number already in use");
      }
      if (email && (await EmployeeModel.emailExists(email, id))) {
        throw new Error("Email already in use");
      }

      // --- Update / create address ---
      if (address) {
        if (existing.addressId) {
          await DatabaseUtils.update(
            ADDRESS_TABLE,
            { address, cityId, stateId, countryId, postalCode },
            "id = ?", [existing.addressId]
          );
        } else {
          const newAddressId = await DatabaseUtils.insert(ADDRESS_TABLE, {
            address, cityId, stateId, countryId, postalCode,
          });
          await EmployeeModel.update(id, { addressId: newAddressId });
        }
      }

      // --- Update / create account ---
      if (accountHolder) {
        if (existing.accountId) {
          await DatabaseUtils.update(
            ACCOUNT_TABLE,
            { accountHolder, accountNumber, ifscCode, branch: branch || null },
            "id = ?", [existing.accountId]
          );
        } else {
          const newAccountId = await DatabaseUtils.insert(ACCOUNT_TABLE, {
            accountHolder, accountNumber, ifscCode, branch: branch || null,
          });
          await EmployeeModel.update(id, { accountId: newAccountId });
        }
      }

      // --- Employee core fields ---
      const updatePayload = {};
      const fields = [
        "fullName", "gender", "dateOfBirth", "dateOfJoining", "role",
        "employeeType", "phoneNumber", "email", "companyName", "gstNumber",
        "openingbalance", "billingaddressId",
      ];
      fields.forEach((f) => { if (data[f] !== undefined) updatePayload[f] = data[f]; });

      // Handle password update
      if (password && password.trim()) {
        const salt = await bcrypt.genSalt(10);
        updatePayload.password = await bcrypt.hash(password, salt);
      }

      if (Object.keys(updatePayload).length) {
        await EmployeeModel.update(id, updatePayload);
      }

      // --- Profile image update (PHP sends profileUrl as array) ---
      let profileAttachment = null;
      const profileArr = Array.isArray(profileUrl) ? profileUrl : (profileUrl ? [profileUrl] : []);
      for (const profile of profileArr) {
        if (profile.deleted) {
          const fileName = profile.imageData ? profile.imageData.split('/').pop() : null;
          if (fileName) {
            try { await AttachmentService.deleteAttachment(fileName, ENTITY_TYPE_PROFILE); } catch (e) { }
          }
        } else if (profile.imageData && !/^https?:\/\//.test(profile.imageData)) {
          await AttachmentService.deleteAllEntityAttachments(id, ENTITY_TYPE_PROFILE);
          profileAttachment = await AttachmentService.saveAttachment(
            profile.imageData,
            profile.imageType,
            ENTITY_TYPE_PROFILE,
            profile.fileName || null,
            id
          );
        }
      }

      // --- General attachments ---
      let savedAttachments = [];
      if (attachments && attachments.length > 0) {
        savedAttachments = await AttachmentService.handleMultipleAttachments(
          attachments,
          id,
          ENTITY_TYPE_EMPLOYEE
        );
      }

      return { profileAttachment, attachments: savedAttachments };
    });
  }

  /**
   * Get single employee — returns PHP-compatible structure:
   * { id, name, fullName, bankAccount:{...}, addressDetails:{...},
   *   profileUrl: [...], profileImage, attachments: [...] }
   */
  static async getEmployee(id) {
    const employee = await EmployeeModel.getById(id);
    if (!employee) throw new Error("Employee not found");
    delete employee.password;

    // Fetch profile image
    const profileImages = await AttachmentService.getAttachments(id, ENTITY_TYPE_PROFILE);
    const profileUrl = profileImages.map((p) => ({
      url: p.url, fileName: p.fileName, id: p.id, type: p.type, createdAt: p.createdAt,
    }));

    // Fetch general attachments
    const attachments = await AttachmentService.getAttachments(id, ENTITY_TYPE_EMPLOYEE);

    return {
      id: employee.id,
      name: employee.fullName,
      fullName: employee.fullName,
      status: employee.status,
      gender: employee.gender,
      dateOfBirth: employee.dateOfBirth,
      dateOfJoining: employee.dateOfJoining,
      role: employee.role,
      employeeType: employee.employeeType,
      phoneNumber: employee.phoneNumber,
      email: employee.email,
      companyName: employee.companyName,
      gstNumber: employee.gstNumber,
      openingbalance: employee.openingbalance,
      createdAt: employee.createdAt,
      // Nested address (PHP style)
      addressDetails: {
        id: employee.addressId,
        address: employee.address,
        cityId: employee.cityId,
        stateId: employee.stateId,
        countryId: employee.countryId,
        postalCode: employee.postalCode,
      },
      // Nested bank account (PHP style)
      bankAccount: {
        id: employee.accountId,
        accountHolder: employee.accountHolder,
        accountNumber: employee.accountNumber,
        ifscCode: employee.ifscCode,
        branch: employee.bankBranch,
      },
      profileUrl,                // array (PHP style)
      profileImage: profileUrl[0] || null,  // convenience single
      attachments,
    };
  }

  /**
   * List employees — returns PHP-compatible { list, totalCount }
   * Each list item: { id, name, role, phoneNumber, email, profileImage }
   */
  static async listEmployees(page, limit, search) {
    const result = await EmployeeModel.getAll(page, limit, search);

    const listWithProfiles = await Promise.all(
      result.data.map(async (e) => {
        delete e.password;
        const profileImages = await AttachmentService.getAttachments(e.id, ENTITY_TYPE_PROFILE);
        return {
          id: e.id,
          name: e.fullName,
          role: e.role,
          phoneNumber: e.phoneNumber,
          email: e.email,
          profileImage: profileImages[0] || null,
        };
      })
    );

    return {
      list: listWithProfiles,
      totalCount: result.pagination.total,
    };
  }

  /**
   * Dropdown — returns [{ value, label }]
   */
  static async getDropdown() {
    return await EmployeeModel.getDropdown();
  }

  /**
   * Soft delete — also removes all attachments
   */
  static async deleteEmployee(id) {
    const existing = await EmployeeModel.getById(id);
    if (!existing) throw new Error("Employee not found");

    await AttachmentService.deleteAllEntityAttachments(id, ENTITY_TYPE_PROFILE);
    await AttachmentService.deleteAllEntityAttachments(id, ENTITY_TYPE_EMPLOYEE);
    await EmployeeModel.softDelete(id);
    return true;
  }
}

module.exports = EmployeeService;