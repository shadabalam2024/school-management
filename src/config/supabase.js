// ============================================================
// APP CONFIGURATION
// ============================================================
export const APP_CONFIG = {
  schoolName: "My School",
  currency: "₹",
  academicYear: "2024-25",
  currencyFormat: (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN"),
};

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const YEARS = [2022, 2023, 2024, 2025, 2026];

export const CLASSES = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11", "Class 12",
];

export const DESIGNATIONS = [
  "Principal", "Vice Principal", "Teacher", "Senior Teacher",
  "Clerk", "Accountant", "Peon", "Security Guard", "Librarian",
  "Lab Assistant", "Sports Coach", "Other",
];

export const EXPENSE_CATEGORIES = [
  "Electricity", "Water", "Rent", "Stationery", "Maintenance",
  "Cleaning", "Internet", "Printing", "Furniture", "Equipment",
  "Transport", "Event", "Food", "Security", "Software", "Other",
];

export const PAYMENT_MODES = ["Cash", "Online", "Cheque", "UPI"];
export const SALARY_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI"];