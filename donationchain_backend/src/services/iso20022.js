/**
 * ISO 20022 field mapping for Raast / credit-transfer style payments.
 *
 * Raast (SBP) is ISO 20022-based. Banks/PSPs often accept JSON APIs that
 * mirror pain.001 (customer initiation) and pacs.008 (interbank CT) semantics.
 *
 * This module builds a structured object (not full XML) that maps cleanly to:
 * - pain.001.001.xx  CustomerCreditTransferInitiation
 * - pacs.008.001.xx  FIToFICustomerCreditTransfer
 *
 * Identifiers (who sets what):
 * | Field        | Set by              | Stable across chain? |
 * |--------------|---------------------|----------------------|
 * | MsgId        | Sending agent       | No (per message)     |
 * | PmtInfId     | Initiating party    | pain.001 only        |
 * | InstrId      | Instructing agent   | May change per hop   |
 * | EndToEndId   | Originator/debtor   | YES — never alter    |
 * | TxId         | First instructing   | YES once assigned    |
 * | UETR         | Debtor agent / init | YES — UUID v4 track  |
 */

const crypto = require('crypto');

const CURRENCY = 'PKR';
const SERVICE_LEVEL = 'INST'; // instant / Raast-style
const LOCAL_INSTRUMENT = process.env.RAAST_LOCAL_INSTRUMENT || 'RAAST';
const CATEGORY_PURPOSE = process.env.RAAST_CATEGORY_PURPOSE || 'CHAR'; // charity / donation

function uuidV4() {
  return crypto.randomUUID();
}

/**
 * UETR must be a UUID (ISO 20022 / SWIFT gpi style).
 * Accepts UUID v1–v5 hex form; prefers v4 for newly generated values.
 * RFC 4122: 8-4-4-4-12 hex with optional braces/urn prefix.
 */
const UETR_RE =
  /^(?:urn:uuid:)?\{?([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\}?$/i;

function normalizeUetr(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(UETR_RE);
  if (!m) return null;
  return m[1].toLowerCase();
}

function isValidUetr(value) {
  return normalizeUetr(value) != null;
}

/**
 * @param {string} [value] - if missing, generates UUID v4
 * @param {{ required?: boolean }} [opts]
 * @returns {string} normalized UETR
 * @throws {{ code: 'INVALID_UETR' }}
 */
function resolveUetr(value, opts) {
  const o = opts || {};
  if (value == null || value === '') {
    if (o.required) {
      const err = new Error('UETR is required');
      err.code = 'INVALID_UETR';
      err.field = 'uetr';
      throw err;
    }
    return uuidV4();
  }
  const n = normalizeUetr(value);
  if (!n) {
    const err = new Error(
      'Invalid UETR: must be a UUID (8-4-4-4-12 hex), e.g. 550e8400-e29b-41d4-a716-446655440000'
    );
    err.code = 'INVALID_UETR';
    err.field = 'uetr';
    err.provided = String(value).slice(0, 80);
    throw err;
  }
  return n;
}

function compactId(prefix, maxLen) {
  const raw = `${prefix}${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
  return raw.slice(0, maxLen || 35);
}

/** Normalize PK IBAN: strip spaces, uppercase */
function normalizeIban(iban) {
  return String(iban || '')
    .replace(/\s/g, '')
    .toUpperCase();
}

function isValidPkIban(iban) {
  return /^PK[0-9]{2}[A-Z0-9]{11,24}$/.test(normalizeIban(iban));
}

/**
 * Build pain.001-aligned initiation structure from platform payment opts.
 *
 * @param {object} opts
 * @param {number} opts.amountPkr
 * @param {string} opts.beneficiaryIban
 * @param {string} opts.beneficiaryName
 * @param {string} [opts.debtorName]
 * @param {string} [opts.debtorIban] - if account-linked collection
 * @param {string} [opts.endToEndId] - preserve if retry/idempotent
 * @param {string} [opts.uetr]
 * @param {string} [opts.customerReference]
 * @param {string} [opts.narration]
 * @param {string} [opts.caseId]
 * @param {string} [opts.purposeCode] - ISO external purpose (e.g. CHAR)
 * @param {string} [opts.initiatingParty] - platform legal name
 */
function buildPain001CreditTransfer(opts) {
  const amount = Math.round(Number(opts.amountPkr) || 0);
  const creditorIban = normalizeIban(opts.beneficiaryIban);
  const endToEndId = String(opts.endToEndId || opts.customerReference || compactId('E2E', 35)).slice(0, 35);
  const instrId = compactId('INSTR', 35);
  const pmtInfId = compactId('PMTINF', 35);
  const msgId = compactId('MSG', 35);
  const uetr = resolveUetr(opts.uetr); // validates if provided; else generates v4
  const creDtTm = new Date().toISOString();
  const reqdExctnDt = creDtTm.slice(0, 10); // ISO date
  const purpose = opts.purposeCode || CATEGORY_PURPOSE;
  const rmtUnstructured = String(
    opts.narration ||
      [opts.caseId && `Case ${opts.caseId}`, 'DonationChain institutional payout']
        .filter(Boolean)
        .join(' — ')
  ).slice(0, 140);

  const pain001 = {
    messageType: 'pain.001.001.09',
    Document: {
      CstmrCdtTrfInitn: {
        GrpHdr: {
          MsgId: msgId,
          CreDtTm: creDtTm,
          NbOfTxs: '1',
          CtrlSum: amount,
          InitgPty: {
            Nm: opts.initiatingParty || process.env.RAAST_MERCHANT_NAME || 'DonationChain',
          },
        },
        PmtInf: {
          PmtInfId: pmtInfId,
          PmtMtd: 'TRF',
          BtchBookg: false,
          NbOfTxs: '1',
          CtrlSum: amount,
          PmtTpInf: {
            InstrPrty: 'HIGH',
            SvcLvl: { Cd: SERVICE_LEVEL },
            LclInstrm: { Cd: LOCAL_INSTRUMENT },
            CtgyPurp: { Cd: purpose },
          },
          ReqdExctnDt: reqdExctnDt,
          Dbtr: {
            Nm: opts.debtorName || opts.initiatingParty || 'DonationChain Payer',
          },
          DbtrAcct: opts.debtorIban
            ? {
                Id: { IBAN: normalizeIban(opts.debtorIban) },
                Ccy: CURRENCY,
              }
            : {
                // Collection / RTP style — account resolved by bank channel
                Id: { Othr: { Id: 'CUSTOMER_COLLECTION' } },
                Ccy: CURRENCY,
              },
          DbtrAgt: {
            FinInstnId: {
              // BIC optional for domestic Raast; bank fills if required
              Othr: { Id: process.env.RAAST_DEBTOR_AGENT_ID || 'RAAST' },
            },
          },
          CdtTrfTxInf: [
            {
              PmtId: {
                InstrId: instrId,
                EndToEndId: endToEndId,
                UETR: uetr,
              },
              Amt: {
                InstdAmt: {
                  Ccy: CURRENCY,
                  Value: amount,
                },
              },
              CdtrAgt: {
                FinInstnId: {
                  Othr: { Id: process.env.RAAST_CREDITOR_AGENT_ID || 'RAAST' },
                },
              },
              Cdtr: {
                Nm: String(opts.beneficiaryName || 'Beneficiary').slice(0, 140),
              },
              CdtrAcct: {
                Id: { IBAN: creditorIban },
                Ccy: CURRENCY,
              },
              Purp: { Cd: purpose },
              RmtInf: {
                Ustrd: [rmtUnstructured],
              },
            },
          ],
        },
      },
    },
  };

  return {
    pain001,
    identifiers: {
      msgId,
      pmtInfId,
      instrId,
      endToEndId,
      uetr,
      amount,
      currency: CURRENCY,
      creditorIban,
    },
  };
}

/**
 * Flatten pain.001 into a JSON API body many bank gateways accept
 * (mirrors CdtTrfTxInf + key GrpHdr fields).
 */
function toGatewayCreditTransferBody(painBundle, extra) {
  const id = painBundle.identifiers;
  const tx = painBundle.pain001.Document.CstmrCdtTrfInitn.PmtInf.CdtTrfTxInf[0];
  const grp = painBundle.pain001.Document.CstmrCdtTrfInitn.GrpHdr;
  const pmt = painBundle.pain001.Document.CstmrCdtTrfInitn.PmtInf;

  return {
    // Gateway-friendly
    amount: id.amount,
    currency: id.currency,
    messageType: painBundle.pain001.messageType,
    msgId: id.msgId,
    pmtInfId: id.pmtInfId,
    instrId: id.instrId,
    endToEndId: id.endToEndId,
    uetr: id.uetr,
    debtor: {
      name: pmt.Dbtr.Nm,
      account: pmt.DbtrAcct,
      agent: pmt.DbtrAgt,
      type: 'CUSTOMER_COLLECTION',
    },
    creditor: {
      name: tx.Cdtr.Nm,
      iban: id.creditorIban,
      account: tx.CdtrAcct,
      agent: tx.CdtrAgt,
    },
    paymentType: {
      priority: 'HIGH',
      serviceLevel: SERVICE_LEVEL,
      localInstrument: LOCAL_INSTRUMENT,
      categoryPurpose: tx.Purp.Cd,
    },
    remittance: {
      unstructured: tx.RmtInf.Ustrd,
    },
    requestedExecutionDate: pmt.ReqdExctnDt,
    initiatingParty: grp.InitgPty.Nm,
    // Full ISO tree for banks that want Document/CstmrCdtTrfInitn
    iso20022: painBundle.pain001,
    ...(extra || {}),
  };
}

/**
 * Map pacs.002 / webhook status codes → platform status.
 * pacs.002 TxSts common codes: ACCC, ACSC, ACSP, PDNG, RJCT, CANC…
 */
function mapIsoTransactionStatus(code) {
  const c = String(code || '').toUpperCase();
  if (['ACCC', 'ACSC', 'ACWP'].includes(c)) return 'settled';
  if (['RJCT', 'CANC', 'BLCK'].includes(c)) return 'failed';
  if (['ACSP', 'ACCP', 'ACTC', 'PDNG', 'RCVD'].includes(c)) return 'processing';
  return mapLooseStatus(code);
}

function mapLooseStatus(s) {
  const v = String(s || '').toLowerCase();
  if (['success', 'completed', 'settled', 'accepted', 'acsc', 'accc'].includes(v)) return 'settled';
  if (['failed', 'rejected', 'rjct', 'cancelled', 'canc'].includes(v)) return 'failed';
  if (['processing', 'pending', 'pdng', 'actc', 'acsp', 'accp'].includes(v)) return 'processing';
  return 'pending';
}

/**
 * Extract tracking ids from bank response or webhook body.
 */
function extractIdsFromProviderBody(body) {
  const b = body || {};
  const rawUetr = b.uetr || b.UETR || b.uetrId || null;
  let uetr = null;
  let uetrInvalid = false;
  if (rawUetr != null && String(rawUetr).trim() !== '') {
    uetr = normalizeUetr(rawUetr);
    if (!uetr) uetrInvalid = true;
  }
  return {
    paymentId: b.paymentId || b.id || b.merchantReference || null,
    endToEndId: b.endToEndId || b.EndToEndId || b.customerReference || null,
    uetr,
    uetrInvalid,
    uetrRaw: rawUetr,
    instrId: b.instrId || b.InstrId || null,
    txId: b.txId || b.TxId || b.transactionId || null,
    providerRef: b.transactionId || b.rrn || b.TxId || b.endToEndId || (uetr || null),
    isoTxStatus: b.txSts || b.TxSts || b.status || null,
  };
}

module.exports = {
  buildPain001CreditTransfer,
  toGatewayCreditTransferBody,
  mapIsoTransactionStatus,
  mapLooseStatus,
  extractIdsFromProviderBody,
  normalizeIban,
  isValidPkIban,
  uuidV4,
  isValidUetr,
  normalizeUetr,
  resolveUetr,
  compactId,
  UETR_RE,
  CURRENCY,
  SERVICE_LEVEL,
  LOCAL_INSTRUMENT,
  CATEGORY_PURPOSE,
};
