/* ==========================================================================
   Stones Fan Hub: all site JavaScript
   Sections:
     1. Utilities & storage
     2. Navigation (hamburger + current page)
     3. Home: trivia challenge + leaderboard
     4. Albums: discography grid + song-guessing game
     5. Tours: listings, memories wall, moderated fan gallery
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- 1. Utilities & storage ---------- */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false; // quota exceeded or storage disabled
      }
    }
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function setStatus(el, msg, type) {
    el.textContent = msg;
    el.classList.toggle("is-error", type === "error");
    el.classList.toggle("is-success", type === "success");
  }

  /* ---------- Theme (runs immediately, before first paint) ---------- */

  const THEME_KEY = "sfh_theme";

  function storedTheme() {
    try {
      const t = localStorage.getItem(THEME_KEY);
      return t === "light" || t === "dark" ? t : null;
    } catch (e) {
      return null;
    }
  }

  // Dark is the site's default; light only applies once a visitor chooses it.
  function preferredTheme() {
    return storedTheme() || "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      const next = theme === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", `Switch to ${next} theme`);
      btn.title = `Switch to ${next} theme`;
      btn.firstElementChild.textContent = theme === "dark" ? "☀" : "☾";
    }
  }

  applyTheme(preferredTheme());

  function initThemeToggle() {
    const btn = $("#theme-toggle");
    if (!btn) return;
    applyTheme(preferredTheme()); // sync the button icon now that it exists

    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage disabled: theme still switches for this page */ }
      applyTheme(next);
    });

    // Keep other open tabs of the site in sync.
    window.addEventListener("storage", (e) => {
      if (e.key === THEME_KEY) applyTheme(preferredTheme());
    });
  }

  /* ---------- Page transitions (fallback setup runs immediately) ---------- */

  // Browsers with cross-page View Transitions animate via CSS alone (@view-transition in styles.css).
  // Others get a CSS fade-in on load and a short fade-out before leaving, wired up here.
  const PT_NATIVE = "CSSViewTransitionRule" in window;
  const PT_REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PT_OUT_MS = 220;
  if (!PT_NATIVE && !PT_REDUCED) document.documentElement.classList.add("pt-fallback");

  function initPageTransitions() {
    if (PT_NATIVE || PT_REDUCED) return;
    const root = document.documentElement;

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // new tab / window
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;

      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;                      // external link
      const samePage = url.pathname === location.pathname && url.search === location.search;
      if (samePage) return;                                            // in-page #anchor

      e.preventDefault();
      root.classList.add("pt-leaving");
      setTimeout(() => { location.href = url.href; }, PT_OUT_MS);
    });

    // Coming back via the Back button can restore a page from cache mid-fade: reset it.
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) root.classList.remove("pt-leaving");
    });
  }

  /* ---------- 2. Navigation ---------- */

  function initNav() {
    const toggle = $(".nav-toggle");
    const links = $("#nav-links");
    if (!toggle || !links) return;

    // Highlight the current page based on the file name (backs up the static aria-current).
    const file = location.pathname.split("/").pop() || "index.html";
    $$("a", links).forEach((a) => {
      if (a.getAttribute("href") === file) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    const close = () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    links.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    window.addEventListener("resize", () => { if (window.innerWidth > 760) close(); });
  }

  /* ---------- Footer links (generated from the header nav) ---------- */

  // The header nav is the single source of truth: add a page there and it appears in the footer too.
  function initFooterNav() {
    const source = $("#nav-links");
    const footer = $(".site-footer .container");
    if (!source || !footer || $(".footer-nav", footer)) return;

    const nav = document.createElement("nav");
    nav.className = "footer-nav";
    nav.setAttribute("aria-label", "Footer");
    const list = document.createElement("ul");

    $$("a", source).forEach((link) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = link.getAttribute("href"); // keep the original relative/absolute href
      a.textContent = link.textContent.trim();
      if (link.getAttribute("aria-current") === "page") a.setAttribute("aria-current", "page");
      li.appendChild(a);
      list.appendChild(li);
    });

    nav.appendChild(list);
    const logo = $(".footer-logo", footer);
    if (logo) logo.after(nav); else footer.prepend(nav);
  }

  /* ---------- 3. Home: trivia ---------- */

  const TRIVIA = [
    { q: "At which London club did the Rolling Stones play their first gig in July 1962?", a: "The Marquee Club", o: ["The Cavern Club", "The Marquee Club", "The Crawdaddy Club", "The 100 Club"] },
    { q: "Who wrote \"I Wanna Be Your Man\", the Stones' second UK single?", a: "Lennon–McCartney", o: ["Jagger–Richards", "Chuck Berry", "Lennon–McCartney", "Willie Dixon"] },
    { q: "Who designed the original \"tongue and lips\" logo in 1970?", a: "John Pasche", o: ["Andy Warhol", "John Pasche", "Peter Blake", "Storm Thorgerson"] },
    { q: "Whose concept was the Sticky Fingers cover with a working zipper?", a: "Andy Warhol", o: ["Andy Warhol", "Robert Frank", "David Bailey", "Roy Lichtenstein"] },
    { q: "Much of Exile on Main St. was recorded in the basement of which villa?", a: "Villa Nellcôte", o: ["Villa Borghese", "Villa Nellcôte", "Villa Medici", "Villa Ephrussi"] },
    { q: "Who joined in 1969 to replace Brian Jones?", a: "Mick Taylor", o: ["Ronnie Wood", "Mick Taylor", "Jeff Beck", "Eric Clapton"] },
    { q: "The free Hyde Park concert of 5 July 1969 took place two days after whose death?", a: "Brian Jones", o: ["Brian Jones", "Jimi Hendrix", "Ian Stewart", "Gram Parsons"] },
    { q: "Who sang the searing female vocal on \"Gimme Shelter\"?", a: "Merry Clayton", o: ["Aretha Franklin", "Tina Turner", "Merry Clayton", "Darlene Love"] },
    { q: "What was the band's first US No. 1 single?", a: "(I Can't Get No) Satisfaction", o: ["The Last Time", "Get Off of My Cloud", "(I Can't Get No) Satisfaction", "Paint It, Black"] },
    { q: "Where did the Stones play a free show to an estimated 1.5 million people in 2006?", a: "Copacabana Beach, Rio de Janeiro", o: ["Copacabana Beach, Rio de Janeiro", "Circus Maximus, Rome", "Zócalo, Mexico City", "Hyde Park, London"] },
    { q: "In what year did the Stones play their historic free concert in Havana, Cuba?", a: "2016", o: ["1999", "2008", "2016", "2019"] },
    { q: "Who took over on drums for the No Filter tour in 2021, after Charlie Watts?", a: "Steve Jordan", o: ["Steve Jordan", "Kenney Jones", "Chad Smith", "Matt Cameron"] },
    { q: "Which bassist left the band in 1993?", a: "Bill Wyman", o: ["Darryl Jones", "Bill Wyman", "Ian Stewart", "Ronnie Lane"] },
    { q: "Which Stones album won the Grammy for Best Traditional Blues Album?", a: "Blue & Lonesome", o: ["Exile on Main St.", "Blue & Lonesome", "Let It Bleed", "A Bigger Bang"] },
    { q: "Which saxophone great plays on \"Waiting on a Friend\"?", a: "Sonny Rollins", o: ["Bobby Keys", "Sonny Rollins", "Clarence Clemons", "John Coltrane"] },
    { q: "Where did Mick Jagger and Keith Richards famously reconnect in 1961?", a: "Dartford railway station", o: ["Abbey Road Studios", "Dartford railway station", "Ealing Jazz Club", "Richmond Station Hotel"] }
  ];

  const QUIZ_LEN = 10;
  const QUIZ_TIME = 20;
  const LB_KEY = "sfh_leaderboard";

  function initTrivia() {
    const quiz = $("#quiz");
    if (!quiz) return;

    const els = {
      start: $("#quiz-start"), play: $("#quiz-play"), end: $("#quiz-end"),
      num: $("#quiz-num"), total: $("#quiz-total"), score: $("#quiz-score"),
      time: $("#quiz-time"), bar: $("#quiz-timer-bar"),
      question: $("#quiz-question"), options: $("#quiz-options"),
      feedback: $("#quiz-feedback"), next: $("#quiz-next"),
      final: $("#quiz-final"), summary: $("#quiz-summary"),
      form: $("#score-form"), name: $("#score-name"), status: $("#score-status"),
      lb: $("#leaderboard")
    };

    let questions = [], index = 0, score = 0, correct = 0, timeLeft = 0, timer = null, saved = false;

    function renderLeaderboard() {
      const scores = store.get(LB_KEY, []);
      if (!scores.length) {
        els.lb.innerHTML = '<li class="is-empty">No scores yet. Be the first.</li>';
        return;
      }
      els.lb.innerHTML = scores.map((s) => `
        <li><span>${escapeHTML(s.name)}<span class="date">${escapeHTML(s.correct)}/${QUIZ_LEN} correct · ${new Date(s.date).toLocaleDateString()}</span></span>
        <span class="score">${s.score}</span></li>`).join("");
    }

    function start() {
      questions = shuffle(TRIVIA).slice(0, QUIZ_LEN);
      index = 0; score = 0; correct = 0; saved = false;
      els.total.textContent = QUIZ_LEN;
      els.start.hidden = true; els.end.hidden = true; els.play.hidden = false;
      setStatus(els.status, "");
      showQuestion();
    }

    function showQuestion() {
      const item = questions[index];
      els.num.textContent = index + 1;
      els.score.textContent = score;
      els.question.textContent = item.q;
      els.feedback.textContent = "";
      els.next.hidden = true;
      els.options.innerHTML = "";
      shuffle(item.o).forEach((opt) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "option-btn";
        b.textContent = opt;
        b.addEventListener("click", () => answer(opt));
        els.options.appendChild(b);
      });
      timeLeft = QUIZ_TIME;
      tick();
      clearInterval(timer);
      timer = setInterval(() => {
        timeLeft -= 0.25;
        tick();
        if (timeLeft <= 0) answer(null);
      }, 250);
    }

    function tick() {
      els.time.textContent = Math.max(0, Math.ceil(timeLeft));
      els.bar.style.width = Math.max(0, (timeLeft / QUIZ_TIME) * 100) + "%";
    }

    function answer(choice) {
      clearInterval(timer);
      const item = questions[index];
      const right = choice === item.a;
      $$(".option-btn", els.options).forEach((b) => {
        b.disabled = true;
        if (b.textContent === item.a) b.classList.add("is-correct");
        else if (b.textContent === choice) b.classList.add("is-wrong");
      });
      if (right) {
        const bonus = Math.round(Math.max(0, timeLeft) * 5);
        score += 100 + bonus;
        correct++;
        els.feedback.textContent = `Correct! +100, plus a ${bonus}-point speed bonus.`;
      } else {
        els.feedback.textContent = choice === null ? `Time's up. The answer was ${item.a}.` : `Not quite. The answer was ${item.a}.`;
      }
      els.score.textContent = score;
      els.next.textContent = index + 1 < questions.length ? "Next question" : "See results";
      els.next.hidden = false;
      els.next.focus();
    }

    function finish() {
      els.play.hidden = true; els.end.hidden = false;
      els.final.textContent = score;
      const verdicts = ["Time to dig into the back catalogue.", "A solid casual fan.", "Proper Stones head.", "Glimmer Twin level."];
      els.summary.textContent = `You got ${correct} of ${QUIZ_LEN} right. ${verdicts[Math.min(3, Math.floor(correct / 3))]}`;
      els.name.focus();
    }

    els.next.addEventListener("click", () => {
      index++;
      if (index < questions.length) showQuestion(); else finish();
    });

    $("#quiz-start-btn").addEventListener("click", start);
    $("#quiz-restart").addEventListener("click", start);

    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (saved) { setStatus(els.status, "This score is already saved.", "error"); return; }
      const name = els.name.value.trim();
      if (!name) { setStatus(els.status, "Please enter a name.", "error"); return; }
      const entry = { name, score, correct, date: Date.now() };
      const scores = store.get(LB_KEY, []);
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      const top = scores.slice(0, 10);
      saved = true;
      if (!top.includes(entry)) {
        setStatus(els.status, `${score} points didn't make the top 10 this time. Play again to beat ${top[top.length - 1].score}!`, "error");
        return;
      }
      if (!store.set(LB_KEY, top)) {
        saved = false;
        setStatus(els.status, "Couldn't save. This browser's storage may be full or disabled.", "error");
        return;
      }
      setStatus(els.status, `Score saved: you're #${top.indexOf(entry) + 1} on the leaderboard.`, "success");
      renderLeaderboard();
    });

    renderLeaderboard();
  }

  /* ---------- 4. Albums ---------- */

  const wiki = (slug) => "https://en.wikipedia.org/wiki/" + slug;
  const spotifySearch = (q) => "https://open.spotify.com/search/" + encodeURIComponent("The Rolling Stones " + q);
  const ytSearch = (q) => "https://www.youtube.com/results?search_query=" + encodeURIComponent("The Rolling Stones " + q);

  const ALBUMS = [
    { title: "The Rolling Stones", year: 1964, wiki: "The_Rolling_Stones_(album)", art: ["#3b3b3b", "#0f0f0f"],
      desc: "A raw debut made up almost entirely of R&B and blues covers. It reached No. 1 in the UK, and the sleeve didn't even print the band's name.",
      tracks: ["Route 66", "I Just Want to Make Love to You", "Carol", "Tell Me", "Can I Get a Witness"] },
    { title: "The Rolling Stones No. 2", year: 1965, wiki: "The_Rolling_Stones_No._2", art: ["#4a3a2a", "#120d08"],
      desc: "More Chess-records grit, partly cut at Chess Studios in Chicago, alongside early Jagger/Richards originals.",
      tracks: ["Everybody Needs Somebody to Love", "Time Is on My Side", "What a Shame", "Off the Hook"] },
    { title: "Out of Our Heads", year: 1965, wiki: "Out_of_Our_Heads", art: ["#5a2a2a", "#140808"],
      desc: "The album that broke them in America. The US edition went to No. 1 on the back of \"Satisfaction\".",
      tracks: ["(I Can't Get No) Satisfaction (US edition)", "The Last Time (US edition)", "Play with Fire (US edition)", "Heart of Stone"] },
    { title: "Aftermath", year: 1966, wiki: "Aftermath_(album)", art: ["#5c1f2e", "#14060a"],
      desc: "Their first album of all Jagger/Richards songs. Brian Jones colours it with sitar, dulcimer and marimba.",
      tracks: ["Paint It, Black (US edition)", "Under My Thumb", "Lady Jane", "Mother's Little Helper", "Out of Time"] },
    { title: "Between the Buttons", year: 1967, wiki: "Between_the_Buttons", art: ["#2f3d4a", "#0a0f14"],
      desc: "Swinging-London pop, music-hall wit and baroque touches. The US version added two of their biggest singles.",
      tracks: ["Ruby Tuesday (US edition)", "Let's Spend the Night Together (US edition)", "Yesterday's Papers", "Connection"] },
    { title: "Their Satanic Majesties Request", year: 1967, wiki: "Their_Satanic_Majesties_Request", art: ["#4b2a6b", "#120a1c"],
      desc: "The band's full psychedelic detour, issued in a famous 3D lenticular sleeve.",
      tracks: ["She's a Rainbow", "2000 Light Years from Home", "Citadel", "In Another Land"] },
    { title: "Beggars Banquet", year: 1968, wiki: "Beggars_Banquet", art: ["#8a8273", "#2b2822"],
      desc: "A return to roots: acoustic blues, country and menace. It opened the run of records many fans rank as their best.",
      tracks: ["Sympathy for the Devil", "Street Fighting Man", "No Expectations", "Stray Cat Blues", "Salt of the Earth"] },
    { title: "Let It Bleed", year: 1969, wiki: "Let_It_Bleed", art: ["#7a2b1b", "#1a0905"],
      desc: "Dark, apocalyptic and gospel-tinged. Brian Jones plays on two tracks and his replacement Mick Taylor on two.",
      tracks: ["Gimme Shelter", "You Can't Always Get What You Want", "Midnight Rambler", "Monkey Man", "Love in Vain"] },
    { title: "Sticky Fingers", year: 1971, wiki: "Sticky_Fingers", art: ["#5d6b7a", "#14181c"],
      desc: "The first release on Rolling Stones Records and the debut of the tongue logo, in Andy Warhol's zipper sleeve.",
      tracks: ["Brown Sugar", "Wild Horses", "Can't You Hear Me Knocking", "Bitch", "Dead Flowers"] },
    { title: "Exile on Main St.", year: 1972, wiki: "Exile_on_Main_St.", art: ["#3d3a33", "#0d0c0a"],
      desc: "A sprawling, murky double album recorded largely in the basement of Villa Nellcôte in the south of France.",
      tracks: ["Rocks Off", "Tumbling Dice", "Happy", "Sweet Virginia", "Shine a Light"] },
    { title: "Goats Head Soup", year: 1973, wiki: "Goats_Head_Soup", art: ["#6b5a2a", "#171307"],
      desc: "Recorded mostly in Kingston, Jamaica. Ballads and funk sit next to each other.",
      tracks: ["Angie", "Doo Doo Doo Doo Doo (Heartbreaker)", "Dancing with Mr. D", "Star Star"] },
    { title: "It's Only Rock 'n Roll", year: 1974, wiki: "It%27s_Only_Rock_%27n_Roll", art: ["#8a5a1a", "#1c1205"],
      desc: "Mick Taylor's final album with the band. The title track was first cut at Ronnie Wood's home studio.",
      tracks: ["It's Only Rock 'n Roll (But I Like It)", "Time Waits for No One", "Ain't Too Proud to Beg", "Till the Next Goodbye"] },
    { title: "Black and Blue", year: 1976, wiki: "Black_and_Blue_(The_Rolling_Stones_album)", art: ["#1f2a4a", "#060912"],
      desc: "Partly a guitarist audition after Taylor left. It leans into funk and reggae, and Ronnie Wood made the cut.",
      tracks: ["Hot Stuff", "Fool to Cry", "Memory Motel", "Hand of Fate"] },
    { title: "Some Girls", year: 1978, wiki: "Some_Girls", art: ["#c23a5e", "#3a0f1c"],
      desc: "A lean comeback shaped by punk and New York disco. It's one of their best-selling albums.",
      tracks: ["Miss You", "Beast of Burden", "Shattered", "Respectable", "Far Away Eyes"] },
    { title: "Emotional Rescue", year: 1980, wiki: "Emotional_Rescue", art: ["#2a6b6b", "#071717"],
      desc: "A loose, groove-heavy follow-up that topped the charts on both sides of the Atlantic.",
      tracks: ["Emotional Rescue", "She's So Cold", "Dance (Pt. 1)", "All About You"] },
    { title: "Tattoo You", year: 1981, wiki: "Tattoo_You", art: ["#a83a2a", "#220a07"],
      desc: "Built largely from reworked outtakes, it delivered one of their signature riffs. Sonny Rollins guests on sax.",
      tracks: ["Start Me Up", "Hang Fire", "Waiting on a Friend", "Little T&A", "Heaven"] },
    { title: "Undercover", year: 1983, wiki: "Undercover_(album)", art: ["#3a2a5a", "#0c0814"],
      desc: "A darker, dance-floor-aware record that reflected the political mood of the early '80s.",
      tracks: ["Undercover of the Night", "She Was Hot", "Too Much Blood", "Wanna Hold You"] },
    { title: "Dirty Work", year: 1986, wiki: "Dirty_Work_(album)", art: ["#b8a12a", "#2a2408"],
      desc: "Made amid tension between Mick and Keith. It closes with a short tribute to Ian Stewart, who died before release.",
      tracks: ["Harlem Shuffle", "One Hit (to the Body)", "Winning Ugly", "Sleep Tonight"] },
    { title: "Steel Wheels", year: 1989, wiki: "Steel_Wheels", art: ["#4a4f57", "#101214"],
      desc: "The Glimmer Twins' reconciliation album, launching the era of giant stadium tours.",
      tracks: ["Mixed Emotions", "Rock and a Hard Place", "Almost Hear You Sigh", "Slipping Away"] },
    { title: "Voodoo Lounge", year: 1994, wiki: "Voodoo_Lounge", art: ["#8a2a1a", "#1e0805"],
      desc: "Their first album without Bill Wyman. It won the Grammy for Best Rock Album.",
      tracks: ["Love Is Strong", "You Got Me Rocking", "Out of Tears", "I Go Wild"] },
    { title: "Bridges to Babylon", year: 1997, wiki: "Bridges_to_Babylon", art: ["#6b4a1a", "#171006"],
      desc: "Modern production meets classic swagger, with several producers in the mix.",
      tracks: ["Anybody Seen My Baby?", "Saint of Me", "Flip the Switch", "Out of Control"] },
    { title: "A Bigger Bang", year: 2005, wiki: "A_Bigger_Bang", art: ["#2a2a2a", "#000000"],
      desc: "A tight, guitar-forward return built mostly around the core four.",
      tracks: ["Rough Justice", "Streets of Love", "Oh No, Not You Again", "Rain Fall Down"] },
    { title: "Blue & Lonesome", year: 2016, wiki: "Blue_%26_Lonesome", art: ["#1f3a6b", "#060c18"],
      desc: "Chicago blues covers cut in about three days, with Eric Clapton on two tracks. It won a Grammy.",
      tracks: ["Just Your Fool", "Hate to See You Go", "Ride 'Em On Down", "Commit a Crime"] },
    { title: "Hackney Diamonds", year: 2023, wiki: "Hackney_Diamonds", art: ["#7fa8c9", "#1a2a38"],
      desc: "Their first album of originals since 2005 and the first after Charlie Watts' death, with guests including Lady Gaga, Stevie Wonder and Paul McCartney.",
      tracks: ["Angry", "Sweet Sounds of Heaven", "Mess It Up", "Bite My Head Off", "Rolling Stone Blues"] }
  ];

  // Song game: every YouTube ID is an official upload (ABKCO, the band's channel, VEVO or YouTube "Topic").
  const SONGS = [
    { title: "Paint It, Black", yt: "O4irXQhgMqg", start: 0, clue: "A sitar riff and a wish to turn every colour into one." },
    { title: "Gimme Shelter", yt: "RbmS3tQJ7Os", start: 0, clue: "A storm is threatening, and a guest singer's voice cracks at the climax." },
    { title: "Sympathy for the Devil", yt: "Jwtyn-L-2gQ", start: 0, clue: "A narrator of wealth and taste introduces himself over samba percussion." },
    { title: "(I Can't Get No) Satisfaction", yt: "nrIPxlFzDi0", start: 0, clue: "A fuzz-box riff Keith says came to him in his sleep." },
    { title: "Start Me Up", yt: "SGyOaCXr8Lw", start: 0, clue: "A Tattoo You opener that began life as a reggae-style outtake." },
    { title: "Angry", yt: "_mEC54eTuGw", start: 0, clue: "The 2023 comeback single. Its video cruises the Sunset Strip in a convertible." },
    { title: "You Can't Always Get What You Want", yt: "Ef9QnZVpVd8", start: 0, clue: "It opens with the London Bach Choir and ends with a lesson in needs and wants." },
    { title: "Miss You", yt: "WXF0xJsFAiI", start: 0, clue: "A disco-era No. 1 with a falsetto 'ooh' and a lonely walk through Central Park." },
    { title: "Beast of Burden", yt: "tuk1NnnMQBA", start: 0, clue: "A Some Girls ballad about refusing to be someone's pack animal." },
    { title: "Brown Sugar", yt: "Bar7SzNLnY0", start: 0, clue: "Sticky Fingers' opening track, partly recorded at Muscle Shoals." },
    { title: "Wild Horses", yt: "SQTHB4jM-KQ", start: 0, clue: "An acoustic ballad that says untamed animals couldn't drag the singer away." },
    { title: "Jumpin' Jack Flash", yt: "G3dFpQzu54w", start: 0, clue: "A 1968 non-album single whose narrator brags about a stormy birth and a rough upbringing." },
    { title: "Angie", yt: "oWRr03VcA-0", start: 0, clue: "A gentle 1973 ballad named after a woman, with acoustic guitar and strings." },
    { title: "Tumbling Dice", yt: "EMoi_m2G6XU", start: 0, clue: "Exile's big single, named after rolling bones on a gambler's table." },
    { title: "Ruby Tuesday", yt: "ADtnUC_ctNk", start: 0, clue: "A recorder-laced ballad about a free spirit named after a day of the week." },
    { title: "Honky Tonk Women", yt: "hqqkGxZ1_8I", start: 0, clue: "A cowbell intro, a 1969 country-flavoured single, and a bar-room romance in Memphis." }
  ];

  const GAME_ROUNDS = 10;
  const GAME_BEST_KEY = "sfh_song_best";

  // MusicBrainz release-group IDs, used to load front covers from the Cover Art Archive (coverartarchive.org).
  // MusicBrainz files the 1964 UK debut under its US title, "England's Newest Hit Makers".
  const COVER_IDS = {
    "The Rolling Stones": "919b8534-f40f-3a07-be48-0a9095ab5ada",
    "The Rolling Stones No. 2": "66b53bd6-043b-3635-8d9d-02aa71bc0af8",
    "Out of Our Heads": "3be81f5e-9bdd-303a-b9bf-f8eb2059ef9f",
    "Aftermath": "26987c39-5914-483b-a897-d43ce6aad9b1",
    "Between the Buttons": "72a77b05-0006-3838-a378-c56b65abc733",
    "Their Satanic Majesties Request": "40a087e8-908a-334d-b520-88a820deb09d",
    "Beggars Banquet": "6e672bbd-7c7f-32f8-8335-c603be99d13b",
    "Let It Bleed": "784c0edd-0f37-33a2-9ca5-dff87b4f999c",
    "Sticky Fingers": "4a4213d0-f224-3d51-bcca-476f61162681",
    "Exile on Main St.": "4838a3c9-fd2b-30a5-83eb-e32545b5d7fc",
    "Goats Head Soup": "e82ba8db-3712-3de0-bbe5-0311b89db7e2",
    "It's Only Rock 'n Roll": "cc0ef7ba-01f1-3faf-8238-b63369ff5d2b",
    "Black and Blue": "b13da40b-fb15-382e-b305-b65ced849782",
    "Some Girls": "b44bc358-a28f-3a1f-b07e-604910f12d37",
    "Emotional Rescue": "0c977adb-6dd3-330c-9acb-a40d2104a539",
    "Tattoo You": "fdbc4f51-817d-33ab-af9f-4bcc22286932",
    "Undercover": "515d36a9-a39a-35d8-a522-7f5670fe558e",
    "Dirty Work": "fb2dc90c-9f8a-3fa3-b9bc-2001dbe6a561",
    "Steel Wheels": "ef78739b-ea31-32e2-a927-58fe228c7354",
    "Voodoo Lounge": "7645ef59-6d8c-37fe-8467-d566d3cf5926",
    "Bridges to Babylon": "d7ef7347-c582-3109-a54a-9bc6cde8ee45",
    "A Bigger Bang": "6d1a87c3-9e11-36d8-8c41-3e11b974fde7",
    "Blue & Lonesome": "ab9b8aa8-d2bc-42cd-a36b-842f61de55f3",
    "Hackney Diamonds": "26b9191a-d4e5-4c92-a3c5-6749a5ac83a2"
  };

  function coverImg(al) {
    const id = COVER_IDS[al.title];
    if (!id) return "";
    const base = `https://coverartarchive.org/release-group/${id}/front`;
    return `<img class="album-cover" src="${base}-250" srcset="${base}-250 1x, ${base}-500 2x"
      alt="${escapeHTML(al.title)} album cover" width="250" height="250" loading="lazy" decoding="async">`;
  }

  function albumCard(al) {
    const tracks = al.tracks.map((t) => `<li>${escapeHTML(t)}</li>`).join("");
    return `
      <article class="album-card">
        <div class="album-art" style="--art: linear-gradient(135deg, ${al.art[0]}, ${al.art[1]})">
          <span class="year">${al.year}</span>
          <span>${escapeHTML(al.title)}</span>
          ${coverImg(al)}
        </div>
        <div class="album-body">
          <h3>${escapeHTML(al.title)}</h3>
          <p>${escapeHTML(al.desc)}</p>
          <h4>Key tracks</h4>
          <ol class="track-list">${tracks}</ol>
          <div class="album-links">
            <a href="${wiki(al.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a>
            <a href="${spotifySearch(al.title)}" target="_blank" rel="noopener">Spotify ↗</a>
            <a href="${ytSearch(al.title + " album")}" target="_blank" rel="noopener">YouTube ↗</a>
          </div>
        </div>
      </article>`;
  }

  function initAlbums() {
    const grid = $("#album-grid");
    if (!grid) return;
    const search = $("#album-search");
    const era = $("#album-era");
    const count = $("#album-count");

    function render() {
      const q = search.value.trim().toLowerCase();
      const e = era.value;
      const list = ALBUMS.filter((al) => {
        const decade = Math.floor(al.year / 10) * 10;
        const eraOk = e === "all" || (e === "2000s" ? al.year >= 2000 : e === decade + "s");
        const hay = (al.title + " " + al.year + " " + al.tracks.join(" ") + " " + al.desc).toLowerCase();
        return eraOk && (!q || hay.includes(q));
      });
      grid.innerHTML = list.length ? list.map(albumCard).join("") : '<p class="empty-state">No albums match that search.</p>';
      count.textContent = `Showing ${list.length} of ${ALBUMS.length} studio albums`;
    }

    search.addEventListener("input", render);
    era.addEventListener("change", render);

    // If a cover fails to load, remove it so the gradient tile with the album title shows instead.
    // (Image "error" events don't bubble, so listen in the capture phase.)
    grid.addEventListener("error", (e) => {
      if (e.target.classList && e.target.classList.contains("album-cover")) e.target.remove();
    }, true);

    render();
  }

  function initSongGame() {
    const clueEl = $("#game-clue");
    if (!clueEl) return;
    const els = {
      round: $("#game-round"), total: $("#game-total"), score: $("#game-score"), streak: $("#game-streak"),
      options: $("#game-options"), feedback: $("#game-feedback"), player: $("#game-player"),
      start: $("#game-start"), next: $("#game-next"), best: $("#game-best")
    };
    let deck = [], round = 0, score = 0, streak = 0;
    els.total.textContent = GAME_ROUNDS;
    els.best.textContent = store.get(GAME_BEST_KEY, 0);

    function start() {
      deck = shuffle(SONGS).slice(0, GAME_ROUNDS);
      round = 0; score = 0; streak = 0;
      els.start.hidden = true;
      show();
    }

    function show() {
      const song = deck[round];
      els.round.textContent = round + 1;
      els.score.textContent = score;
      els.streak.textContent = streak;
      els.feedback.textContent = "";
      els.player.hidden = true;
      els.player.innerHTML = "";
      els.next.hidden = true;
      clueEl.textContent = song.clue;

      const decoys = shuffle(SONGS.filter((s) => s !== song)).slice(0, 3);
      els.options.innerHTML = "";
      shuffle([song, ...decoys]).forEach((s) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "option-btn";
        b.textContent = s.title;
        b.addEventListener("click", () => answer(s, song));
        els.options.appendChild(b);
      });
    }

    function answer(choice, song) {
      const right = choice === song;
      $$(".option-btn", els.options).forEach((b) => {
        b.disabled = true;
        if (b.textContent === song.title) b.classList.add("is-correct");
        else if (b.textContent === choice.title) b.classList.add("is-wrong");
      });
      if (right) {
        streak++;
        const pts = 100 + (streak - 1) * 25;
        score += pts;
        els.feedback.textContent = `Yes, it's "${song.title}". +${pts}${streak > 1 ? ` (streak ×${streak})` : ""}`;
      } else {
        streak = 0;
        els.feedback.textContent = `It was "${song.title}". Have a listen:`;
      }
      els.score.textContent = score;
      els.streak.textContent = streak;

      // Official embedded player (privacy-enhanced mode), loaded only after the guess so the title doesn't give it away.
      const src = `https://www.youtube-nocookie.com/embed/${song.yt}?start=${song.start}&rel=0&modestbranding=1`;
      els.player.innerHTML = `<iframe src="${src}" title="${escapeHTML(song.title)}: official YouTube player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>`;
      els.player.hidden = false;

      if (round + 1 < deck.length) {
        els.next.textContent = "Next song";
      } else {
        els.next.textContent = "Play again";
        const best = store.get(GAME_BEST_KEY, 0);
        if (score > best) {
          store.set(GAME_BEST_KEY, score);
          els.best.textContent = score;
          els.feedback.textContent += ` That's a new best: ${score}!`;
        } else {
          els.feedback.textContent += ` Final score: ${score}.`;
        }
      }
      els.next.hidden = false;
    }

    els.start.addEventListener("click", start);
    els.next.addEventListener("click", () => {
      if (round + 1 < deck.length) { round++; show(); } else { start(); }
    });
  }

  /* ---------- 5. Tours ---------- */

  // Tour dates are month-level (YYYY-MM). Upcoming tours belong in UPCOMING with full ISO dates.
  const TOURS = [
    { start: "1963-09", end: "1963-11", name: "British package tour (with the Everly Brothers & Bo Diddley)", regions: "UK", notes: "Their first major national tour" },
    { start: "1964-06", end: "1964-06", name: "1st American Tour", regions: "North America", notes: "US debut; a tough reception outside the big cities" },
    { start: "1964-10", end: "1964-11", name: "2nd American Tour", regions: "North America", notes: "Included the T.A.M.I. Show and an Ed Sullivan appearance" },
    { start: "1965-01", end: "1965-12", name: "1965 World Tours", regions: "UK, Ireland, Australasia, Europe, North America", notes: "Satisfaction-era touring on four continents" },
    { start: "1966-02", end: "1966-07", name: "1966 Australasian, European & American Tours", regions: "Australasia, Europe, North America", notes: "Their last US tour for three years" },
    { start: "1967-03", end: "1967-04", name: "European Tour 1967", regions: "Europe", notes: "Last tour with Brian Jones; including a show in Warsaw" },
    { start: "1969-11", end: "1969-12", name: "American Tour 1969", regions: "North America", notes: "Mick Taylor's first tour; ended with Altamont" },
    { start: "1970-08", end: "1970-10", name: "European Tour 1970", regions: "Europe", notes: "First European dates in three years" },
    { start: "1971-03", end: "1971-03", name: "UK Tour 1971", regions: "UK", notes: "A 'farewell' tour before tax exile in France" },
    { start: "1972-06", end: "1972-07", name: "American Tour 1972 (\"STP\")", regions: "North America", notes: "Exile tour; filmed for Ladies and Gentlemen…" },
    { start: "1973-01", end: "1973-02", name: "Pacific Tour 1973", regions: "Hawaii, Australia, New Zealand, Hong Kong", notes: "Japan dates were cancelled over visa issues" },
    { start: "1973-09", end: "1973-10", name: "European Tour 1973", regions: "Europe", notes: "Mick Taylor's final tour" },
    { start: "1975-06", end: "1975-08", name: "Tour of the Americas '75", regions: "North & South America", notes: "Ronnie Wood's first tour; the lotus-flower stage" },
    { start: "1976-04", end: "1976-08", name: "Tour of Europe '76", regions: "Europe", notes: "Ended with Knebworth" },
    { start: "1978-06", end: "1978-07", name: "US Tour 1978", regions: "North America", notes: "Some Girls tour, with some unannounced small-venue shows" },
    { start: "1981-09", end: "1981-12", name: "American Tour 1981", regions: "North America", notes: "Tattoo You tour; the top-grossing tour of its year" },
    { start: "1982-05", end: "1982-07", name: "European Tour 1982", regions: "Europe", notes: "Celebrated 20 years of the band" },
    { start: "1989-08", end: "1990-08", name: "Steel Wheels / Urban Jungle Tour", regions: "North America, Japan, Europe", notes: "Bill Wyman's final tour; the stadium era begins" },
    { start: "1994-08", end: "1995-08", name: "Voodoo Lounge Tour", regions: "Worldwide", notes: "Darryl Jones on bass" },
    { start: "1997-09", end: "1998-09", name: "Bridges to Babylon Tour", regions: "Worldwide", notes: "A B-stage reached by an extending bridge" },
    { start: "1999-01", end: "1999-06", name: "No Security Tour", regions: "North America, Europe", notes: "Arenas rather than stadiums" },
    { start: "2002-09", end: "2003-11", name: "Licks Tour", regions: "Worldwide", notes: "40th anniversary, mixing stadiums, arenas and theatres" },
    { start: "2005-08", end: "2007-08", name: "A Bigger Bang Tour", regions: "Worldwide", notes: "Included Copacabana; at the time the highest-grossing tour ever" },
    { start: "2012-11", end: "2013-07", name: "50 & Counting", regions: "UK, North America", notes: "50th anniversary; included Glastonbury" },
    { start: "2014-02", end: "2014-11", name: "14 On Fire", regions: "Asia, Middle East, Europe, Oceania", notes: "Including their first show in Israel" },
    { start: "2015-05", end: "2015-07", name: "Zip Code Tour", regions: "North America", notes: "Sticky Fingers reissue tour" },
    { start: "2016-02", end: "2016-03", name: "América Latina Olé Tour", regions: "Latin America", notes: "Ended with a free show in Havana" },
    { start: "2016-10", end: "2016-10", name: "Desert Trip", regions: "Indio, California", notes: "Festival with Dylan, McCartney, Young, The Who and Roger Waters" },
    { start: "2017-09", end: "2021-11", name: "No Filter Tour", regions: "Europe, North America", notes: "Charlie Watts' final tour; Steve Jordan took over in 2021" },
    { start: "2022-06", end: "2022-08", name: "Sixty", regions: "Europe", notes: "60th anniversary tour" },
    { start: "2024-04", end: "2024-07", name: "Hackney Diamonds Tour", regions: "North America", notes: "Supporting the 2023 album" }
  ];

  const LANDMARKS = [
    { date: "1962-07-12", venue: "Marquee Club, London", why: "The first-ever Rolling Stones gig" },
    { date: "1969-07-05", venue: "Hyde Park, London", why: "A free concert two days after Brian Jones died, and Mick Taylor's debut" },
    { date: "1969-12-06", venue: "Altamont Speedway, California", why: "A free festival marred by violence, as documented in Gimme Shelter" },
    { date: "1976-08-21", venue: "Knebworth Park, England", why: "One of the largest UK crowds of the era" },
    { date: "1977-03-04", venue: "El Mocambo, Toronto", why: "Secret club shows recorded for Love You Live" },
    { date: "2003-07-30", venue: "Downsview Park, Toronto", why: "Headlined the SARS benefit concert" },
    { date: "2006-02-05", venue: "Ford Field, Detroit", why: "Super Bowl XL halftime show" },
    { date: "2006-02-18", venue: "Copacabana Beach, Rio de Janeiro", why: "A free show to an estimated 1.5 million people" },
    { date: "2013-06-29", venue: "Glastonbury Festival, England", why: "Their first Glastonbury headline set" },
    { date: "2013-07-06", venue: "Hyde Park, London", why: "A return to Hyde Park, 44 years on, with Mick Taylor as a guest" },
    { date: "2016-03-25", venue: "Ciudad Deportiva, Havana", why: "A historic free concert in Cuba" }
  ];

  // Add confirmed future dates here, e.g. { date: "2027-06-01", venue: "Wembley Stadium, London", tour: "..." }.
  // Anything dated before today moves out of the "Upcoming" tab automatically.
  const UPCOMING = [];

  const MEM_KEY = "sfh_memories";
  const GAL_KEY = "sfh_gallery";
  // Demo moderation only: anyone can read this passcode in the page source. A real site needs server-side moderation.
  const MOD_PASSCODE = "glimmertwins";

  function fmtMonth(ym) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  function fmtDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }

  function initTours() {
    const rows = $("#tour-rows");
    if (!rows) return;

    rows.innerHTML = TOURS.map((t) => `
      <tr>
        <td>${fmtMonth(t.start)}${t.end !== t.start ? " – " + fmtMonth(t.end) : ""}</td>
        <td><strong>${escapeHTML(t.name)}</strong></td>
        <td class="muted">${escapeHTML(t.regions)}</td>
        <td class="muted">${escapeHTML(t.notes)}</td>
      </tr>`).join("");

    $("#landmark-rows").innerHTML = LANDMARKS.map((l) => `
      <tr>
        <td>${fmtDate(l.date)}</td>
        <td><strong>${escapeHTML(l.venue)}</strong></td>
        <td class="muted">${escapeHTML(l.why)}</td>
      </tr>`).join("");

    // Visitor's local date as YYYY-MM-DD (toISOString would use UTC and roll over to "tomorrow" in the evening).
    const now = new Date();
    const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    const future = UPCOMING.filter((u) => u.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    $("#upcoming-list").innerHTML = future.length
      ? `<div class="tour-table-wrap"><table class="tour-table"><thead><tr><th>Date</th><th>Venue</th><th>Tour</th></tr></thead><tbody>
          ${future.map((u) => `<tr><td>${fmtDate(u.date)}<span class="badge">Upcoming</span></td><td><strong>${escapeHTML(u.venue)}</strong></td><td class="muted">${escapeHTML(u.tour || "")}</td></tr>`).join("")}
         </tbody></table></div>`
      : `<p class="empty-state">No upcoming dates are listed right now. For announcements, check <a href="https://rollingstones.com/tour/" target="_blank" rel="noopener">the official tour page</a>.</p>`;

    // Tabs (ARIA tabs pattern: only the active tab is in the Tab order; arrow keys move between tabs)
    const tabs = $$('[role="tab"]');
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        $("#" + t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.tabIndex = tab.getAttribute("aria-selected") === "true" ? 0 : -1;
      tab.addEventListener("click", () => select(tab, false));
      tab.addEventListener("keydown", (e) => {
        const n = tabs.length;
        const target = { ArrowRight: tabs[(i + 1) % n], ArrowLeft: tabs[(i - 1 + n) % n], Home: tabs[0], End: tabs[n - 1] }[e.key];
        if (target) { e.preventDefault(); select(target, true); }
      });
    });
  }

  function initMemories() {
    const form = $("#memory-form");
    if (!form) return;
    const timeline = $("#memory-timeline");
    const filter = $("#mem-filter");
    const tourSel = $("#mem-tour");
    const yearInput = $("#mem-year");
    const status = $("#mem-status");
    const thisYear = new Date().getFullYear();
    yearInput.max = thisYear;

    TOURS.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.name;
      o.textContent = `${t.name} (${t.start.slice(0, 4)})`;
      tourSel.appendChild(o);
    });
    for (let d = 1960; d <= thisYear; d += 10) {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d + "s";
      filter.appendChild(o);
    }

    // When a year is typed, suggest the matching tour. The suggestion follows later year changes
    // until the visitor picks a tour themselves.
    let tourAutoPicked = false;
    yearInput.addEventListener("change", () => {
      if (tourSel.value && !tourAutoPicked) return; // respect a manual choice
      const y = Number(yearInput.value);
      const match = TOURS.find((t) => y >= +t.start.slice(0, 4) && y <= +t.end.slice(0, 4));
      tourSel.value = match ? match.name : "";
      tourAutoPicked = Boolean(match);
    });
    tourSel.addEventListener("change", () => { tourAutoPicked = false; });
    form.addEventListener("reset", () => { tourAutoPicked = false; });

    // One like per memory per browser.
    const LIKED_KEY = "sfh_liked_memories";

    function render() {
      const all = store.get(MEM_KEY, []).slice().sort((a, b) => a.year - b.year || a.created - b.created);
      const f = filter.value;
      const list = f === "all" ? all : all.filter((m) => Math.floor(m.year / 10) * 10 === Number(f));
      if (!list.length) {
        timeline.innerHTML = '<p class="empty-state">No memories pinned here yet. Share yours!</p>';
        return;
      }
      const liked = store.get(LIKED_KEY, []);
      let html = "", decade = null;
      list.forEach((m) => {
        const isLiked = liked.includes(m.id);
        const d = Math.floor(m.year / 10) * 10;
        if (d !== decade) { decade = d; html += `<h3 class="timeline-decade">${d}s</h3>`; }
        html += `
          <article class="memory">
            <header>
              <span class="who">${escapeHTML(m.name)} · ${m.year}</span>
              <span class="where">${escapeHTML(m.city)}${m.tour ? " · " + escapeHTML(m.tour) : ""}</span>
            </header>
            <p>${escapeHTML(m.story)}</p>
            <div class="pin-actions">
              <button class="btn btn--small btn--ghost" type="button" data-like="${escapeHTML(m.id)}"
                aria-pressed="${isLiked}" ${isLiked ? "disabled" : ""}
                aria-label="${isLiked ? "You liked this memory" : "Like this memory"} (${m.likes || 0} likes)">♥ ${m.likes || 0}</button>
            </div>
          </article>`;
      });
      timeline.innerHTML = html;
    }

    timeline.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-like]");
      if (!btn || btn.disabled) return;
      const id = btn.dataset.like;
      const liked = store.get(LIKED_KEY, []);
      if (liked.includes(id)) return;
      const all = store.get(MEM_KEY, []);
      const m = all.find((x) => x.id === id);
      if (!m) return;
      m.likes = (m.likes || 0) + 1;
      liked.push(id);
      store.set(MEM_KEY, all);
      store.set(LIKED_KEY, liked);
      render();
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#mem-name").value.trim();
      const year = Number(yearInput.value);
      const city = $("#mem-city").value.trim();
      const story = $("#mem-story").value.trim();
      if (!name || !city || !story) return setStatus(status, "Please fill in your name, city and story.", "error");
      if (!Number.isInteger(year) || year < 1962 || year > thisYear) return setStatus(status, `The year must be between 1962 and ${thisYear}.`, "error");
      const all = store.get(MEM_KEY, []);
      all.push({ id: uid(), name, year, city, tour: tourSel.value, story, likes: 0, created: Date.now() });
      if (!store.set(MEM_KEY, all)) return setStatus(status, "Couldn't save. This browser's storage may be full.", "error");
      form.reset();
      setStatus(status, "Your memory has been pinned to the timeline.", "success");
      filter.value = "all";
      render();
    });

    filter.addEventListener("change", render);
    render();
  }

  // Resize an uploaded image so it fits in localStorage.
  function resizeImage(file, maxSize = 900) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function initGallery() {
    const form = $("#gallery-form");
    if (!form) return;
    const status = $("#gal-status");
    const approvedEl = $("#gallery-approved");
    const pendingEl = $("#gallery-pending");
    const lightbox = $("#lightbox");
    const lbImg = $("#lightbox-img");
    let filter = "all";
    let modUnlocked = sessionStorage.getItem("sfh_mod") === "1";

    function item(g, withActions) {
      return `
        <figure class="gallery-item">
          <img src="${g.img}" alt="${escapeHTML(g.category)} by ${escapeHTML(g.name)}${g.caption ? ": " + escapeHTML(g.caption) : ""}" tabindex="0" title="View larger" loading="lazy">
          <figcaption>
            <span class="cat">${escapeHTML(g.category)}</span><br>
            ${g.caption ? escapeHTML(g.caption) + "<br>" : ""}
            <span class="form-note">by ${escapeHTML(g.name)}</span>
          </figcaption>
          ${withActions ? `<div class="mod-actions">
            <button class="btn btn--small" type="button" data-approve="${g.id}">Approve</button>
            <button class="btn btn--small btn--danger" type="button" data-reject="${g.id}">Reject</button>
          </div>` : ""}
        </figure>`;
    }

    function render() {
      const all = store.get(GAL_KEY, []);
      const approved = all.filter((g) => g.status === "approved" && (filter === "all" || g.category === filter));
      approvedEl.innerHTML = approved.length
        ? approved.map((g) => item(g, false)).join("")
        : '<p class="empty-state" style="grid-column:1/-1">No approved submissions in this category yet.</p>';

      $("#mod-locked").hidden = modUnlocked;
      $("#mod-unlocked").hidden = !modUnlocked;
      if (modUnlocked) {
        const pending = all.filter((g) => g.status === "pending");
        $("#mod-count").textContent = pending.length;
        pendingEl.innerHTML = pending.length
          ? pending.map((g) => item(g, true)).join("")
          : '<p class="empty-state" style="grid-column:1/-1">The queue is empty.</p>';
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#gal-name").value.trim();
      const file = $("#gal-file").files[0];
      if (!name) return setStatus(status, "Please enter your name.", "error");
      if (!file || !file.type.startsWith("image/")) return setStatus(status, "Please choose an image file.", "error");
      if (file.size > 15 * 1024 * 1024) return setStatus(status, "That image is over 15 MB.", "error");
      setStatus(status, "Processing image…");
      try {
        const img = await resizeImage(file);
        const all = store.get(GAL_KEY, []);
        all.push({ id: uid(), name, category: $("#gal-cat").value, caption: $("#gal-caption").value.trim(), img, status: "pending", created: Date.now() });
        if (!store.set(GAL_KEY, all)) return setStatus(status, "Storage is full. A moderator needs to clear some submissions first.", "error");
        form.reset();
        setStatus(status, "Thanks! Your submission is waiting for a moderator to review it.", "success");
        render();
      } catch (err) {
        setStatus(status, "That image couldn't be read. Try a JPG or PNG.", "error");
      }
    });

    $$("[data-gal-filter]").forEach((b) => {
      b.addEventListener("click", () => {
        filter = b.dataset.galFilter;
        $$("[data-gal-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        render();
      });
    });

    $("#mod-login").addEventListener("submit", (e) => {
      e.preventDefault();
      if ($("#mod-pass").value === MOD_PASSCODE) {
        modUnlocked = true;
        sessionStorage.setItem("sfh_mod", "1");
        $("#mod-pass").value = "";
        setStatus($("#mod-status"), "");
        render();
      } else {
        setStatus($("#mod-status"), "Incorrect passcode.", "error");
      }
    });

    $("#mod-lock").addEventListener("click", () => {
      modUnlocked = false;
      sessionStorage.removeItem("sfh_mod");
      render();
    });

    pendingEl.addEventListener("click", (e) => {
      const ap = e.target.closest("[data-approve]");
      const rj = e.target.closest("[data-reject]");
      if (!ap && !rj) return;
      let all = store.get(GAL_KEY, []);
      if (ap) {
        const g = all.find((x) => x.id === ap.dataset.approve);
        if (g) g.status = "approved";
      } else {
        all = all.filter((x) => x.id !== rj.dataset.reject);
      }
      store.set(GAL_KEY, all);
      render();
    });

    // Lightbox: remembers what opened it and returns focus there on close.
    let lbReturnFocus = null;
    const openLb = (img) => {
      lbReturnFocus = img;
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lightbox.classList.add("is-open");
      $("#lightbox-close").focus();
    };
    document.addEventListener("click", (e) => {
      const img = e.target.closest(".gallery-item img");
      if (img) openLb(img);
    });
    document.addEventListener("keydown", (e) => {
      const img = e.target.closest && e.target.closest(".gallery-item img");
      if (img && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openLb(img); }
    });
    const closeLb = () => {
      if (!lightbox.classList.contains("is-open")) return;
      lightbox.classList.remove("is-open");
      if (lbReturnFocus && lbReturnFocus.isConnected) lbReturnFocus.focus();
      lbReturnFocus = null;
    };
    $("#lightbox-close").addEventListener("click", closeLb);
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLb(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });
    // Keep Tab inside the open lightbox (its only control is the Close button).
    lightbox.addEventListener("keydown", (e) => {
      if (e.key === "Tab") { e.preventDefault(); $("#lightbox-close").focus(); }
    });

    render();
  }

  /* ---------- 404 page ---------- */

  function initNotFound() {
    const el = $("#missing-path");
    if (!el) return;
    let shownPath = location.pathname;
    try { shownPath = decodeURIComponent(shownPath); } catch (e) { /* malformed %-escape: show it as typed */ }
    el.innerHTML = `Not found: <code>${escapeHTML(shownPath)}</code>`;

    // Point near-miss URLs (e.g. /album, /tours.html) at the page they probably meant.
    const path = location.pathname.toLowerCase();
    const guesses = [
      { match: /album|song|disc/, href: "albums.html", label: "Albums" },
      { match: /tour|concert|gallery|memor|show/, href: "toursandconcerts.html", label: "Tours & Concerts" },
      { match: /trivia|quiz|home|index/, href: "index.html", label: "Home" }
    ];
    const guess = guesses.find((g) => g.match.test(path));
    if (guess) {
      el.innerHTML += ` · Did you mean <a href="/aim-w4d3-portfolio/${guess.href}">${guess.label}</a>?`;
    }
  }

  /* ---------- Back to top ---------- */

  function initBackToTop() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<span aria-hidden="true">↑</span>';
    document.body.appendChild(btn);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let ticking = false;
    const update = () => {
      btn.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.6);
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      // Move keyboard focus back to the top so tabbing continues from the header.
      const brand = $(".brand");
      if (brand) brand.focus({ preventScroll: true });
    });

    update();
  }

  /* ---------- Boot ---------- */

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initFooterNav();
    initThemeToggle();
    initPageTransitions();
    initTrivia();
    initAlbums();
    initSongGame();
    initTours();
    initMemories();
    initGallery();
    initNotFound();
    initBackToTop();
  });
})();
