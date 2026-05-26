export function convertLanguageCertificateToSubjectScore(
  certificateType: string,
  certificateScore: number,
) {
  void certificateType;
  void certificateScore;

  // TODO: Wire this to an official HUST/ZPath certificate conversion table.
  // Returning null keeps calculation honest instead of inventing conversion values.
  return null;
}
