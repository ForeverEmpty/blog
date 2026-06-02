export const commentModerationRules = {
  enabled: true,
  maxLinks: 3,
  maxRepeatedCharacterRun: 12,
  minContentLength: 2,
  blockedKeywords: [
    'casino',
    'viagra',
    'porn',
    'loan',
    '博彩',
    '赌博',
    '色情',
    '贷款',
    '发票',
    '代开',
    '刷单'
  ],
  reviewKeywords: [
    '推广',
    '合作',
    '加群',
    'telegram',
    'whatsapp',
    'seo'
  ],
  blockedAuthors: [
    'admin',
    'administrator',
    '站长'
  ],
  blockedEmailDomains: [
    'example.com',
    'mailinator.com',
    'tempmail.com',
    '10minutemail.com'
  ],
  blockedIps: []
}
