export const SPEC_LABEL = {
  SQUAREBOOK_HC: '정사각 하드커버',
  PHOTOBOOK_A4_SC: 'A4 소프트커버',
  PHOTOBOOK_A5_SC: 'A5 소프트커버',
};

/**
 * bookSpecUid → 한글 판형 이름. 매핑 없으면 uid 그대로 반환.
 * @param {string} uid
 * @returns {string}
 */
export function specLabel(uid) {
  return SPEC_LABEL[uid] ?? uid;
}
