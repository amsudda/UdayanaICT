/** Shared option lists for student signup & profile forms. */

export const districts = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

export const programs = ['O/L', 'A/L'];

/** Exam year (cohort) — current year forward. */
export const examYears = (() => {
  const start = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, i) => String(start + i));
})();

export const genders = ['Male', 'Female', 'Other'];

export const mediums = ['Sinhala', 'English', 'Tamil'];
