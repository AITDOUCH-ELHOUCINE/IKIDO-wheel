'use client';

import { useEffect } from 'react';
import { initWheel } from '@/lib/wheelEngine';

export default function WheelApp() {
  useEffect(() => {
    initWheel();
  }, []);

  return (
    <>
      {/* ========== TOP BAR ========== */}
      <header className="topbar">
        <a className="brand" href="#" id="brand">
          <svg className="kmark" viewBox="0 0 100 100" aria-hidden="true"><path className="k-dark" d="M0 0h30L0 30zM0 44 30 14v52L4 100H0z"/><path className="k-teal" d="M30 66 96 0H66L30 36zM48 58l42 42H60L33 73z"/></svg>
          <span className="brand-text"><b>IKIDO</b><small>wheel</small></span>
        </a>
        <button className="menu-toggle" id="menuToggle" aria-label="Menu">
          <svg viewBox="0 0 24 24"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
        </button>
        <nav className="menu" id="menu">
          <button data-action="customize"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>Customize</button>
          <button data-action="fullscreen" title="Fullscreen"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg><span className="label-sm">Fullscreen</span></button>
          <div className="dropdown">
            <button data-action="more">More<svg className="caret" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></button>
            <div className="dropdown-menu" id="moreMenu">
              <button data-action="theme">🌓 Toggle dark / light</button>
              <button data-action="clear-results">🧹 Clear results</button>
              <button data-action="reset-settings">↺ Reset settings</button>
              <button data-action="about">ℹ️ About</button>
            </div>
          </div>
        </nav>
      </header>
    
      {/* ========== MAIN ========== */}
      <main className="stage" id="stage">
        <div className="bg-glow"></div>
    
        <section className="wheel-area" id="wheelArea">
          <button className="round-btn edit-btn" id="editTitleBtn" title="Edit title">
            <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <div className="wheel-title" id="wheelTitle"></div>
          <div className="wheel-wrap" id="wheelWrap">
            <canvas id="wheel"></canvas>
            <div className="spin-hint" id="spinHint">
              <div className="big">Tap to spin</div>
              <div className="small">Ctrl + Enter works too</div>
            </div>
          </div>
        </section>
    
        <button className="round-btn panel-toggle" id="panelToggle" title="Hide / show">
          <svg viewBox="0 0 24 24"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </button>
    
        <aside className="panel" id="panel">
          <div className="tabs">
            <button className="tab active" data-tab="entries">Entries <span className="badge" id="entriesCount">0</span></button>
            <button className="tab" data-tab="results">Results <span className="badge" id="resultsCount">0</span></button>
          </div>
    
          <div className="tab-body" id="tab-entries">
            <div className="toolbar">
              <button className="btn" id="shuffleBtn"><svg viewBox="0 0 24 24"><path d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>Shuffle</button>
              <button className="btn" id="sortBtn"><svg viewBox="0 0 24 24"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>Sort</button>
              <div className="split">
                <button className="btn" id="addImageBtn"><svg viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z"/></svg>Add image</button>
                <button className="btn caret-btn" id="imageMenuBtn"><svg className="caret" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg></button>
                <div className="dropdown-menu" id="imageMenu">
                  <button id="imgCenter">Center image</button>
                  <button id="imgRemove">Remove center image</button>
                </div>
              </div>
              <input type="file" id="imageInput" accept="image/*" hidden />
            </div>
            <label className="check"><input type="checkbox" id="advancedChk" /> Advanced</label>
    
            <textarea id="entriesText" spellCheck="false" placeholder="Enter one name per line"></textarea>
    
            <div className="adv-list" id="advList" hidden></div>
            <div className="adv-add" id="advAdd" hidden>
              <input type="text" id="advInput" placeholder="Add an entry…" />
              <button className="btn" id="advAddBtn">Add</button>
            </div>
          </div>
    
          <div className="tab-body" id="tab-results" hidden>
            <div className="toolbar">
              <button className="btn" id="sortResultsBtn"><svg viewBox="0 0 24 24"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>Sort</button>
              <button className="btn" id="clearResultsBtn"><svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>Clear</button>
            </div>
            <ol className="results" id="resultsList"></ol>
            <p className="empty" id="resultsEmpty">No results yet. Spin the wheel!</p>
          </div>
    
          <div className="panel-foot">
            <span suppressHydrationWarning>© {new Date().getFullYear()} IKIDO digital. All rights reserved.</span>
            <a href="#" data-action="about">About</a>
          </div>
        </aside>
      </main>
    
      <canvas id="confetti"></canvas>
    
      {/* ========== WINNER DIALOG ========== */}
      <div className="modal" id="winnerModal" hidden>
        <div className="dialog winner">
          <div className="dialog-head" id="winnerHead">And the winner is…</div>
          <div className="winner-name" id="winnerName"></div>
          <div className="dialog-foot">
            <button className="btn-text" id="winnerClose">Close</button>
            <button className="btn-primary" id="winnerRemove">Remove</button>
          </div>
        </div>
      </div>
    
      {/* ========== CUSTOMIZE ========== */}
      <div className="modal" id="customizeModal" hidden>
        <div className="dialog wide">
          <div className="dialog-head plain">Customize</div>
          <div className="ctabs">
            <button className="ctab active" data-ctab="during">During spin</button>
            <button className="ctab" data-ctab="after">After spin</button>
            <button className="ctab" data-ctab="appearance">Appearance</button>
          </div>
          <div className="dialog-body">
            <div className="cpane" id="c-during">
              <label className="field">Sound
                <select id="setTickSound">
                  <option value="tick">Ticking sound</option>
                  <option value="soft">Soft ticking</option>
                  <option value="none">No sound</option>
                </select>
              </label>
              <label className="field">Volume <span className="val" id="volumeVal"></span>
                <input type="range" id="setVolume" min="0" max="100" />
              </label>
              <label className="field">Spin time (seconds) <span className="val" id="spinTimeVal"></span>
                <input type="range" id="setSpinTime" min="1" max="60" />
              </label>
              <label className="field">Max number of names visible on the wheel <span className="val" id="maxNamesVal"></span>
                <input type="range" id="setMaxNames" min="4" max="1000" />
              </label>
            </div>
            <div className="cpane" id="c-after" hidden>
              <label className="field">Sound
                <select id="setWinSound">
                  <option value="applause">Small crowd applause</option>
                  <option value="fanfare">Fanfare</option>
                  <option value="both">Fanfare + applause</option>
                  <option value="none">No sound</option>
                </select>
              </label>
              <label className="check"><input type="checkbox" id="setConfetti" /> Launch confetti</label>
              <label className="check"><input type="checkbox" id="setPopup" /> Display popup with message</label>
              <label className="field">Popup message
                <input type="text" id="setMessage" maxLength="60" />
              </label>
              <label className="check"><input type="checkbox" id="setRemoveBtn" /> Display the "Remove" button</label>
              <label className="check"><input type="checkbox" id="setAutoRemove" /> Auto-remove winner after 5 seconds</label>
            </div>
            <div className="cpane" id="c-appearance" hidden>
              <div className="field">Color theme</div>
              <div className="palettes" id="palettes"></div>
              <label className="check"><input type="checkbox" id="setShadow" /> Drop shadow</label>
              <label className="check"><input type="checkbox" id="setIdle" /> Slowly rotate wheel when idle</label>
              <label className="check"><input type="checkbox" id="setBg" /> Animated background glow</label>
            </div>
          </div>
          <div className="dialog-foot">
            <button className="btn-text" data-close="">Cancel</button>
            <button className="btn-primary" id="customizeOk">OK</button>
          </div>
        </div>
      </div>
    
      {/* ========== EDIT TITLE ========== */}
      <div className="modal" id="titleModal" hidden>
        <div className="dialog">
          <div className="dialog-head plain">Title and description</div>
          <div className="dialog-body">
            <label className="field">Title
              <input type="text" id="titleInput" maxLength="60" />
            </label>
            <label className="field">Description
              <textarea id="descInput" rows="3" maxLength="300"></textarea>
            </label>
          </div>
          <div className="dialog-foot">
            <button className="btn-text" data-close="">Cancel</button>
            <button className="btn-primary" id="titleOk">OK</button>
          </div>
        </div>
      </div>
    
      {/* ========== ABOUT ========== */}
      <div className="modal" id="aboutModal" hidden>
        <div className="dialog">
          <div className="dialog-head plain">About IKIDO Wheel</div>
          <div className="dialog-body">
            <p>Enter names in the panel, click the wheel and let it pick a random winner.</p>
            <p className="muted">Shortcuts: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to spin, <kbd>Esc</kbd> to close dialogs.</p>
            <p className="muted">Your wheel is stored locally in your browser.</p>
          </div>
          <div className="dialog-foot">
            <button className="btn-primary" data-close="">OK</button>
          </div>
        </div>
      </div>
    
      <div className="toast" id="toast"></div>
    </>
  );
}
