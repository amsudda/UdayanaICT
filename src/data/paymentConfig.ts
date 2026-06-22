/** Tutor's bank + contact details for manual bank-transfer payments.
 *  EDIT these with the real account info. */
export const BANK_DETAILS = {
  bank: 'Bank of Ceylon (BOC)',
  accountName: 'Pasindu Dissanayake',
  accountNumber: '0001234567',
  branch: 'Colombo Main'
};

export const WHATSAPP_NUMBER = '94719735601'; // 071 973 5601

export function formatLKR(value: number) {
  return `LKR ${value.toLocaleString('en-LK')}`;
}
