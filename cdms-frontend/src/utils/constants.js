export const RECORD_TYPES = {
  FIR: 'FIR',
  EVIDENCE: 'Evidence',
  REPORT: 'Report'
};

export const RECORD_CATEGORIES = {
  SUSPECT_RECORD: 'SuspectRecord',
  VICTIM_RECORD: 'VictimRecord',
  FORENSIC_EVIDENCE: 'ForensicEvidence',
  CRIME_SCENE_DATA: 'CrimeSceneData'
};

export const USER_ROLES = {
  ADMIN: 'admin',
  INVESTIGATOR: 'investigator',
  FORENSICS_OFFICER: 'forensics_officer',
  DISTRICT_POLICE: 'district_police',
  JUDICIARY: 'judiciary',
  OBSERVER: 'Observer'
};

export const RECORD_STATUS = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  REVIEWED: 'Reviewed',
  SEALED: 'Sealed'
};

export const AUDIT_ACTIONS = {
  RECORD_UPLOADED: 'RECORD_UPLOADED',
  ACCESS_GRANTED: 'ACCESS_GRANTED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  POLICY_UPDATED: 'POLICY_UPDATED',
  KEY_ROTATED: 'KEY_ROTATED'
};