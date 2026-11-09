// KYC state of a user: Verified, Under review, Rejected or Not submitted.
// Users created by hand in the seed data may omit kycStatus, so it is derived from the older fields.
export const kycStatus = (user) => {
  if (user.kycStatus) return user.kycStatus;
  if (user.verified) return 'Verified';
  return user.kyc?.landProof || user.kyc?.summary ? 'Under review' : 'Not submitted';
};

// Status given to a new account from what was supplied at registration.
export const initialKycStatus = (user) => {
  const k = user.kyc;
  if (user.role === 'Farmer') return k?.landProof ? 'Under review' : 'Not submitted';
  return k?.summary ? 'Under review' : 'Not submitted';
};

// Human-readable list of what a user submitted for KYC, used on the admin review screen.
export const kycItems = (user) => {
  const k = user.kyc || {};
  const out = [];
  if (user.role === 'Farmer') {
    if (k.landProof) out.push(['Land ownership proof', k.landProof.name, k.landProof.uploadedAt]);
    if (k.organicCert) out.push(['Organic / crop certificate', k.organicCert.name, k.organicCert.uploadedAt]);
  } else if (k.summary) {
    out.push(['Details submitted', k.summary, k.submittedAt]);
  }
  return out;
};

export const KYC_STATES = ['Under review', 'Verified', 'Rejected', 'Not submitted'];
