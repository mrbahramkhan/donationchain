/**
 * Raast / ISO 20022 error & status code reference for DonationChain.
 *
 * Note: SBP does not publish one public “merchant API error list” for all
 * participants. Live codes beyond ISO TxSts are bank/PSP-specific and pass
 * through as RAAST_API_ERROR + provider body.code when present.
 */

/** Platform codes we emit (initiate / webhook / validation) */
const PLATFORM = {
  INVALID_AMOUNT: {
    http: 400,
    retry: false,
    message: 'Amount must be a positive PKR integer',
  },
  INVALID_IBAN: {
    http: 400,
    retry: false,
    message: 'Beneficiary IBAN must be a valid PK IBAN',
  },
  INVALID_UETR: {
    http: 400,
    retry: false,
    message: 'UETR must be RFC 4122 UUID (8-4-4-4-12)',
  },
  INVALID_REQUEST: {
    http: 400,
    retry: false,
    message: 'Malformed payment request',
  },
  UNAUTHORIZED: {
    http: 401,
    retry: false,
    message: 'Missing or invalid API credentials',
  },
  FORBIDDEN: {
    http: 403,
    retry: false,
    message: 'Not allowed for this merchant / mode',
  },
  RAAST_NETWORK: {
    http: 502,
    retry: true,
    message: 'Network failure calling bank/PSP',
  },
  RAAST_API_ERROR: {
    http: 502,
    retry: true, // unless HTTP 4xx on provider response
    message: 'Bank/PSP rejected or failed the credit transfer',
  },
  INIT_FAILED: {
    http: 502,
    retry: false,
    message: 'Payment initiation failed',
  },
  WEBHOOK_INVALID_SIGNATURE: {
    http: 401,
    retry: false,
    message: 'Webhook HMAC verification failed',
  },
};

/**
 * ISO 20022 pain.002 / pacs.002 transaction status (TxSts).
 * Mapped in iso20022.mapIsoTransactionStatus → pending|processing|settled|failed
 */
const ISO_TX_STATUS = {
  // Settled / completed
  ACCC: { platform: 'settled', name: 'AcceptedSettlementCompleted' },
  ACSC: { platform: 'settled', name: 'AcceptedSettlementCompleted' },
  ACWP: { platform: 'settled', name: 'AcceptedWithoutPosting' },
  // In flight
  ACSP: { platform: 'processing', name: 'AcceptedSettlementInProcess' },
  ACCP: { platform: 'processing', name: 'AcceptedCustomerProfile' },
  ACTC: { platform: 'processing', name: 'AcceptedTechnicalValidation' },
  PDNG: { platform: 'processing', name: 'Pending' },
  RCVD: { platform: 'processing', name: 'Received' },
  // Terminal negative
  RJCT: { platform: 'failed', name: 'Rejected' },
  CANC: { platform: 'failed', name: 'Cancelled' },
  BLCK: { platform: 'failed', name: 'Blocked' },
};

/**
 * Common ISO 20022 status reason codes (StsRsnInf / Cd) often seen with RJCT.
 * External code list: ExternalStatusReason1Code (subset).
 */
const ISO_STATUS_REASON = {
  AC01: 'IncorrectAccountNumber',
  AC04: 'ClosedAccountNumber',
  AC06: 'BlockedAccount',
  AG01: 'TransactionForbidden',
  AG02: 'InvalidBankOperationCode',
  AM01: 'ZeroAmount',
  AM02: 'NotAllowedAmount',
  AM04: 'InsufficientFunds',
  AM05: 'Duplication',
  AM09: 'WrongAmount',
  BE01: 'InconsistentWithEndCustomer',
  BE04: 'MissingCreditorAddress',
  BE05: 'UnrecognisedInitiatingParty',
  CH03: 'RequestedExecutionDateOrRequestedCollectionDateTooFarInFuture',
  CH04: 'RequestedExecutionDateOrRequestedCollectionDateTooFarInPast',
  CURR: 'IncorrectCurrency',
  CUST: 'RequestedByCustomer',
  DS28: 'ReturnForTechnicalReason',
  DT01: 'InvalidDate',
  FF01: 'InvalidFileFormat',
  FF05: 'InvalidLocalInstrumentCode',
  MD07: 'EndCustomerDeceased',
  MS03: 'NotSpecifiedReasonAgentGenerated',
  NARR: 'Narrative',
  RC01: 'BankIdentifierIncorrect',
  RR01: 'MissingDebtorAccountOrIdentification',
  RR03: 'MissingCreditorNameOrAddress',
  RR04: 'RegulatoryReason',
  TM01: 'InvalidCutOffTime',
};

function describePlatform(code) {
  return PLATFORM[code] || null;
}

function describeIsoTxStatus(code) {
  const c = String(code || '').toUpperCase();
  return ISO_TX_STATUS[c] || null;
}

function describeIsoReason(code) {
  const c = String(code || '').toUpperCase();
  return ISO_STATUS_REASON[c] || null;
}

module.exports = {
  PLATFORM,
  ISO_TX_STATUS,
  ISO_STATUS_REASON,
  describePlatform,
  describeIsoTxStatus,
  describeIsoReason,
};
