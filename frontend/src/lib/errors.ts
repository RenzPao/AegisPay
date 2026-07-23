/**
 * AegisPay — Centralized, human-readable error messages.
 * Maps raw contract/network errors to plain English with actionable guidance.
 */

export interface ParsedError {
  title: string;
  message: string;
  hint?: string;
  severity: 'warning' | 'error' | 'info';
}

const CONTRACT_ERRORS: Record<string, ParsedError> = {
  '#1': { severity: 'error', title: 'Contract Already Initialized', message: 'This payroll contract has already been set up by an employer.', hint: 'If you are trying to re-initialize, deploy a fresh contract.' },
  '#2': { severity: 'error', title: 'Contract Not Initialized', message: 'The payroll contract has not been set up yet.', hint: 'The employer must initialize the contract and deposit funds before anyone can claim.' },
  '#3': { severity: 'error', title: 'Unauthorized Action', message: 'Only the authorized employer can perform this action.', hint: 'Make sure you are connected with the correct employer Stellar wallet.' },
  '#4': { severity: 'error', title: 'Invalid Proof', message: 'The zero-knowledge proof could not be verified on-chain.', hint: 'Your claim file may be corrupted or does not match the current payroll batch. Try re-downloading your claim file from your employer.' },
  '#5': { severity: 'warning', title: 'Wage Already Claimed', message: 'This claim file has already been used to claim your wage.', hint: 'Each claim file can only be redeemed once. If you believe this is an error, contact your employer.' },
  '#6': { severity: 'error', title: 'Insufficient Escrow Funds', message: 'The employer\'s escrow balance is too low to pay your wage.', hint: 'Your employer needs to deposit more XLM into the contract before you can claim.' },
  '#7': { severity: 'error', title: 'Payroll Root Mismatch', message: 'Your claim file does not match the active payroll batch on-chain.', hint: 'Your employer may have uploaded a new payroll batch. Ask for an updated claim file, or make sure the employer has published the correct Merkle Root.' },
  '#8': { severity: 'error', title: 'Invalid Employer ID', message: 'The employer ID in your claim file does not match the contract.', hint: 'You may be using a claim file from the wrong employer or contract. Re-download your claim file.' },
};

const WALLET_ERRORS: Record<string, ParsedError> = {
  'freighter_not_installed': { severity: 'error', title: 'Freighter Not Found', message: 'The Freighter wallet extension is not installed in your browser.', hint: 'Download Freighter from freighter.app and refresh this page.' },
  'user_rejected': { severity: 'info', title: 'Action Cancelled', message: 'You cancelled the wallet request.', hint: 'Click the button again and approve the request in Freighter.' },
  'wrong_network': { severity: 'warning', title: 'Wrong Network', message: 'Your Freighter wallet is connected to the wrong Stellar network.', hint: 'Open Freighter settings and switch to Testnet.' },
  'insufficient_xlm': { severity: 'error', title: 'Insufficient XLM Balance', message: 'Your wallet does not have enough XLM to cover the transaction fee.', hint: 'Fund your wallet using Stellar Friendbot (for testnet) or purchase XLM.' },
};

const NETWORK_ERRORS: Record<string, ParsedError> = {
  'timeout': { severity: 'warning', title: 'Network Timeout', message: 'The transaction took too long and timed out.', hint: 'The Stellar network may be busy. Wait a moment and try again.' },
  'simulation_failed': { severity: 'error', title: 'Transaction Simulation Failed', message: 'The relayer could not simulate your transaction before submitting.', hint: 'This usually means the contract inputs are invalid. Check your claim file and anchor address.' },
  'relayer_unreachable': { severity: 'error', title: 'Relayer Offline', message: 'The AegisPay relayer server could not be reached.', hint: 'The relayer may be temporarily down. Wait a moment and try again. If the problem persists, contact support.' },
  'csv_format': { severity: 'error', title: 'Invalid CSV Format', message: 'The uploaded CSV file is not in the correct format.', hint: 'The CSV must have two columns: workerId and wageAmountUSD (with a header row).' },
  'claim_file_format': { severity: 'error', title: 'Invalid Claim File', message: 'The uploaded JSON claim file is missing required fields.', hint: 'Make sure you are uploading the exact .json file provided by your employer. Do not edit the file.' },
  'xlm_price': { severity: 'warning', title: 'Price Feed Unavailable', message: 'Could not fetch the live XLM/USD price.', hint: 'CoinGecko may be temporarily unavailable. The XLM conversion display will update when the price feed is restored.' },
  'proof_generation': { severity: 'error', title: 'Proof Generation Failed', message: 'Could not generate the zero-knowledge proof.', hint: 'This is usually a data issue. Make sure your claim file is valid and unedited.' },
};

/**
 * Parses any raw error string into a human-readable ParsedError.
 */
export function parseError(rawError: string | undefined | null): ParsedError {
  if (!rawError) {
    return { severity: 'error', title: 'Unknown Error', message: 'An unexpected error occurred.', hint: 'Please try again. If the problem persists, open the browser console for details.' };
  }

  const msg = rawError.toLowerCase();

  // Contract-level errors by code
  for (const [code, parsed] of Object.entries(CONTRACT_ERRORS)) {
    if (rawError.includes(`Error(Contract, ${code})`) || rawError.includes(`Contract, ${code}`)) {
      return parsed;
    }
  }

  // Named contract errors (from relayer messages)
  if (msg.includes('nullifierspent') || msg.includes('already been redeemed') || msg.includes('already claimed')) return CONTRACT_ERRORS['#5'];
  if (msg.includes('invalidproof') || msg.includes('invalid proof')) return CONTRACT_ERRORS['#4'];
  if (msg.includes('invalidroot') || msg.includes('merkle root')) return CONTRACT_ERRORS['#7'];
  if (msg.includes('invalidemployer')) return CONTRACT_ERRORS['#8'];
  if (msg.includes('insufficientfunds') || msg.includes('insufficient funds')) return CONTRACT_ERRORS['#6'];
  if (msg.includes('notinitialized')) return CONTRACT_ERRORS['#2'];
  if (msg.includes('alreadyinitialized')) return CONTRACT_ERRORS['#1'];
  if (msg.includes('unauthorized')) return CONTRACT_ERRORS['#3'];

  // Wallet errors
  if (msg.includes('freighter is not installed') || msg.includes('no freighter') || msg.includes('freighter not found')) return WALLET_ERRORS['freighter_not_installed'];
  if (msg.includes('rejected') || msg.includes('denied') || msg.includes('user cancelled') || msg.includes('user canceled')) return WALLET_ERRORS['user_rejected'];
  if (msg.includes('wrong network') || msg.includes('incorrect network') || msg.includes('network mismatch')) return WALLET_ERRORS['wrong_network'];
  if (msg.includes('insufficient xlm') || msg.includes('below minimum balance') || msg.includes('balance too low')) return WALLET_ERRORS['insufficient_xlm'];

  // Network/system errors
  if (msg.includes('timeout') || msg.includes('timed out')) return NETWORK_ERRORS['timeout'];
  if (msg.includes('simulation failed')) return NETWORK_ERRORS['simulation_failed'];
  if (msg.includes('network error') || msg.includes('failed to fetch') || msg.includes('econnrefused') || msg.includes('enotfound')) return NETWORK_ERRORS['relayer_unreachable'];
  if (msg.includes('invalid csv') || msg.includes('csv format') || msg.includes('missing workerId')) return NETWORK_ERRORS['csv_format'];
  if (msg.includes('invalid format') || msg.includes('claim file') || msg.includes('could not parse')) return NETWORK_ERRORS['claim_file_format'];
  if (msg.includes('xlm price') || msg.includes('coingecko')) return NETWORK_ERRORS['xlm_price'];
  if (msg.includes('proof generation') || msg.includes('groth16') || msg.includes('circuit')) return NETWORK_ERRORS['proof_generation'];

  // Fallback with the raw message
  return {
    severity: 'error',
    title: 'Something Went Wrong',
    message: rawError.length > 200 ? rawError.slice(0, 200) + '...' : rawError,
    hint: 'Please try again. Open the browser console (F12) for full technical details.',
  };
}
