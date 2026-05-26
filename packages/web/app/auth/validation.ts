import type { FormErrors, SignupForm } from "./types";

export function isValidPhoneNumber(phoneNumber: string) {
  return /^\+?[0-9\s()-]{9,18}$/.test(phoneNumber.trim());
}

export function hasValidPassword(password: string) {
  return /[A-Za-z]/.test(password) && /\d/.test(password) && password.length >= 8;
}

export function validatePhoneFields(form: SignupForm) {
  const errors: FormErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = "Phone number is required.";
  } else if (!isValidPhoneNumber(form.phoneNumber)) {
    errors.phoneNumber = "Enter a valid phone number.";
  }

  if (!form.verificationCode.trim()) {
    errors.verificationCode = "Verification code is required.";
  }

  return errors;
}

export function validateSendCode(form: SignupForm) {
  const errors: FormErrors = {};

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = "Phone number is required.";
  } else if (!isValidPhoneNumber(form.phoneNumber)) {
    errors.phoneNumber = "Enter a valid phone number.";
  }

  return errors;
}

export function validateCredentials(form: SignupForm) {
  const errors: FormErrors = {};
  const unavailableUsernames = new Set(["admin", "demo", "test"]);

  if (!form.username.trim()) {
    errors.username = "Username is required.";
  } else if (form.username.trim().length < 3) {
    errors.username = "Username must be at least 3 characters.";
  } else if (unavailableUsernames.has(form.username.trim().toLowerCase())) {
    errors.username = "This username is already taken.";
  }

  if (!form.password) {
    errors.password = "Password is required.";
  } else if (!hasValidPassword(form.password)) {
    errors.password = "Use at least 8 characters with one letter and one number.";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function validateRole(form: SignupForm) {
  const errors: FormErrors = {};

  if (!form.role) {
    errors.role = "Select your role.";
  }

  return errors;
}

export function validateChild(form: SignupForm) {
  const errors: FormErrors = {};
  const today = new Date().toISOString().slice(0, 10);

  if (!form.childClass.trim()) {
    errors.childClass = "Child class is required.";
  }

  if (!form.childName.trim()) {
    errors.childName = "Child name is required.";
  }

  if (!form.childDateOfBirth) {
    errors.childDateOfBirth = "Date of birth is required.";
  } else if (form.childDateOfBirth > today) {
    errors.childDateOfBirth = "Date of birth cannot be in the future.";
  }

  if (!form.childGender) {
    errors.childGender = "Select child gender.";
  }

  return errors;
}

export function validateRelationship(form: SignupForm) {
  const errors: FormErrors = {};

  if (!form.relationshipType) {
    errors.relationshipType = "Select your relationship to the child.";
  }

  return errors;
}
