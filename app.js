/* uitjeskiezer.nl: menu, zoeken, filter, keuzehulp */
(function(){
  var R = window.ROOT || "";
  var burger = document.querySelector(".burger"), drawer = document.querySelector(".drawer");
  if (burger) burger.addEventListener("click", function(){ var o = drawer.classList.toggle("open"); burger.setAttribute("aria-expanded", o); document.body.style.overflow = o ? "hidden" : ""; });

  var DB = null, waiting = [];
  function db(cb){ if (DB) return cb(DB); waiting.push(cb); if (waiting.length > 1) return;
    fetch(R + "search.json").then(function(r){ return r.json(); }).then(function(d){ DB = d; waiting.forEach(function(f){ f(d); }); waiting = []; }); }
  function norm(s){ return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function eur(v){ return v ? "€ " + String(v).replace(".", ",") : "Gratis"; }

  function search(q, d){
    var t = norm(q).split(/\s+/).filter(Boolean); if (!t.length) return [];
    var out = [];
    d.g.forEach(function(g){ var h = norm(g.t + " " + g.s + " " + g.r + " " + g.k), s = 0;
      t.forEach(function(w){ if (h.indexOf(w) > -1) s += (norm(g.t).indexOf(w) > -1 ? 3 : 1); });
      if (s >= t.length) out.push({s: s + 2, html: '<a href="' + R + g.u + '"><span class="r-e">🔟</span><span>' + esc(g.t) + '<small>Top 10 · ' + esc(g.r) + '</small></span></a>'}); });
    d.i.forEach(function(i){ var h = norm(i.n + " " + i.pl + " " + i.pv), s = 0;
      t.forEach(function(w){ if (h.indexOf(w) > -1) s += 2; });
      if (s >= t.length * 2) out.push({s: s, html: '<a href="' + R + i.u + '"><span class="r-e">' + i.e + '</span><span>' + esc(i.n) + '<small>' + esc(i.pl) + ' · ' + eur(i.pr) + '</small></span></a>'}); });
    var seen = {}; return out.sort(function(a, b){ return b.s - a.s; }).filter(function(x){ if (seen[x.html]) return 0; return seen[x.html] = 1; }).slice(0, 8);
  }
  document.querySelectorAll("[data-search]").forEach(function(f){
    var inp = f.querySelector("input"), box = f.parentNode.querySelector(".results");
    function show(){ db(function(d){ var r = search(inp.value, d);
      box.innerHTML = r.length ? r.map(function(x){ return x.html; }).join("") : (inp.value.trim().length > 1 ? '<a href="' + R + 'top-10.html"><span class="r-e">🤔</span><span>Niets gevonden<small>Bekijk alle top 10\'s</small></span></a>' : "");
      box.classList.toggle("on", !!box.innerHTML); }); }
    inp.addEventListener("input", show); inp.addEventListener("focus", function(){ db(function(){}); });
    f.addEventListener("submit", function(ev){ ev.preventDefault(); var a = box.querySelector("a"); if (a) location.href = a.href; else show(); });
    document.addEventListener("click", function(ev){ if (!f.parentNode.contains(ev.target)) box.classList.remove("on"); });
  });
  var q = new URLSearchParams(location.search).get("q"), sp = document.querySelector(".search-page input");
  if (q && sp){ sp.value = q; sp.dispatchEvent(new Event("input")); }

  document.querySelectorAll("[data-filter]").forEach(function(b){
    b.addEventListener("click", function(){
      document.querySelectorAll("[data-filter]").forEach(function(x){ x.classList.toggle("on", x === b); });
      var c = b.getAttribute("data-filter");
      document.querySelectorAll("[data-grid] [data-cat-item]").forEach(function(el){ el.style.display = (c === "all" || el.getAttribute("data-cat-item") === c) ? "" : "none"; });
    });
  });

  var quiz = document.querySelector("[data-quiz]");
  if (quiz) db(function(d){
    var qs = [].slice.call(quiz.querySelectorAll(".q")), ans = {}, step = 0;
    var regs = {}; d.i.forEach(function(i){ if (i.r !== "Heel Nederland") regs[i.pv] = 1; });
    quiz.querySelector("[data-regios]").innerHTML = Object.keys(regs).sort().map(function(r){ return '<button data-v="' + esc(r) + '">📍 ' + esc(r) + '</button>'; }).join("") + '<button data-v="">🇳🇱 Maakt niet uit</button>';
    function go(n){ step = n; qs.forEach(function(q, i){ q.classList.toggle("on", i === n); }); }
    function result(){
      var catFor = {kinderen: ["kinderen", "attracties", "binnen", "stad"], samen: ["samen", "cultuur", "stad", "winter"], groep: ["groep", "stad", "attracties"], alleen: ["stad", "cultuur", "buiten", "binnen"]}[ans.wie] || [];
      var budget = +ans.budget, seen = {};
      var list = d.i.filter(function(i){
        if (seen[i.n]) return false;
        if (ans.weer && norm(i.bi).indexOf(ans.weer) < 0 && !(ans.weer === "buiten" && norm(i.bi).indexOf("water") > -1)) return false;
        if (budget === 0 ? i.pr > 0 : i.pr > budget) return false;
        if (ans.regio && i.pv !== ans.regio) return false;
        return (seen[i.n] = true);
      }).map(function(i){ var s = i.s + (catFor.indexOf(i.c) > -1 ? 3 - catFor.indexOf(i.c) * .5 : 0) + (ans.wie === "kinderen" && i.c === "kinderen" ? 2 : 0); return {i: i, s: s}; })
        .sort(function(a, b){ return b.s - a.s; }).slice(0, 3);
      quiz.querySelector(".quiz-res").innerHTML = list.length ? list.map(function(x){ var i = x.i;
        return '<a class="qr" href="' + R + i.u + '"><span class="qi"' + (i.img ? ' style="background-image:url(\'' + esc(i.img) + '\')"' : '') + '>' + (i.img ? "" : i.e) + '</span><div><h3>' + esc(i.n) + '</h3><p>📍 ' + esc(i.pl) + ' · ' + eur(i.pr) + '</p><p>' + esc(i.o) + '</p></div></a>'; }).join("")
        : '<p>Geen precieze match. Probeer een ruimer budget of een andere regio.</p>';
      qs.forEach(function(q){ q.classList.remove("on"); }); quiz.querySelector(".quiz-out").hidden = false;
    }
    quiz.addEventListener("click", function(ev){
      var b = ev.target.closest(".opts button"); if (b){ ans[qs[step].getAttribute("data-q")] = b.getAttribute("data-v"); if (step < qs.length - 1) go(step + 1); else result(); }
      if (ev.target.closest("[data-reset]")){ ans = {}; quiz.querySelector(".quiz-out").hidden = true; go(0); }
    });
    go(0);
  });
})();

/* ---------- beweging (afgeleid van watkoopik): GSAP (gewoon native scrollen, geen Lenis), WebGL-hero, tilt, magneet, tellers, sticky ---------- */
(function(){
  var touch = matchMedia("(hover: none)").matches, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, small = innerWidth < 760;
  function ready(f){ if (window.gsap || document.readyState === "complete") f(); else window.addEventListener("load", f); }
  var prog = document.querySelector(".progress");
  function onScroll(){ var h = document.documentElement, m = h.scrollHeight - innerHeight; if (prog) prog.style.transform = "scaleX(" + (m > 0 ? scrollY / m : 0) + ")";
    var sb = document.querySelector(".sticky-buy"), pd = document.querySelector(".podium"), ft = document.querySelector("footer");
    if (sb && pd) sb.classList.toggle("on", pd.getBoundingClientRect().bottom < 0 && ft.getBoundingClientRect().top > innerHeight); }
  addEventListener("scroll", onScroll, {passive: true}); onScroll();

  if (!touch) document.querySelectorAll(".spot").forEach(function(el){
    el.addEventListener("pointermove", function(ev){ var r = el.getBoundingClientRect(); el.style.setProperty("--mx", ev.clientX - r.left + "px"); el.style.setProperty("--my", ev.clientY - r.top + "px"); }); });
  if (!touch && !reduce) document.querySelectorAll(".tilt").forEach(function(el){
    el.addEventListener("pointermove", function(ev){ var r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
      el.style.transform = "perspective(900px) rotateY(" + x * 8 + "deg) rotateX(" + -y * 8 + "deg) translateY(-4px)"; });
    el.addEventListener("pointerleave", function(){ el.style.transition = "transform .6s cubic-bezier(.2,.8,.2,1)"; el.style.transform = ""; setTimeout(function(){ el.style.transition = ""; }, 600); }); });
  var fls = document.querySelectorAll(".fl");
  if (fls.length && !touch && !reduce) addEventListener("pointermove", function(ev){ var x = ev.clientX / innerWidth - .5, y = ev.clientY / innerHeight - .5;
    fls.forEach(function(f){ var d = +f.getAttribute("data-depth") || .5; f.style.translate = x * 70 * d + "px " + y * 50 * d + "px"; }); }, {passive: true});

  /* WebGL-kleurveld in de hero: koraal, zon en roze, volgt de muis */
  var cv = document.getElementById("fx");
  if (cv && !reduce) (function(){
    var gl = cv.getContext("webgl", {antialias: false, alpha: false, powerPreference: "low-power"}); if (!gl) { cv.style.display = "none"; return; }
    var fs = "precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;" +
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}" +
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}" +
      "float fbm(vec2 p){float v=0.,s=.5;for(int i=0;i<5;i++){v+=s*n(p);p*=2.02;s*=.5;}return v;}" +
      "void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.5;float T=t*.05;" +
      "vec2 q=vec2(fbm(p+T),fbm(p+vec2(5.2,1.3)-T));vec2 w=vec2(fbm(p+3.*q+vec2(1.7,9.2)+T*1.5),fbm(p+3.*q+vec2(8.3,2.8)-T));float f=fbm(p+2.5*w);" +
      "vec3 a=vec3(1.,.36,.24),b=vec3(1.,.79,.24),c=vec3(1.,.42,.62),d=vec3(.08,.13,.24);" +
      "vec3 col=mix(a,b,smoothstep(.25,.85,f));col=mix(col,c,smoothstep(.5,1.,length(w)*.9));col+=.3/(1.+10.*length(uv-m))*b;" +
      "col=mix(d,col,.78+.22*smoothstep(0.,1.,uv.x*.6+f*.8));gl_FragColor=vec4(col,1.);}";
    function sh(tp, src){ var o = gl.createShader(tp); gl.shaderSource(o, src); gl.compileShader(o); return o; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}")); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.style.display = "none"; return; }
    gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {r: gl.getUniformLocation(pr, "r"), t: gl.getUniformLocation(pr, "t"), m: gl.getUniformLocation(pr, "m")};
    var sc = (touch || small) ? .22 : .3, last = 0, mx = .7, my = .6, tx = .7, ty = .6, vis = true;
    function size(){ cv.width = Math.round(cv.clientWidth * sc); cv.height = Math.round(cv.clientHeight * sc); gl.viewport(0, 0, cv.width, cv.height); }
    size(); addEventListener("resize", size);
    addEventListener("pointermove", function(ev){ var r = cv.getBoundingClientRect(); tx = (ev.clientX - r.left) / r.width; ty = 1 - (ev.clientY - r.top) / r.height; }, {passive: true});
    new IntersectionObserver(function(en){ vis = en[0].isIntersecting; }).observe(cv);
    (function loop(now){ if (vis && !document.hidden && now - last > 33){ last = now; mx += (tx - mx) * .04; my += (ty - my) * .04; gl.uniform2f(U.r, cv.width, cv.height); gl.uniform1f(U.t, now / 1000); gl.uniform2f(U.m, mx, my); gl.drawArrays(gl.TRIANGLES, 0, 3); } requestAnimationFrame(loop); })(0);
  })();

  ready(function(){
    if (!window.gsap || reduce){ document.documentElement.classList.add("no-motion"); return; }
    document.documentElement.classList.add("motion");
    gsap.registerPlugin(ScrollTrigger);
    document.querySelectorAll('a[href^="#"]').forEach(function(a){ a.addEventListener("click", function(ev){ var t = document.querySelector(a.getAttribute("href")); if (t){ ev.preventDefault(); window.scrollTo({top: t.getBoundingClientRect().top + scrollY - 80, behavior: "smooth"}); } }); });
    if (!touch) document.querySelectorAll(".magnet").forEach(function(b){
      b.addEventListener("pointermove", function(ev){ var r = b.getBoundingClientRect(); gsap.to(b, {x: (ev.clientX - r.left - r.width / 2) * .25, y: (ev.clientY - r.top - r.height / 2) * .35, duration: .3, ease: "power3.out"}); });
      b.addEventListener("pointerleave", function(){ gsap.to(b, {x: 0, y: 0, duration: .6, ease: "elastic.out(1,.4)"}); }); });
    if (!small) document.querySelectorAll(".split").forEach(function(el){
      el.innerHTML = el.innerHTML.replace(/(<[^>]+>)|([^<\s]+)/g, function(m, tag, w){ return tag ? tag : '<span class="w"><span>' + w + "</span></span>"; });
      gsap.from(el.querySelectorAll(".w > span"), {yPercent: 110, duration: .9, ease: "power4.out", stagger: .06, delay: .1}); });
    if (!small) gsap.from(".hero .lead, .hero .search-hero, .hero .chips .chip", {opacity: 0, y: 24, duration: .8, ease: "power3.out", stagger: .04, delay: .35});
    gsap.from(".fl", {opacity: 0, scale: .7, rotate: -8, duration: 1, ease: "back.out(1.6)", stagger: .1, delay: .4});
    gsap.set(".rv", {opacity: 0, y: 34});
    ScrollTrigger.batch(".rv", {start: "top 90%", once: true, onEnter: function(els){ gsap.to(els, {opacity: 1, y: 0, duration: .8, ease: "power3.out", stagger: .07, overwrite: true}); }});
    document.querySelectorAll("[data-count]").forEach(function(el){ var o = {v: 0}, end = +el.getAttribute("data-count");
      gsap.to(o, {v: end, duration: 1.8, ease: "power2.out", delay: .3, onUpdate: function(){ el.textContent = Math.round(o.v); }}); });
    document.querySelectorAll(".bar em").forEach(function(b){ ScrollTrigger.create({trigger: b, start: "top 95%", once: true, onEnter: function(){ b.classList.add("go"); }}); });
    gsap.utils.toArray(".item .ph img").forEach(function(img){ gsap.fromTo(img, {scale: 1.15}, {scale: 1, ease: "none", scrollTrigger: {trigger: img.closest(".item"), start: "top bottom", end: "bottom top", scrub: true}}); });
  });
})();
