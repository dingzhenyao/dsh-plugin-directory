/**
 * The plugin directory's stylesheet, shipped as a plain string and injected as
 * ONE <style> tag at `apply` time. This intentionally avoids CSS Modules and
 * any per-file scoping pipeline: plain `dshpd-*` class names written by the
 * components are matched here verbatim, so styling cannot be lost to a
 * class-hash/interop mismatch. Colors use the DSH `--dsw-alias-*` tokens with
 * literal fallbacks so a missing theme variable degrades gracefully instead of
 * dropping the whole declaration.
 */

const CSS = `
.dshpd-root { display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 760px; color: var(--dsw-alias-label-primary, #1f2329); }
.dshpd-status { margin: 0; font-size: 13px; line-height: 20px; color: var(--dsw-alias-label-tertiary, #8a919f); }
.dshpd-headRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.dshpd-refresh { flex-shrink: 0; appearance: none; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 8px; padding: 5px 14px; background: var(--dsw-alias-bg-layer-2, #f5f6f8); color: var(--dsw-alias-label-primary, #1f2329); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.dshpd-refresh:hover:not(:disabled) { border-color: var(--dsw-alias-label-dimmed, #98a1b3); }
.dshpd-refresh:disabled { opacity: 0.4; cursor: default; }
.dshpd-failure { display: flex; align-items: center; gap: 10px; font-size: 13px; line-height: 20px; color: var(--dsw-alias-state-error-primary, #d64545); }
.dshpd-failure button { appearance: none; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 8px; padding: 5px 12px; background: transparent; color: var(--dsw-alias-label-primary, #1f2329); font: inherit; cursor: pointer; }
.dshpd-failure button:hover { background: var(--dsw-alias-interactive-bg-hover, #f0f1f4); }
.dshpd-cardList { display: flex; flex-direction: column; gap: 10px; }
.dshpd-results { display: flex; flex-direction: column; gap: 12px; padding: 12px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 12px; background: var(--dsw-alias-bg-layer-1, #ffffff); }
.dshpd-pager { display: flex; align-items: center; justify-content: center; gap: 10px; }
.dshpd-pageButton { appearance: none; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 8px; padding: 5px 14px; background: var(--dsw-alias-bg-layer-2, #f5f6f8); color: var(--dsw-alias-label-primary, #1f2329); font: inherit; font-size: 13px; cursor: pointer; }
.dshpd-pageButton:hover:not(:disabled) { border-color: var(--dsw-alias-label-dimmed, #98a1b3); }
.dshpd-pageButton:disabled { opacity: 0.4; cursor: default; }
.dshpd-pageIndicator { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-tertiary, #8a919f); }
.dshpd-browseAll { align-self: center; appearance: none; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 8px; padding: 5px 14px; background: var(--dsw-alias-bg-layer-2, #f5f6f8); color: var(--dsw-alias-label-primary, #1f2329); font: inherit; font-size: 13px; cursor: pointer; }
.dshpd-browseAll:hover { border-color: var(--dsw-alias-label-dimmed, #98a1b3); }
.dshpd-liveSection { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; border-top: 1px solid var(--dsw-alias-border-l2, #d0d5dd); }
.dshpd-liveTitle { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary, #1f2329); }
.dshpd-liveHint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, #8a919f); }

.dshpd-mine { display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 12px; background: var(--dsw-alias-bg-layer-1, #ffffff); }
.dshpd-mineTitle { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary, #1f2329); }
.dshpd-mineHint { margin: 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, #8a919f); }
.dshpd-mineForm { display: flex; align-items: stretch; gap: 8px; }
.dshpd-mineList { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.dshpd-mineItem { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f5f6f8); }
.dshpd-mineInfo { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dshpd-mineName { font-size: 13px; font-weight: 600; line-height: 18px; color: var(--dsw-alias-label-primary, #1f2329); }
.dshpd-mineSource { font-size: 12px; line-height: 18px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: var(--dsw-alias-label-secondary, #4b5563); overflow-wrap: anywhere; }
.dshpd-mineMeta { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, #8a919f); }
.dshpd-mineActions { display: flex; gap: 6px; flex-shrink: 0; }

.dshpd-bar { display: flex; flex-direction: column; gap: 12px; padding: 14px 16px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 12px; background: var(--dsw-alias-bg-layer-1, #ffffff); }
.dshpd-search { box-sizing: border-box; width: 100%; padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 8px; background: var(--dsw-alias-bg-layer-2, #f5f6f8); color: var(--dsw-alias-label-primary, #1f2329); font: inherit; font-size: 13px; line-height: 20px; }
.dshpd-search::placeholder { color: var(--dsw-alias-label-tertiary, #8a919f); }
.dshpd-search:focus-visible { outline: none; border-color: var(--dsw-alias-brand-primary, #4176e6); box-shadow: 0 0 0 2px var(--dsw-alias-brand-primary, #4176e6); }
.dshpd-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
.dshpd-rowLabel { min-width: 56px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary, #4b5563); }
.dshpd-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dshpd-chip { appearance: none; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 8px; padding: 4px 12px; background: var(--dsw-alias-bg-layer-2, #f5f6f8); color: var(--dsw-alias-label-secondary, #4b5563); font: inherit; font-size: 12px; line-height: 18px; cursor: pointer; }
.dshpd-chip:hover { border-color: var(--dsw-alias-label-dimmed, #98a1b3); background: var(--dsw-alias-interactive-bg-hover, #f0f1f4); color: var(--dsw-alias-label-primary, #1f2329); }
.dshpd-chip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #4176e6); outline-offset: 1px; }
.dshpd-chip[aria-pressed='true'] { border-color: var(--dsw-alias-brand-primary, #4176e6); background: var(--dsw-alias-brand-primary, #4176e6); color: #ffffff; }

.dshpd-card { display: flex; flex-direction: column; gap: 10px; padding: 16px 18px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 12px; background: var(--dsw-alias-bg-layer-3, #ffffff); box-shadow: 0 1px 2px rgba(16,24,40,0.06); }
.dshpd-header { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.dshpd-title { margin: 0; min-width: 0; font-size: 15px; font-weight: 600; line-height: 1.4; }
.dshpd-title a { color: var(--dsw-alias-label-primary, #1f2329); text-decoration: none; overflow-wrap: anywhere; }
.dshpd-title a:hover { text-decoration: underline; }
.dshpd-owner { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary, #8a919f); }
.dshpd-description { margin: 0; font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-tertiary, #8a919f); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.dshpd-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary, #4b5563); }
.dshpd-meta li { display: inline-flex; align-items: baseline; gap: 4px; min-width: 0; }
.dshpd-meta strong { font-weight: 600; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-primary, #1f2329); }
.dshpd-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.dshpd-badge { border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 999px; padding: 1px 8px; background: var(--dsw-alias-bg-module-platform, #f5f6f8); font-size: 11px; line-height: 17px; font-weight: 500; white-space: nowrap; color: var(--dsw-alias-label-secondary, #4b5563); }
.dshpd-badge[data-form='bundle'] { border-color: var(--dsw-alias-state-success-primary, #2f9e44); color: var(--dsw-alias-state-success-primary, #2f9e44); }
.dshpd-badge[data-form='repo'] { border-color: var(--dsw-alias-state-business-primary, #4176e6); color: var(--dsw-alias-state-business-primary, #4176e6); }
.dshpd-badge[data-form='client'] { border-color: var(--dsw-alias-brand-primary, #4176e6); color: var(--dsw-alias-brand-primary, #4176e6); }
.dshpd-badge[data-form='unknown'] { border-color: var(--dsw-alias-border-l2, #d0d5dd); color: var(--dsw-alias-label-tertiary, #8a919f); }
.dshpd-install { display: flex; align-items: stretch; gap: 8px; }
.dshpd-command { flex: 1; min-width: 0; overflow-x: auto; padding: 7px 10px; border: 1px solid var(--dsw-alias-border-l2, #d0d5dd); border-radius: 8px; background: var(--dsw-alias-bg-module-platform, #f5f6f8); color: var(--dsw-alias-label-primary, #1f2329); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; line-height: 18px; white-space: nowrap; }
.dshpd-copyButton { flex-shrink: 0; appearance: none; border: 1px solid var(--dsw-alias-brand-primary, #4176e6); border-radius: 8px; padding: 6px 14px; background: var(--dsw-alias-brand-primary, #4176e6); color: #ffffff; font: inherit; font-size: 13px; line-height: 1.5; cursor: pointer; white-space: nowrap; }
.dshpd-copyButton:hover { background: var(--dsw-alias-label-primary, #1f2329); }
`

let injected = false

/** Inject the stylesheet once; safe to call on every `apply`. */
export function injectStyles(): void {
  if (typeof document === 'undefined' || injected) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-plugin-directory'
  tag.textContent = CSS
  document.head.appendChild(tag)
  injected = true
}
