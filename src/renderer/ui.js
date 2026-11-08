// Krizcord paneli: kenar çubuklu düzen (gruplu gezinme, açılır alt menüler, daraltılabilir kenar çubuğu,
// kimlik menüsü, breadcrumb üst çubuk, Ctrl+F komut paleti). Discord'un açık/koyu temasına uyar.

import { t } from "./i18n";
import * as plugins from "./plugins";
import * as themes from "./themes";
import * as badges from "./badges";
import * as circle from "./circle";
import { VERSION, BRAND } from "./brand";
import { svg } from "./icons";

const native = () => window.KrizcordNative;

// --- Stil --------------------------------------------------------------

const CSS = `
.kc-overlay{
  --kc-primary:var(--krizcord-accent,#7c5cff);--kc-primary-fg:#fff;
  --kc-bg:#09090b;--kc-card:#111113;--kc-fg:#fafafa;--kc-muted:#27272a;--kc-muted-fg:#a1a1aa;
  --kc-border:rgba(255,255,255,.08);--kc-input:#27272a;--kc-hover:rgba(255,255,255,.05);--kc-active:rgba(255,255,255,.1);
  --kc-soft:rgba(255,255,255,.02);--kc-soft2:rgba(255,255,255,.05);--kc-danger:#f87171;--kc-success:#4ade80;
  --kc-shadow:0 1px 2px rgba(0,0,0,.3);--kc-ease:cubic-bezier(.4,0,.2,1);
  position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;
  font-family:"gg sans","Inter","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;font-size:13px;line-height:1.45;
  color:var(--kc-fg);text-align:left;-webkit-font-smoothing:antialiased;
  background:rgba(0,0,0,.5);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);
  opacity:0;visibility:hidden;pointer-events:none;transition:opacity .15s ease,visibility 0s linear .16s}
:root.theme-light .kc-overlay{
  --kc-bg:#fff;--kc-card:#fff;--kc-fg:#09090b;--kc-muted:#f4f4f5;--kc-muted-fg:#71717a;
  --kc-border:rgba(0,0,0,.08);--kc-input:#e4e4e7;--kc-hover:rgba(0,0,0,.05);--kc-active:rgba(0,0,0,.06);
  --kc-soft:rgba(0,0,0,.02);--kc-soft2:rgba(0,0,0,.05);--kc-danger:#dc2626;--kc-success:#16a34a;--kc-shadow:0 1px 2px rgba(0,0,0,.05);
  background:rgba(0,0,0,.25)}
.kc-overlay.kc-open{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .2s ease,visibility 0s}
.kc-overlay *{box-sizing:border-box}
.kc-overlay button{font-family:inherit}
.kc-ic{flex:none;display:block}

/* Pencere */
.kc-window{position:relative;display:flex;width:100%;max-width:896px;height:min(700px,100%);overflow:hidden;
  background:var(--kc-card);border:1px solid var(--kc-border);border-radius:12px;
  box-shadow:0 0 0 1px rgba(0,0,0,.05),0 24px 64px rgba(0,0,0,.45);
  opacity:0;transform:scale(.95);transition:opacity .15s ease,transform .15s ease}
.kc-open .kc-window{opacity:1;transform:none;transition:opacity .2s ease,transform .2s var(--kc-ease)}
.kc-window:focus{outline:none}

/* Kenar çubuğu */
.kc-sidewrap{width:260px;flex:none;overflow:hidden;background:var(--kc-soft);border-right:1px solid var(--kc-border);
  transition:width .3s ease-in-out,opacity .3s ease-in-out}
.kc-collapsed .kc-sidewrap{width:0;opacity:0;border-right:none}
.kc-side{width:260px;height:100%;display:flex;flex-direction:column;padding:12px}
.kc-ws{position:relative}
.kc-ws-btn{all:unset;box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:8px;margin-bottom:16px;border-radius:8px;cursor:pointer;user-select:none;transition:background .15s}
.kc-ws-btn:hover{background:var(--kc-hover)}
.kc-ws-btn:focus-visible{outline:2px solid var(--kc-primary);outline-offset:-2px}
.kc-ws-left{display:flex;align-items:center;gap:12px;min-width:0}
.kc-avatar{width:32px;height:32px;border-radius:6px;flex:none;display:grid;place-items:center;background:var(--kc-primary);
  color:var(--kc-primary-fg);font-weight:600;font-size:13px;box-shadow:var(--kc-shadow)}
.kc-ws-name{display:block;font-size:13px;font-weight:500;line-height:1;margin-bottom:4px;color:var(--kc-fg)}
.kc-ws-sub{display:block;font-size:11px;line-height:1;color:var(--kc-muted-fg)}
.kc-ws-chev{color:var(--kc-muted-fg);opacity:.5;transition:opacity .15s,transform .2s}
.kc-ws-btn:hover .kc-ws-chev{opacity:.8}
.kc-ws.kc-on .kc-ws-chev{transform:rotate(180deg)}
.kc-ws-catch{position:fixed;inset:0;z-index:40}
.kc-ws-menu{position:absolute;top:52px;left:0;width:100%;z-index:50;display:flex;flex-direction:column;gap:2px;padding:4px 0;
  background:var(--kc-card);border:1px solid var(--kc-border);border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,.35);
  animation:kc-pop .1s ease-out}
.kc-menu-item{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;margin:0 4px;padding:8px 12px;border-radius:6px;
  font-size:13px;color:var(--kc-fg);opacity:.85;cursor:pointer;transition:background .15s,opacity .15s;text-decoration:none}
.kc-menu-item:hover,.kc-menu-item:focus-visible{background:var(--kc-hover);opacity:1}
.kc-menu-item .kc-ic{color:var(--kc-muted-fg)}
.kc-menu-sep{height:1px;margin:4px 8px;background:var(--kc-border)}
@keyframes kc-pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}

.kc-navscroll{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:16px;margin-top:8px;scrollbar-width:none}
.kc-navscroll::-webkit-scrollbar{display:none}
.kc-navgroup{display:flex;flex-direction:column;gap:2px}
.kc-navhead{padding:0 10px;margin-bottom:4px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--kc-muted-fg);opacity:.6}
.kc-navitem{display:flex;flex-direction:column;width:100%}
.kc-navbtn{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;width:100%;padding:7px 10px;border-radius:6px;
  cursor:pointer;user-select:none;color:var(--kc-muted-fg);transition:background .2s,color .2s}
.kc-navbtn:hover{background:var(--kc-hover);color:var(--kc-fg)}
.kc-navbtn:focus-visible{outline:2px solid var(--kc-primary);outline-offset:-2px}
.kc-navbtn.kc-on{background:var(--kc-active);color:var(--kc-fg);font-weight:500}
.kc-navleft{display:flex;align-items:center;gap:10px;min-width:0}
.kc-navleft .kc-ic{opacity:.7;transition:opacity .2s}
.kc-navbtn:hover .kc-navleft .kc-ic{opacity:.85}
.kc-navbtn.kc-on .kc-navleft .kc-ic{opacity:1}
.kc-navtitle{font-size:13px;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kc-navright{display:flex;align-items:center;gap:8px}
.kc-kbd{display:inline-flex;align-items:center;justify-content:center;height:20px;padding:0 6px;border-radius:4px;
  font:500 10px/1 ui-monospace,"SF Mono",Consolas,monospace;color:var(--kc-muted-fg);background:var(--kc-soft2);border:1px solid var(--kc-border);white-space:nowrap}
.kc-navbtn .kc-kbd{display:none;opacity:.75}
.kc-navbtn:hover .kc-kbd{display:inline-flex}
.kc-pill{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;
  font-size:10px;font-weight:500;background:color-mix(in srgb,var(--kc-primary) 14%,transparent);color:color-mix(in srgb,var(--kc-primary) 75%,var(--kc-fg))}
.kc-pill[hidden]{display:none}
.kc-navchev{color:var(--kc-muted-fg);opacity:.5;transition:transform .2s}
.kc-navitem.kc-expanded>.kc-navbtn .kc-navchev{transform:rotate(90deg)}
.kc-children{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .3s ease-in-out,opacity .3s ease-in-out}
.kc-navitem.kc-expanded>.kc-children{grid-template-rows:1fr;opacity:1}
.kc-children-inner{overflow:hidden;min-height:0;position:relative;display:flex;flex-direction:column;gap:2px;margin-top:2px}
.kc-children-line{position:absolute;top:0;bottom:0;left:17.5px;border-left:1px solid var(--kc-border)}
.kc-children .kc-navbtn{padding-left:22px}
.kc-navbottom{margin-top:auto;padding-top:16px;border-top:1px solid var(--kc-border);display:flex;flex-direction:column;gap:2px}

/* Ana alan */
.kc-main{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--kc-soft);position:relative}
.kc-top{height:56px;flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;
  background:var(--kc-card);border-bottom:1px solid var(--kc-border)}
.kc-top-left{display:flex;align-items:center;gap:12px;min-width:0}
.kc-iconbtn{all:unset;box-sizing:border-box;display:grid;place-items:center;padding:6px;border-radius:6px;color:var(--kc-muted-fg);cursor:pointer;transition:background .15s,color .15s}
.kc-iconbtn:hover{background:var(--kc-hover);color:var(--kc-fg)}
.kc-iconbtn:focus-visible{outline:2px solid var(--kc-primary);outline-offset:0}
.kc-crumb{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--kc-muted-fg);min-width:0}
.kc-crumb b{font-weight:500;color:var(--kc-fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kc-top-right{display:flex;align-items:center;gap:8px}
.kc-searchbar{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:240px;height:32px;padding:0 6px 0 10px;border-radius:6px;
  background:var(--kc-soft2);color:var(--kc-muted-fg);font-size:13px;cursor:text;transition:background .15s}
.kc-searchbar:hover{background:var(--kc-active)}
.kc-searchbar>span:not(.kc-kbd){flex:1;opacity:.75}
.kc-searchbar:focus-visible{outline:2px solid var(--kc-primary);outline-offset:0}

.kc-content{flex:1;overflow-y:auto;padding:32px;scrollbar-width:thin;scrollbar-color:var(--kc-muted) transparent}
.kc-content::-webkit-scrollbar{width:10px}
.kc-content::-webkit-scrollbar-thumb{background-color:var(--kc-muted)!important;border:3px solid transparent;background-clip:padding-box;border-radius:8px}
.kc-content::-webkit-scrollbar-track{background:transparent}
.kc-page.kc-animate{animation:kc-in .25s ease-out}
@keyframes kc-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.kc-pagehead{margin-bottom:24px}
.kc-pagehead h2{margin:0;font-size:20px;font-weight:600;letter-spacing:-.015em;color:var(--kc-fg)}
.kc-pagehead p{margin:4px 0 0;font-size:13px;color:var(--kc-muted-fg)}
.kc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}

.kc-card{background:var(--kc-card);border:1px solid var(--kc-border);border-radius:12px;box-shadow:var(--kc-shadow);margin-bottom:24px;overflow:hidden}
.kc-cardhead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--kc-border)}
.kc-cardhead h3{margin:0;font-size:14px;font-weight:600;color:var(--kc-fg)}
.kc-cardhead p{margin:2px 0 0;font-size:12px;color:var(--kc-muted-fg)}
.kc-cardfoot{padding:12px 20px;border-top:1px solid var(--kc-border);font-size:12px;color:var(--kc-muted-fg);display:flex;align-items:center;justify-content:space-between;gap:12px}

.kc-stat{all:unset;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;height:128px;padding:20px;
  background:var(--kc-card);border:1px solid var(--kc-border);border-radius:12px;box-shadow:var(--kc-shadow);cursor:pointer;transition:border-color .15s}
.kc-stat:hover{border-color:color-mix(in srgb,var(--kc-fg) 18%,transparent)}
.kc-stat:focus-visible{outline:2px solid var(--kc-primary);outline-offset:2px}
.kc-stat-top{display:flex;align-items:center;justify-content:space-between;color:var(--kc-muted-fg);font-size:13px}
.kc-stat-val{font-size:28px;font-weight:600;letter-spacing:-.02em;color:var(--kc-fg);line-height:1}
.kc-stat-val small{font-size:15px;font-weight:500;color:var(--kc-muted-fg);margin-left:2px}
.kc-stat-foot{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--kc-muted-fg)}

.kc-row{display:flex;align-items:center;gap:14px;min-height:60px;padding:12px 20px;border-bottom:1px solid var(--kc-border);text-decoration:none;color:inherit}
.kc-row:last-child{border-bottom:none}
a.kc-row,button.kc-row{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:14px;width:100%;min-height:60px;padding:12px 20px;
  border-bottom:1px solid var(--kc-border);cursor:pointer;transition:background .15s}
a.kc-row:last-child,button.kc-row:last-child{border-bottom:none}
a.kc-row:hover,button.kc-row:hover{background:var(--kc-hover)}
a.kc-row:focus-visible,button.kc-row:focus-visible{outline:2px solid var(--kc-primary);outline-offset:-2px}
.kc-row-ic{width:32px;height:32px;border-radius:6px;flex:none;display:grid;place-items:center;background:var(--kc-soft2);color:var(--kc-fg);
  font-size:13px;font-weight:600;border:1px solid var(--kc-border)}
.kc-row-ic img{width:22px;height:22px}
.kc-row-text{flex:1;min-width:0}
.kc-row-title{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:500;color:var(--kc-fg)}
.kc-row-sub{margin-top:2px;font-size:12.5px;color:var(--kc-muted-fg);overflow:hidden;text-overflow:ellipsis}
.kc-row-err{margin-top:4px;font-size:12px;color:var(--kc-danger)}
.kc-row-err[hidden]{display:none}
.kc-row-right{display:flex;align-items:center;gap:8px;flex:none;color:var(--kc-muted-fg)}
.kc-tag{font-size:10.5px;font-weight:500;padding:1px 7px;border-radius:999px;border:1px solid var(--kc-border);color:var(--kc-muted-fg)}
.kc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px 20px;color:var(--kc-muted-fg);font-size:13px}
.kc-empty .kc-ic{opacity:.35}
.kc-mono{font-family:ui-monospace,"SF Mono",Consolas,monospace;font-size:12px;user-select:text}
.kc-note{font-size:12px;color:var(--kc-muted-fg);margin:-12px 4px 24px}
.kc-actions{display:flex;flex-wrap:wrap;gap:8px;margin:-8px 0 24px}

/* Kontroller (shadcn tarzı) */
.kc-switch{appearance:none;-webkit-appearance:none;margin:0;flex:none;position:relative;width:36px;height:20px;border-radius:999px;cursor:pointer;
  background:var(--kc-input);outline:none;transition:background .15s ease,box-shadow .15s ease}
.kc-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;
  box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .15s ease}
.kc-switch:checked{background:var(--kc-primary)}
.kc-switch:checked::after{transform:translateX(16px)}
.kc-switch:focus-visible{box-shadow:0 0 0 2px var(--kc-card),0 0 0 4px var(--kc-primary)}
.kc-switch:disabled{opacity:.5;cursor:not-allowed}
.kc-check{appearance:none;-webkit-appearance:none;margin:0;flex:none;width:16px;height:16px;border-radius:4px;cursor:pointer;
  border:1px solid color-mix(in srgb,var(--kc-fg) 35%,transparent);background:transparent;display:grid;place-items:center;transition:background .15s,border-color .15s}
.kc-check:checked{background:var(--kc-primary);border-color:var(--kc-primary);
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E");
  background-size:12px;background-position:center;background-repeat:no-repeat}
.kc-check:disabled{opacity:.4;cursor:not-allowed}
.kc-check:focus-visible{outline:2px solid var(--kc-primary);outline-offset:2px}
.kc-btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 12px;border-radius:6px;
  font-size:13px;font-weight:500;white-space:nowrap;cursor:pointer;transition:background .15s,opacity .15s,transform .1s;
  border:1px solid var(--kc-border);background:transparent;color:var(--kc-fg)}
.kc-btn:hover{background:var(--kc-hover)}
.kc-btn:active{transform:scale(.97)}
.kc-btn:focus-visible{outline:2px solid var(--kc-primary);outline-offset:2px}
.kc-btn.kc-primary{background:var(--kc-primary);border-color:transparent;color:var(--kc-primary-fg)}
.kc-btn.kc-primary:hover{opacity:.9}
.kc-btn.kc-sm{height:28px;padding:0 10px;font-size:12px}
.kc-btn:disabled{opacity:.5;cursor:default}
.kc-seg{display:inline-flex;padding:3px;gap:2px;border-radius:8px;background:var(--kc-soft2)}
.kc-seg button{all:unset;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:500;color:var(--kc-muted-fg);cursor:pointer;transition:background .15s,color .15s}
.kc-seg button.kc-on{background:var(--kc-card);color:var(--kc-fg);box-shadow:0 1px 2px rgba(0,0,0,.2)}
.kc-seg button:focus-visible{outline:2px solid var(--kc-primary)}
.kc-input{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;border-radius:6px;border:1px solid var(--kc-border);color:var(--kc-muted-fg);width:180px}
.kc-input input{all:unset;flex:1;min-width:0;font-size:12.5px;color:var(--kc-fg)}
.kc-input:focus-within{border-color:color-mix(in srgb,var(--kc-primary) 60%,transparent)}
.kc-keys{display:inline-flex;gap:4px}
.kc-keys .kc-kbd{display:inline-flex;height:22px;font-size:11px}
.kc-status{display:inline-flex;align-items:center;gap:6px;font-size:12px}
.kc-status::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
.kc-status.ok{color:var(--kc-success)} .kc-status.warn{color:#f59e0b} .kc-status.err{color:var(--kc-danger)} .kc-status.idle{color:var(--kc-muted-fg)}
.kc-notes{white-space:pre-wrap;padding:16px 20px;font-size:12.5px;color:var(--kc-muted-fg);max-height:220px;overflow:auto;user-select:text}

/* Komut paleti */
.kc-palette{position:absolute;inset:0;z-index:50;display:flex;align-items:flex-start;justify-content:center;padding:15vh 16px 0;
  background:color-mix(in srgb,var(--kc-bg) 40%,transparent);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.kc-palette[hidden]{display:none}
.kc-pal{position:relative;width:100%;max-width:576px;background:var(--kc-card);border:1px solid var(--kc-border);border-radius:12px;
  box-shadow:0 25px 50px -12px rgba(0,0,0,.5);overflow:hidden;animation:kc-pop .2s ease-out}
.kc-pal-input{display:flex;align-items:center;padding:0 16px;border-bottom:1px solid var(--kc-border);color:var(--kc-muted-fg)}
.kc-pal-input input{all:unset;flex:1;padding:16px 12px;font-size:14px;color:var(--kc-fg)}
.kc-pal-input input::placeholder{color:var(--kc-muted-fg);opacity:.6}
.kc-pal-input .kc-kbd{cursor:pointer;margin-left:8px}
.kc-pal-list{max-height:340px;overflow-y:auto;padding:6px}
.kc-pal-group{padding:8px 10px 4px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--kc-muted-fg);opacity:.6}
.kc-pal-item{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:6px;font-size:13px;color:var(--kc-fg);cursor:pointer}
.kc-pal-item .kc-ic{color:var(--kc-muted-fg)}
.kc-pal-item.kc-sel{background:var(--kc-active)}
.kc-pal-item span:first-of-type{flex:1}
.kc-pal-meta{font-size:11.5px;color:var(--kc-muted-fg)}

/* Bildirim */
.kc-toast{position:fixed;right:24px;bottom:24px;z-index:2147483200;display:flex;align-items:center;gap:12px;max-width:380px;padding:12px 14px 12px 16px;
  font-family:"gg sans","Inter","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;font-size:13px;color:#fafafa;background:#111113;
  border:1px solid rgba(255,255,255,.1);border-radius:10px;box-shadow:0 16px 40px rgba(0,0,0,.45);animation:kc-toast-in .25s cubic-bezier(.2,.8,.2,1)}
:root.theme-light .kc-toast{color:#09090b;background:#fff;border-color:rgba(0,0,0,.08);box-shadow:0 16px 40px rgba(0,0,0,.15)}
.kc-toast button{all:unset;padding:5px 10px;border-radius:6px;font-weight:500;font-size:12.5px;background:var(--krizcord-accent,#7c5cff);color:#fff;cursor:pointer;white-space:nowrap}
.kc-toast.kc-out{opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}
@keyframes kc-toast-in{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}

@media (max-width:760px){.kc-searchbar{width:160px}.kc-grid2{grid-template-columns:1fr}.kc-content{padding:20px}}
@media (prefers-reduced-motion:reduce){
  .kc-window,.kc-open .kc-window{transform:none}
  .kc-page.kc-animate,.kc-pal,.kc-ws-menu,.kc-toast{animation:none}
  .kc-sidewrap,.kc-children{transition:none}
}
@media (prefers-reduced-transparency:reduce){.kc-overlay,.kc-palette{-webkit-backdrop-filter:none;backdrop-filter:none}}
`;

// --- DOM yardımcıları ------------------------------------------------------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === "") continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

const extLink = (href, cls, ...children) => el("a", { href, target: "_blank", rel: "noopener noreferrer", class: cls }, ...children);
const kbds = (parts) => el("span", { class: "kc-keys" }, parts.map((p) => el("span", { class: "kc-kbd" }, p)));
const initial = (name) => (Array.from(name.trim())[0] || "?").toLocaleUpperCase("tr");
const lower = (s) => String(s).toLocaleLowerCase("tr");

function switchEl(checked, onChange, label) {
  const input = el("input", { type: "checkbox", role: "switch", class: "kc-switch", "aria-label": label });
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked, input));
  return input;
}

function pageHead(title, desc) {
  return el("div", { class: "kc-pagehead" }, el("h2", {}, title), desc && el("p", {}, desc));
}

function card({ title, desc, right, foot }, ...rows) {
  return el(
    "section",
    { class: "kc-card" },
    title && el("div", { class: "kc-cardhead" }, el("div", {}, el("h3", {}, title), desc && el("p", {}, desc)), right),
    rows,
    foot && el("div", { class: "kc-cardfoot" }, foot)
  );
}

function row({ icon, letter, img, title, tag, sub, err, right, onClick, href }) {
  const lead = el(
    "span",
    { class: "kc-row-ic", "aria-hidden": "true" },
    icon ? svg(icon, { size: 16 }) : img ? el("img", { src: img, alt: "" }) : letter
  );
  const body = [
    lead,
    el("div", { class: "kc-row-text" }, el("div", { class: "kc-row-title" }, title, tag && el("span", { class: "kc-tag" }, tag)), sub && el("div", { class: "kc-row-sub" }, sub), err),
    right && el("div", { class: "kc-row-right" }, right),
  ];
  if (href) return extLink(href, "kc-row", body);
  if (onClick) return el("button", { type: "button", class: "kc-row", onclick: onClick }, body);
  return el("div", { class: "kc-row" }, body);
}

const emptyState = (text, icon = "command") => el("div", { class: "kc-empty" }, svg(icon, { size: 24 }), text);

// --- Gezinme modeli ------------------------------------------------------------

const nav = () => [
  {
    items: [
      { id: "search", title: t("nav.search"), icon: "search", shortcut: "Ctrl F", action: () => openPalette() },
      { id: "overview", title: t("nav.overview"), icon: "layoutDashboard" },
    ],
  },
  {
    heading: t("nav.customize"),
    items: [
      {
        id: "plugins",
        title: t("nav.plugins"),
        icon: "puzzle",
        badge: () => plugins.list().filter((p) => p.enabled).length || null,
        children: [
          { id: "plugins:builtin", title: t("nav.builtin"), icon: "hash" },
          { id: "plugins:user", title: t("nav.user"), icon: "hash" },
        ],
      },
      { id: "themes", title: t("nav.themes"), icon: "palette" },
      { id: "circle", title: t("nav.circle"), icon: "circleDot", shortcut: () => circle.formatShortcut(circle.getShortcut()).join(" ") },
      { id: "badges", title: t("nav.badges"), icon: "award" },
    ],
  },
  {
    heading: t("nav.system"),
    items: [{ id: "updates", title: t("nav.updates"), icon: "download", badge: () => (updateState.status === "ready" ? "1" : null) }],
  },
];

const bottomNav = () => [
  { id: "about", title: t("nav.about"), icon: "info" },
  { id: "close", title: t("nav.close"), icon: "x", action: () => hide() },
];

function titleOf(id) {
  const all = [...nav().flatMap((g) => g.items), ...bottomNav()];
  for (const it of all) {
    if (it.id === id) return it.title;
    for (const c of it.children || []) if (c.id === id) return `${it.title} / ${c.title}`;
  }
  return t("nav.overview");
}

// --- Durum ---------------------------------------------------------------

let overlay = null;
let win = null;
let navScroll = null;
let navBottom = null;
let crumbEl = null;
let contentEl = null;
let paletteEl = null;
let wsEl = null;
let open = false;
let activeId = "overview";
let pluginQuery = "";
let sidebarOpen = true;
const expanded = new Set(["plugins"]);
const navNodes = new Map(); // id -> { btn, badge, item }
let updateState = { status: "idle" };

// --- Kenar çubuğu ------------------------------------------------------------

function buildNavItem(item, level = 0) {
  const hasChildren = !!item.children;
  const left = el("div", { class: "kc-navleft" }, svg(item.icon, { size: 16 }), el("span", { class: "kc-navtitle" }, item.title));
  const shortcut = typeof item.shortcut === "function" ? item.shortcut() : item.shortcut;
  const badge = el("span", { class: "kc-pill" });
  badge.hidden = true;
  const right = el(
    "div",
    { class: "kc-navright" },
    shortcut && el("span", { class: "kc-kbd" }, shortcut),
    item.badge && badge,
    hasChildren && svg("chevronRight", { size: 14, stroke: 2, cls: "kc-navchev" })
  );
  const btn = el("button", { type: "button", class: "kc-navbtn", "aria-expanded": hasChildren ? "false" : null }, left, right);
  const wrap = el("div", { class: "kc-navitem" }, btn);

  btn.addEventListener("click", () => {
    if (item.action) return item.action();
    if (hasChildren) {
      // Ebeveyn: ilk tıkta sayfaya gider ve açılır; zaten aktifse sadece açar/kapatır
      if (activeId !== item.id && !activeId.startsWith(item.id + ":")) {
        expanded.add(item.id);
        go(item.id);
      } else {
        expanded.has(item.id) ? expanded.delete(item.id) : expanded.add(item.id);
      }
      syncNav();
      return;
    }
    go(item.id);
  });

  if (hasChildren) {
    const inner = el("div", { class: "kc-children-inner" }, el("div", { class: "kc-children-line" }), item.children.map((c) => buildNavItem(c, level + 1)));
    wrap.append(el("div", { class: "kc-children" }, inner));
  }
  navNodes.set(item.id, { btn, badge, item, wrap });
  return wrap;
}

function buildSidebar() {
  navNodes.clear();
  navScroll.replaceChildren(
    ...nav().map((g) =>
      el("div", { class: "kc-navgroup" }, g.heading && el("span", { class: "kc-navhead" }, g.heading), g.items.map((i) => buildNavItem(i)))
    )
  );
  navBottom.replaceChildren(...bottomNav().map((i) => buildNavItem(i)));
  syncNav();
}

// Sınıfları yerinde günceller (yeniden çizmez) ki açılır menü geçişleri akıcı kalsın.
function syncNav() {
  for (const [id, n] of navNodes) {
    const on = id === activeId;
    n.btn.classList.toggle("kc-on", on);
    n.btn.setAttribute("aria-current", on ? "page" : "false");
    if (n.item.children) {
      const isOpen = expanded.has(id);
      n.wrap.classList.toggle("kc-expanded", isOpen);
      n.btn.setAttribute("aria-expanded", String(isOpen));
    }
    if (n.item.badge) {
      const v = n.item.badge();
      n.badge.textContent = v ?? "";
      n.badge.hidden = v == null;
    }
  }
}

function buildIdentity() {
  const menu = () => {
    const close = () => wsEl.classList.remove("kc-on") || renderIdentity();
    const items = [
      extLink(BRAND.links.github, "kc-menu-item", svg("code", { size: 15 }), "GitHub"),
      extLink(BRAND.links.kick, "kc-menu-item", svg("radio", { size: 15 }), "Kick · MaliKriz"),
      el("button", { type: "button", class: "kc-menu-item", onclick: () => { native().openFolder("data"); close(); } }, svg("folderOpen", { size: 15 }), t("ident.dataFolder")),
      el("div", { class: "kc-menu-sep" }),
      el("button", { type: "button", class: "kc-menu-item", onclick: () => location.reload() }, svg("rotateCcw", { size: 15 }), t("ident.reload")),
    ];
    return [el("div", { class: "kc-ws-catch", onclick: close }), el("div", { class: "kc-ws-menu", role: "menu" }, items)];
  };
  const renderIdentity = () => {
    const isOn = wsEl.classList.contains("kc-on");
    const btn = el(
      "button",
      { type: "button", class: "kc-ws-btn", "aria-haspopup": "menu", "aria-expanded": String(isOn) },
      el("div", { class: "kc-ws-left" },
        el("span", { class: "kc-avatar", "aria-hidden": "true" }, "K"),
        el("div", {}, el("span", { class: "kc-ws-name" }, BRAND.name), el("span", { class: "kc-ws-sub" }, `${t("ident.version")} ${VERSION}`))),
      svg("chevronDown", { size: 16, cls: "kc-ws-chev" })
    );
    btn.addEventListener("click", () => {
      wsEl.classList.toggle("kc-on");
      renderIdentity();
    });
    wsEl.replaceChildren(...[btn, isOn && menu()].flat().filter(Boolean));
  };
  wsEl = el("div", { class: "kc-ws" });
  renderIdentity();
  return wsEl;
}

// --- Sayfalar ------------------------------------------------------------

function overviewPage() {
  const all = plugins.list();
  const on = all.filter((p) => p.enabled).length;
  const th = themes.list();
  const thOn = themes.isPaused() ? 0 : th.filter((x) => x.enabled).length;
  const mine = badges.myBadges();
  return [
    pageHead(t("nav.overview"), t("overview.desc")),
    el("div", { class: "kc-grid2" },
      el("button", { type: "button", class: "kc-stat", onclick: () => go("plugins") },
        el("div", { class: "kc-stat-top" }, t("overview.plugins"), svg("puzzle", { size: 16 })),
        el("div", { class: "kc-stat-val" }, String(on), el("small", {}, ` / ${all.length}`)),
        el("div", { class: "kc-stat-foot" }, t("overview.manage"), svg("chevronRight", { size: 13 }))),
      el("button", { type: "button", class: "kc-stat", onclick: () => go("themes") },
        el("div", { class: "kc-stat-top" }, t("overview.themes"), svg("palette", { size: 16 })),
        el("div", { class: "kc-stat-val" }, String(thOn), el("small", {}, ` / ${th.length}`)),
        el("div", { class: "kc-stat-foot" }, t("overview.manage"), svg("chevronRight", { size: 13 })))),
    card(
      { title: t("overview.status") },
      row({ icon: "download", title: t("overview.version"), sub: `Krizcord ${VERSION}`, right: [updateBadge(), svg("chevronRight", { size: 14 })], onClick: () => go("updates") }),
      row({ icon: "circleDot", title: t("overview.circle"), sub: t("circle.shortcutSub"), right: kbds(circle.formatShortcut(circle.getShortcut())), onClick: () => go("circle") }),
      row({ icon: "command", title: t("overview.panel"), right: kbds(["Ctrl", "Shift", "K"]) }),
      row({
        icon: "award",
        title: t("overview.badge"),
        sub: mine.length ? mine.map((b) => b.name).join(", ") : t("overview.noBadge"),
        right: svg("chevronRight", { size: 14 }),
        onClick: () => go("badges"),
      })
    ),
  ];
}

function pluginRow(p) {
  const errText = (e) => (e ? `${t("plugins.error")}: ${e}` : "");
  const err = el("div", { class: "kc-row-err" }, errText(p.error));
  err.hidden = !p.error;
  const sw =
    !p.broken &&
    switchEl(
      p.enabled,
      async (on, input) => {
        input.disabled = true;
        await plugins.setEnabled(p.name, on);
        input.disabled = false;
        const cur = plugins.list().find((x) => x.name === p.name);
        err.textContent = errText(cur?.error);
        err.hidden = !cur?.error;
        syncNav();
      },
      p.name
    );
  const by = p.source !== "builtin" && p.authors.length ? ` · ${p.authors.join(", ")}` : "";
  return row({
    letter: initial(p.name),
    title: p.name,
    tag: p.source === "builtin" ? t("plugins.builtin") : t("plugins.user"),
    sub: (p.description || "") + by,
    err,
    right: sw,
  });
}

function pluginsPage(filter) {
  const listEl = el("div", {});
  const renderList = () => {
    const items = plugins
      .list()
      .filter((p) => filter === "all" || (filter === "builtin" ? p.source === "builtin" : p.source !== "builtin"))
      .filter((p) => !pluginQuery || lower(`${p.name} ${p.description}`).includes(pluginQuery));
    listEl.replaceChildren(...(items.length ? items.map(pluginRow) : [emptyState(t("plugins.noResult"), "puzzle")]));
  };
  renderList();

  const seg = el(
    "div",
    { class: "kc-seg", role: "tablist" },
    [
      ["plugins", t("plugins.all"), "all"],
      ["plugins:builtin", t("nav.builtin"), "builtin"],
      ["plugins:user", t("nav.user"), "user"],
    ].map(([id, label, f]) =>
      el("button", { type: "button", role: "tab", "aria-selected": String(filter === f), class: filter === f ? "kc-on" : "", onclick: () => go(id) }, label)
    )
  );
  const input = el("input", { type: "text", placeholder: t("plugins.filter"), "aria-label": t("plugins.filter"), spellcheck: "false" });
  input.value = pluginQuery;
  input.addEventListener("input", () => {
    pluginQuery = lower(input.value.trim());
    renderList();
  });

  return [
    pageHead(t("nav.plugins"), t("plugins.desc")),
    card({ title: seg, right: el("label", { class: "kc-input" }, svg("search", { size: 14 }), input) }, listEl),
    el("p", { class: "kc-note" }, t("plugins.hint")),
    el("div", { class: "kc-actions" },
      el("button", { type: "button", class: "kc-btn", onclick: () => native().openFolder("plugins") }, svg("folderOpen", { size: 15 }), t("plugins.openFolder"))),
  ];
}

function themesPage() {
  const items = themes.list();
  return [
    pageHead(t("nav.themes"), t("themes.desc")),
    themes.isPaused() && el("p", { class: "kc-note", style: "margin:-12px 4px 16px" }, t("themes.paused")),
    card(
      {
        title: t("nav.themes"),
        right: el("div", { class: "kc-actions", style: "margin:0" },
          el("button", { type: "button", class: "kc-btn kc-sm", onclick: () => native().openFolder("themes") }, svg("folderOpen", { size: 14 }), t("themes.openFolder")),
          el("button", { type: "button", class: "kc-btn kc-sm", onclick: async () => { await themes.reload(); renderContent(false); } }, svg("refreshCw", { size: 14 }), t("themes.reload"))),
      },
      items.length
        ? items.map((th) =>
            row({ icon: "palette", title: th.file.replace(/\.css$/i, ""), sub: `${th.file} · ${t("themes.file")}`, right: switchEl(th.enabled, (on) => themes.setEnabled(th.file, on), th.file) })
          )
        : emptyState(t("themes.empty"), "palette")
    ),
    el("p", { class: "kc-note" }, t("themes.hint")),
  ];
}

function circlePage() {
  const sc = circle.getShortcut();
  const keysHolder = el("span", {}, kbds(circle.formatShortcut(sc)));
  const msg = el("div", { class: "kc-row-err" });
  msg.hidden = true;
  const changeBtn = el("button", { type: "button", class: "kc-btn kc-sm" }, t("circle.change"));
  let stopRec = null;
  changeBtn.addEventListener("click", () => {
    if (stopRec) return stopRec();
    changeBtn.textContent = t("circle.recording");
    msg.hidden = true;
    circle.setRecording(true);
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") return stopRec();
      const next = circle.shortcutFromEvent(e);
      if (!next) return; // sadece değiştirici tuş basıldı, devam bekle
      if (!next.ctrl && !next.alt && !next.shift) {
        msg.textContent = t("circle.needModifier");
        msg.hidden = false;
        return;
      }
      if (next.ctrl && next.shift && !next.alt && next.code === "KeyK") {
        msg.textContent = t("circle.conflict");
        msg.hidden = false;
        return;
      }
      circle.setShortcut(next);
      keysHolder.replaceChildren(kbds(circle.formatShortcut(next)));
      stopRec();
      buildSidebar();
    };
    window.addEventListener("keydown", onKey, true);
    stopRec = () => {
      window.removeEventListener("keydown", onKey, true);
      circle.setRecording(false);
      changeBtn.textContent = t("circle.change");
      stopRec = null;
    };
  });

  const selected = circle.selectedIds();
  const all = circle.allActions();
  const ordered = [...selected.map((id) => all.find((a) => a.id === id)).filter(Boolean), ...all.filter((a) => !selected.includes(a.id))];
  const countEl = el("span", { class: "kc-tag" }, `${selected.length}/${circle.MAX_ITEMS}`);
  const checks = [];
  const refreshChecks = () => {
    const sel = circle.selectedIds();
    countEl.textContent = `${sel.length}/${circle.MAX_ITEMS}`;
    for (const { box, id } of checks) {
      box.checked = sel.includes(id);
      box.disabled = !box.checked && sel.length >= circle.MAX_ITEMS;
    }
  };

  const rows = ordered.map((a) => {
    const box = el("input", { type: "checkbox", class: "kc-check", "aria-label": a.label });
    box.addEventListener("change", () => {
      if (!circle.setSelected(a.id, box.checked)) box.checked = false;
      refreshChecks();
    });
    checks.push({ box, id: a.id });
    return row({
      icon: a.kind === "plugin" ? null : a.icon || "zap",
      letter: a.kind === "plugin" ? a.letter : null,
      title: a.label,
      sub: a.kind === "plugin" ? t("circle.kindPlugin") : t("circle.kindAction"),
      right: box,
    });
  });
  refreshChecks();

  return [
    pageHead(t("nav.circle"), t("circle.desc")),
    card(
      { title: t("circle.shortcut"), desc: t("circle.shortcutSub") },
      el("div", { class: "kc-row" },
        el("span", { class: "kc-row-ic", "aria-hidden": "true" }, svg("keyboard", { size: 16 })),
        el("div", { class: "kc-row-text" }, keysHolder, msg),
        el("div", { class: "kc-row-right" },
          changeBtn,
          el("button", { type: "button", class: "kc-btn kc-sm kc-primary", onclick: () => { hide(); setTimeout(() => circle.open(innerWidth / 2, innerHeight / 2), 160); } }, t("circle.try"))))
    ),
    card({ title: t("circle.items"), desc: t("circle.itemsSub"), right: countEl }, rows),
  ];
}

function badgesPage() {
  const id = badges.myId();
  const mine = badges.myBadges();
  const defs = badges.definitions();
  const copy =
    id &&
    el("button", {
      type: "button",
      class: "kc-btn kc-sm",
      onclick: async (e) => {
        const b = e.currentTarget;
        try { await navigator.clipboard.writeText(id); } catch { /* geç */ }
        b.lastChild.textContent = t("badges.copied");
        setTimeout(() => { b.lastChild.textContent = t("badges.copy"); }, 1600);
      },
    }, svg("copy", { size: 14 }), el("span", {}, t("badges.copy")));
  return [
    pageHead(t("nav.badges"), t("badges.desc")),
    card(
      {},
      row({ icon: "user", title: t("badges.yourId"), sub: el("span", { class: "kc-mono" }, id || t("badges.unknownId")), right: copy }),
      row({
        img: mine.length ? badges.iconUrl(mine[0].color) : null,
        icon: mine.length ? null : "award",
        title: t("badges.mine"),
        sub: mine.length ? mine.map((b) => b.name).join(", ") : t("badges.none"),
      })
    ),
    card(
      {
        title: t("badges.types"),
        right: el("button", { type: "button", class: "kc-btn kc-sm", onclick: async () => { await badges.refresh(); renderContent(false); } },
          svg("refreshCw", { size: 14 }), `${t("badges.refresh")} · ${badges.holderCount()} ${t("badges.users")}`),
      },
      defs.length ? defs.map((d) => row({ img: d.iconUrl, title: d.name })) : emptyState(t("badges.typesEmpty"), "award")
    ),
    el("p", { class: "kc-note" }, t("badges.about")),
  ];
}

function updateBadge() {
  const s = updateState;
  const map = {
    idle: ["idle", t("updates.status.idle")],
    checking: ["idle", t("updates.status.checking")],
    "up-to-date": ["ok", t("updates.status.upToDate")],
    available: ["warn", `${t("updates.status.available")}: ${s.latest}`],
    downloading: ["warn", t("updates.status.downloading")],
    ready: ["warn", `${s.latest} ${t("updates.status.ready")}`],
    "no-release": ["idle", t("updates.status.noRelease")],
    error: ["err", t("updates.status.error")],
  };
  const [cls, text] = map[s.status] || map.idle;
  return el("span", { class: "kc-status " + cls }, text);
}

function updatesPage() {
  const s = updateState;
  const busy = s.status === "checking" || s.status === "downloading";
  const action =
    s.status === "ready"
      ? el("button", { type: "button", class: "kc-btn kc-primary", onclick: () => native().relaunch() }, svg("rotateCcw", { size: 15 }), t("updates.restart"))
      : el("button", {
          type: "button",
          class: "kc-btn",
          disabled: busy,
          onclick: async () => {
            updateState = { ...updateState, status: "checking" };
            renderContent(false);
            updateState = await native().checkUpdates();
            renderContent(false);
            syncNav();
          },
        }, svg("refreshCw", { size: 15 }), busy ? t("updates.checking") : t("updates.check"));
  const last = s.checkedAt ? new Date(s.checkedAt).toLocaleString("tr-TR") : t("updates.never");
  return [
    pageHead(t("nav.updates"), t("updates.desc")),
    card(
      {},
      el("div", { class: "kc-row" },
        el("span", { class: "kc-row-ic", "aria-hidden": "true" }, svg("download", { size: 16 })),
        el("div", { class: "kc-row-text" },
          el("div", { class: "kc-row-title" }, `Krizcord ${VERSION}`),
          el("div", { class: "kc-row-sub" }, updateBadge(), s.error ? ` — ${s.error}` : "")),
        el("div", { class: "kc-row-right" }, action)),
      row({
        icon: "zap",
        title: t("updates.auto"),
        sub: t("updates.autoSub"),
        right: switchEl(s.auto !== false, async (on) => { updateState = await native().setAutoUpdate(on); }, t("updates.auto")),
      }),
      row({ icon: "refreshCw", title: t("updates.lastCheck"), sub: last })
    ),
    s.notes && card({ title: `${t("updates.notes")} · ${s.latest}` }, el("div", { class: "kc-notes" }, s.notes)),
  ];
}

function aboutPage() {
  return [
    pageHead(t("nav.about"), t("about.desc")),
    card(
      { title: t("about.shortcuts") },
      row({ icon: "command", title: t("about.panel"), right: kbds(["Ctrl", "Shift", "K"]) }),
      row({ icon: "circleDot", title: t("nav.circle"), right: kbds(circle.formatShortcut(circle.getShortcut())) }),
      row({ icon: "search", title: t("about.palette"), right: kbds(["Ctrl", "F"]) })
    ),
    card(
      { title: t("about.links") },
      row({ icon: "code", title: "GitHub", sub: BRAND.repo, href: BRAND.links.github, right: svg("externalLink", { size: 14 }) }),
      row({ icon: "radio", title: "Kick", sub: "MaliKriz", href: BRAND.links.kick, right: svg("externalLink", { size: 14 }) }),
      row({ icon: "folderOpen", title: t("about.dataFolder"), onClick: () => native().openFolder("data"), right: svg("chevronRight", { size: 14 }) })
    ),
    el("p", { class: "kc-note", style: "margin-top:-8px" }, t("about.warning")),
  ];
}

function renderContent(animate) {
  if (!contentEl) return;
  const [base, sub] = activeId.split(":");
  const page =
    base === "plugins" ? pluginsPage(sub || "all")
    : base === "themes" ? themesPage()
    : base === "circle" ? circlePage()
    : base === "badges" ? badgesPage()
    : base === "updates" ? updatesPage()
    : base === "about" ? aboutPage()
    : overviewPage();
  const scrollTop = contentEl.scrollTop;
  contentEl.replaceChildren(el("div", { class: "kc-page" + (animate ? " kc-animate" : "") }, page));
  if (!animate) contentEl.scrollTop = scrollTop;
  crumbEl.replaceChildren(el("span", {}, BRAND.name), el("span", {}, "/"), el("b", {}, titleOf(activeId)));
}

export function go(id) {
  if (id === activeId) return;
  activeId = id;
  if (id.startsWith("plugins")) expanded.add("plugins");
  if (!id.startsWith("plugins")) pluginQuery = "";
  syncNav();
  renderContent(true);
  contentEl.scrollTop = 0;
}

// --- Komut paleti --------------------------------------------------------------

function paletteEntries() {
  const entries = [];
  const pages = [...nav().flatMap((g) => g.items.flatMap((i) => [i, ...(i.children || [])])), ...bottomNav()].filter((i) => !i.action);
  for (const p of pages) entries.push({ group: t("palette.pages"), icon: p.icon, label: titleOf(p.id), run: () => go(p.id) });
  for (const p of plugins.list()) {
    if (p.broken) continue;
    entries.push({
      group: t("palette.plugins"),
      icon: "puzzle",
      label: p.name,
      meta: p.enabled ? t("palette.on") : t("palette.off"),
      run: async () => { await plugins.setEnabled(p.name, !p.enabled); syncNav(); renderContent(false); },
      keepOpen: true,
    });
  }
  for (const th of themes.list()) {
    entries.push({
      group: t("palette.themes"),
      icon: "palette",
      label: th.file.replace(/\.css$/i, ""),
      meta: th.enabled ? t("palette.on") : t("palette.off"),
      run: () => { themes.setEnabled(th.file, !th.enabled); renderContent(false); },
      keepOpen: true,
    });
  }
  for (const a of circle.allActions()) {
    if (a.kind !== "action" || a.id === "panel") continue;
    entries.push({ group: t("palette.actions"), icon: a.icon || "zap", label: a.label, run: () => a.run() });
  }
  return entries;
}

function openPalette() {
  if (!paletteEl) return;
  paletteEl.hidden = false;
  let sel = 0;
  let results = [];
  const input = el("input", { type: "text", placeholder: t("palette.placeholder"), "aria-label": t("nav.search"), spellcheck: "false" });
  const list = el("div", { class: "kc-pal-list", role: "listbox" });

  const render = () => {
    const q = lower(input.value.trim());
    const all = paletteEntries();
    results = q ? all.filter((e) => lower(`${e.label} ${e.group}`).includes(q)) : all.filter((e) => e.group === t("palette.pages") || e.group === t("palette.actions"));
    sel = Math.min(sel, Math.max(0, results.length - 1));
    if (!results.length) {
      list.replaceChildren(el("div", { class: "kc-empty", style: "padding:32px 8px" }, svg("command", { size: 24 }), q ? t("palette.noResult") : t("palette.empty")));
      return;
    }
    const nodes = [];
    let lastGroup = null;
    results.forEach((e, i) => {
      if (e.group !== lastGroup) {
        nodes.push(el("div", { class: "kc-pal-group" }, e.group));
        lastGroup = e.group;
      }
      const item = el("button", { type: "button", class: "kc-pal-item" + (i === sel ? " kc-sel" : ""), role: "option", "aria-selected": String(i === sel) },
        svg(e.icon || "zap", { size: 16 }), el("span", {}, e.label), e.meta && el("span", { class: "kc-pal-meta" }, e.meta));
      item.addEventListener("mousemove", () => { if (sel !== i) { sel = i; render(); } });
      item.addEventListener("click", () => runEntry(e));
      nodes.push(item);
    });
    list.replaceChildren(...nodes);
    list.querySelector(".kc-sel")?.scrollIntoView({ block: "nearest" });
  };

  const runEntry = async (e) => {
    await e.run();
    if (e.keepOpen) render();
    else closePalette();
  };

  input.addEventListener("input", () => { sel = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(1, results.length); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + results.length) % Math.max(1, results.length); render(); }
    else if (e.key === "Enter" && results[sel]) { e.preventDefault(); runEntry(results[sel]); }
  });

  const pal = el("div", { class: "kc-pal", role: "dialog", "aria-label": t("nav.search") },
    el("div", { class: "kc-pal-input" },
      svg("search", { size: 18 }),
      input,
      el("span", { class: "kc-kbd", onclick: closePalette }, "ESC"),
      el("button", { type: "button", class: "kc-iconbtn", style: "margin-left:8px", "aria-label": t("nav.close"), onclick: closePalette }, svg("x", { size: 18 }))),
    list);
  paletteEl.replaceChildren(el("div", { style: "position:absolute;inset:0", onclick: closePalette }), pal);
  render();
  requestAnimationFrame(() => input.focus());
}

function closePalette() {
  if (!paletteEl || paletteEl.hidden) return false;
  paletteEl.hidden = true;
  paletteEl.replaceChildren();
  win?.focus({ preventScroll: true });
  return true;
}

// --- Pencere -------------------------------------------------------------

function build() {
  overlay = el("div", { class: "kc-overlay", "aria-hidden": "true" });
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) hide(); });
  // Panelde yazarken Discord'un kısayolları (yazınca mesaj kutusuna atlama vb.) tetiklenmesin.
  for (const type of ["keydown", "keyup", "keypress"]) overlay.addEventListener(type, (e) => e.stopPropagation());

  navScroll = el("div", { class: "kc-navscroll" });
  navBottom = el("div", { class: "kc-navbottom" });
  const side = el("div", { class: "kc-sidewrap" }, el("nav", { class: "kc-side", "aria-label": BRAND.name }, buildIdentity(), navScroll, navBottom));

  const toggleBtn = el("button", { type: "button", class: "kc-iconbtn", "aria-label": t("nav.toggleSidebar"), title: t("nav.toggleSidebar") });
  const setToggleIcon = () => toggleBtn.replaceChildren(svg(sidebarOpen ? "panelLeftClose" : "panelLeftOpen", { size: 18 }));
  setToggleIcon();
  toggleBtn.addEventListener("click", () => {
    sidebarOpen = !sidebarOpen;
    win.classList.toggle("kc-collapsed", !sidebarOpen);
    setToggleIcon();
  });

  crumbEl = el("div", { class: "kc-crumb" });
  const top = el("header", { class: "kc-top" },
    el("div", { class: "kc-top-left" }, toggleBtn, crumbEl),
    el("div", { class: "kc-top-right" },
      el("button", { type: "button", class: "kc-searchbar", onclick: openPalette }, svg("search", { size: 15 }), el("span", {}, t("palette.searchBar")), el("span", { class: "kc-kbd" }, "Ctrl F")),
      el("button", { type: "button", class: "kc-iconbtn", "aria-label": t("nav.close"), title: t("nav.close"), onclick: hide }, svg("x", { size: 18 }))));

  contentEl = el("div", { class: "kc-content" });
  paletteEl = el("div", { class: "kc-palette" });
  paletteEl.hidden = true;
  const main = el("main", { class: "kc-main" }, top, contentEl);

  win = el("div", { class: "kc-window", role: "dialog", "aria-modal": "true", "aria-label": BRAND.name, tabindex: "-1" }, side, main, paletteEl);
  overlay.append(win);
  document.body.append(overlay);
  buildSidebar();
  renderContent(false);
}

export function show(page) {
  if (!overlay) return;
  open = true;
  if (page) activeId = page;
  buildSidebar(); // eklenti sayısı, kısayol gibi canlı bilgiler güncel olsun
  renderContent(false);
  native()?.updateStatus?.().then(setUpdateState, () => {});
  overlay.classList.add("kc-open");
  overlay.removeAttribute("aria-hidden");
  requestAnimationFrame(() => win.focus({ preventScroll: true }));
}

export function hide() {
  if (!overlay) return;
  open = false;
  closePalette();
  overlay.classList.remove("kc-open");
  overlay.setAttribute("aria-hidden", "true");
  if (overlay.contains(document.activeElement)) document.activeElement.blur();
}

export const toggle = () => (open ? hide() : show());
export const isOpen = () => open;

export function setUpdateState(s) {
  updateState = s || { status: "idle" };
  if (!overlay) return;
  syncNav();
  if (open && (activeId === "updates" || activeId === "overview")) renderContent(false);
}

// --- Bildirim (toast) ----------------------------------------------------------

let toastEl = null;
let toastTimer = null;

export function toast(message, action) {
  toastEl?.remove();
  clearTimeout(toastTimer);
  toastEl = el("div", { class: "kc-toast", role: "status" }, el("span", {}, message),
    action && el("button", { type: "button", onclick: () => { action.run(); dismiss(); } }, action.label));
  document.body.append(toastEl);
  const dismiss = () => {
    const node = toastEl;
    if (!node) return;
    node.classList.add("kc-out");
    setTimeout(() => node.remove(), 220);
    if (toastEl === node) toastEl = null;
  };
  toastTimer = setTimeout(dismiss, action ? 12000 : 2600);
}

// --- Kullanıcı Ayarları kenar çubuğuna "Krizcord" girişi -----------------------

let sidebarLogged = false;
let sidebarTimer = null;

function injectSidebarEntry() {
  sidebarTimer = null;
  for (const list of document.querySelectorAll('[role="tablist"]')) {
    if (list.closest(".kc-overlay")) continue;
    if (list.querySelector(".kc-sidebar-item")) return;
    const tabsEls = [...list.querySelectorAll('[role="tab"]')];
    if (tabsEls.length < 6) continue; // kullanıcı ayarları değil
    const template = tabsEls.find((n) => n.getAttribute("aria-selected") !== "true") || tabsEls[0];
    const item = template.cloneNode(true);
    for (const attr of ["id", "data-list-item-id", "aria-controls", "aria-label", "href"]) item.removeAttribute(attr);
    item.setAttribute("aria-selected", "false");
    item.classList.add("kc-sidebar-item");
    item.style.cursor = "pointer";
    item.textContent = t("sidebar.entry");
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      show();
    });
    tabsEls[tabsEls.length - 1].before(item);
    if (!sidebarLogged) {
      sidebarLogged = true;
      native()?.log?.("ayar menüsüne giriş eklendi, sekme sayısı:", tabsEls.length);
    }
    return;
  }
}

function scheduleSidebar() {
  if (sidebarTimer) return;
  sidebarTimer = setTimeout(injectSidebarEntry, 300);
}

// --- Başlat ------------------------------------------------------------

export function mount() {
  if (document.getElementById("krizcord-ui-style")) return;
  document.head.appendChild(el("style", { id: "krizcord-ui-style" }, CSS + badges.CSS));
  build();

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === "KeyK") {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      } else if (open && e.ctrlKey && !e.shiftKey && !e.altKey && e.code === "KeyF") {
        e.preventDefault();
        e.stopPropagation();
        openPalette();
      } else if (open && e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (!closePalette()) hide();
      }
    },
    true
  );

  new MutationObserver(scheduleSidebar).observe(document.body, { childList: true, subtree: true });
}
