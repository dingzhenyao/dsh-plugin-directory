/** Copy dictionaries for the DSH plugin directory Settings tab. */

/** Simplified Chinese dictionary and key source of truth. */
export const zh = {
  tab: '插件目录',
  placeholder: '插件目录即将上线。',
} satisfies Record<string, string>

/** Plugin directory locale key union. */
export type DirectoryLocaleKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  tab: 'Plugin directory',
  placeholder: 'Plugin directory coming soon.',
} satisfies Record<DirectoryLocaleKey, string>
