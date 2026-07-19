/* Race Planner — shared top navigation (grouped desktop dropdown + mobile drawer).
   Single source of truth for the header across all pages. Namespaced rpn-* so it
   never collides with per-page CSS. Owns the language switch (localStorage rp_lang
   + ?lang, reload on change); page content re-renders itself from that on init. */
(function(){
  // 0) legacy stubs — old per-page lang code references #lang-ko/#lang-en/#lk/#le;
  //    create hidden no-op elements up-front so that code never crashes.
  try{
    var stub=document.createElement("div"); stub.style.display="none"; stub.setAttribute("data-rpn-stub","1");
    ["lang-ko","lang-en","lk","le"].forEach(function(id){var b=document.createElement("button");b.id=id;stub.appendChild(b);});
    (document.head||document.documentElement).appendChild(stub);
    // anti-FOUC: hide the legacy top <header> until nav.js swaps it in
    var pre=document.createElement("style"); pre.textContent="body>header{visibility:hidden}";
    (document.head||document.documentElement).appendChild(pre);
  }catch(e){}

  // 1) language
  function detect(){
    var u=new URLSearchParams(location.search).get("lang"); if(u==="ko"||u==="en")return u;
    try{var s=localStorage.getItem("rp_lang"); if(s==="ko"||s==="en")return s;}catch(e){}
    return (navigator.language||"").slice(0,2)==="ko"?"ko":"en";
  }
  var LANG=detect();
  function switchLang(l){ if(l===LANG)return; try{localStorage.setItem("rp_lang",l);}catch(e){}
    var u=new URL(location); u.searchParams.set("lang",l); location.href=u.toString(); }

  // 2) model
  var W={planner:{ko:"레이스플래너",en:"Planners"},poster:{ko:"러닝인증샷",en:"Run Snapshot"},
    courses:{ko:"코스찾기",en:"Find Courses"},guide:{ko:"가이드",en:"Guides"},
    browse:{ko:"둘러보기",en:"Explore"},lang:{ko:"언어",en:"Language"}};
  var TOOLS=[
    {href:"/gpx/",ic:"🗺️",ko:"GPX 레이스플랜",en:"GPX Race Plan",dko:"GPX로 구간별 페이스·완주 계획",den:"Split pace & finish plan from a GPX"},
    {href:"/hyrox/",ic:"🏋️",ko:"하이록스 완주 계산기",en:"HYROX Calculator",dko:"목표 완주시간별 러닝 페이스·록스존",den:"Run pace & roxzone by goal time"},
    {href:"/pace/",ic:"⏱️",ko:"마라톤 페이스·기록예측",en:"Marathon Pace & Predictor",dko:"목표 기록별 구간 페이스·완주 예측",den:"Split pace & finish prediction"}
  ];
  function L(o){return o[LANG]||o.ko;}
  var p=location.pathname;
  function st(x){return p===x||p.indexOf(x)===0;}
  var active = (p==="/"||p===""||p==="/index.html") ? "poster"
    : (st("/courses")||st("/course")) ? "courses"
    : (st("/gpx")||st("/hyrox")||st("/pace")) ? "planner"
    : st("/guide") ? "guide" : "";
  var curTool = st("/gpx")?"/gpx/":st("/hyrox")?"/hyrox/":st("/pace")?"/pace/":"";
  function q(en){return LANG==="en"?"?lang=en":"";}

  var CSS=[
"[data-rpn] *{box-sizing:border-box}",
".rpn-hdr{position:sticky;top:0;z-index:1200;margin:0;border-bottom:1px solid var(--line,#262d39);",
  "background:linear-gradient(180deg,rgba(10,12,16,.94),rgba(10,12,16,.62));backdrop-filter:saturate(140%) blur(14px);-webkit-backdrop-filter:saturate(140%) blur(14px)}",
".rpn-bar{max-width:1080px;margin:0 auto;padding:10px 18px;display:flex;align-items:center;gap:13px;min-height:60px;font-family:var(--rpn-sans)}",
".rpn-logo{font-weight:800;font-size:18px;letter-spacing:-.4px;color:var(--ink,#f3f6fa);display:inline-flex;align-items:center;gap:9px;flex:none}",
".rpn-mark{width:26px;height:26px;border-radius:7px;background:var(--accent,#c8ff43);color:var(--accentink,#0b0f06);display:grid;place-items:center;font-weight:800;font-size:15px;box-shadow:0 0 18px rgba(200,255,67,.35)}",
".rpn-logo b{color:var(--accent,#c8ff43)}",
".rpn-grow{flex:1}",
".rpn-nav{display:flex;align-items:center;gap:2px}",
".rpn-nav>a,.rpn-gbtn{font:600 14px/1 var(--rpn-sans);color:var(--ink2,#cbd3dd);background:none;border:none;cursor:pointer;padding:9px 12px;border-radius:10px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;text-decoration:none}",
".rpn-nav>a:hover,.rpn-gbtn:hover{background:var(--panel2,#1a1f29);color:var(--ink,#f3f6fa)}",
".rpn-nav>a.rpn-on,.rpn-grp.rpn-o .rpn-gbtn{color:var(--accent,#c8ff43);background:var(--panel2,#1a1f29)}",
".rpn-grp.rpn-o .rpn-gbtn{color:var(--ink,#f3f6fa)}",
".rpn-caret{width:9px;height:9px;fill:none;stroke:currentColor;stroke-width:2.2;transition:transform .16s}",
".rpn-grp.rpn-o .rpn-caret{transform:rotate(180deg)}",
".rpn-grp{position:relative}",
".rpn-menu{position:absolute;top:calc(100% + 8px);left:0;min-width:250px;background:var(--panel,#13171f);border:1px solid var(--line2,#323b49);border-radius:14px;padding:7px;box-shadow:0 18px 44px rgba(0,0,0,.5);opacity:0;visibility:hidden;transform:translateY(-6px);transition:.16s;z-index:60}",
".rpn-grp.rpn-o .rpn-menu,.rpn-lang.rpn-o .rpn-menu{opacity:1;visibility:visible;transform:translateY(0)}",
".rpn-menu>a{display:flex;align-items:flex-start;gap:11px;padding:10px 11px;border-radius:10px;color:var(--ink2,#cbd3dd);text-decoration:none}",
".rpn-menu>a:hover{background:var(--panel2,#1a1f29);color:var(--ink,#f3f6fa)}",
".rpn-menu>a.rpn-cur{background:var(--panel2,#1a1f29)}",
".rpn-mi{width:30px;height:30px;border-radius:8px;background:var(--panel2,#1a1f29);display:grid;place-items:center;font-size:15px;flex:none;margin-top:1px}",
".rpn-mtx{display:flex;flex-direction:column}",
".rpn-mt{font-weight:700;font-size:13.5px;color:var(--ink,#f3f6fa)}",
".rpn-md{font-size:11.5px;color:var(--sub,#8b97a6);font-weight:500;margin-top:2px;line-height:1.3}",
".rpn-lang{position:relative;flex:none}",
".rpn-lbtn{display:inline-flex;align-items:center;gap:6px;font:700 12.5px/1 var(--rpn-mono);color:var(--ink2,#cbd3dd);background:var(--panel2,#1a1f29);border:1px solid var(--line2,#323b49);padding:8px 11px;border-radius:999px;cursor:pointer}",
".rpn-lbtn:hover{border-color:var(--faint,#5a6573);color:var(--ink,#f3f6fa)}",
".rpn-globe{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.8}",
".rpn-lmenu{left:auto;right:0;min-width:150px}",
".rpn-lmenu button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:9px;color:var(--ink2,#cbd3dd);background:none;border:none;cursor:pointer;font:600 13.5px var(--rpn-sans)}",
".rpn-lmenu button:hover{background:var(--panel2,#1a1f29);color:var(--ink,#f3f6fa)}",
".rpn-lmenu button.rpn-on{color:var(--accent,#c8ff43)}",
".rpn-lmenu button.rpn-on::after{content:'\\2713'}",
".rpn-hamb{display:none;flex:none;width:42px;height:42px;border-radius:11px;border:1px solid var(--line2,#323b49);background:var(--panel2,#1a1f29);color:var(--ink,#f3f6fa);align-items:center;justify-content:center;cursor:pointer}",
".rpn-hamb svg{width:20px;height:20px;stroke:currentColor;stroke-width:2.2;fill:none}",
".rpn-scrim{position:fixed;inset:0;background:rgba(5,7,10,.55);backdrop-filter:blur(2px);opacity:0;visibility:hidden;transition:.2s;z-index:1250}",
".rpn-scrim.rpn-open{opacity:1;visibility:visible}",
".rpn-drawer{position:fixed;top:0;right:0;height:100dvh;height:100vh;width:min(86vw,340px);background:var(--bg2,#0f1218);border-left:1px solid var(--line2,#323b49);z-index:1300;transform:translateX(100%);transition:transform .24s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;padding:16px 16px calc(18px + env(safe-area-inset-bottom));font-family:var(--rpn-sans)}",
".rpn-drawer.rpn-open{transform:translateX(0)}",
".rpn-dhead{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;margin-bottom:4px;border-bottom:1px solid var(--line,#262d39)}",
".rpn-dhead .rpn-logo{font-size:16px}.rpn-dhead .rpn-mark{width:23px;height:23px;font-size:13px}",
".rpn-dclose{width:38px;height:38px;border-radius:10px;border:1px solid var(--line2,#323b49);background:var(--panel,#13171f);color:var(--ink,#f3f6fa);display:grid;place-items:center;cursor:pointer}",
".rpn-dclose svg{width:18px;height:18px;stroke:currentColor;stroke-width:2.2;fill:none}",
".rpn-dnav{display:flex;flex-direction:column;gap:1px;overflow-y:auto;flex:1;padding-top:6px}",
".rpn-dnav a{display:flex;align-items:center;gap:12px;padding:13px 12px;border-radius:12px;color:var(--ink,#f3f6fa);font-weight:700;font-size:15.5px;text-decoration:none}",
".rpn-dnav a:hover,.rpn-dnav a:active{background:var(--panel2,#1a1f29)}",
".rpn-dnav a.rpn-on{color:var(--accent,#c8ff43);background:var(--panel2,#1a1f29)}",
".rpn-dnav a.rpn-sub{font-size:14.5px;font-weight:600;color:var(--ink2,#cbd3dd)}",
".rpn-dnav a .rpn-mi{width:29px;height:29px;border-radius:8px;background:var(--panel,#13171f);font-size:15px;margin-top:0}",
".rpn-dsec{font:700 11px/1 var(--rpn-mono);letter-spacing:.13em;color:var(--faint,#5a6573);text-transform:uppercase;padding:15px 12px 6px}",
".rpn-dlang{border-top:1px solid var(--line,#262d39);padding-top:14px;margin-top:8px}",
".rpn-dlbl{font:700 11px/1 var(--rpn-mono);letter-spacing:.12em;color:var(--faint,#5a6573);text-transform:uppercase;padding:0 4px 9px}",
".rpn-seg{display:flex;gap:8px}",
".rpn-seg button{flex:1;padding:13px;border-radius:12px;border:1px solid var(--line2,#323b49);background:var(--panel,#13171f);color:var(--ink2,#cbd3dd);font-weight:700;font-size:14.5px;cursor:pointer;font-family:var(--rpn-sans)}",
".rpn-seg button.rpn-on{background:var(--accent,#c8ff43);color:var(--accentink,#0b0f06);border-color:var(--accent,#c8ff43)}",
"@media(max-width:820px){.rpn-nav,.rpn-lang{display:none}.rpn-hamb{display:inline-flex}}"
].join("");

  var CARET='<svg class="rpn-caret" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4"/></svg>';
  var GLOBE='<svg class="rpn-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>';
  function onc(k){return active===k?" rpn-on":"";}

  function toolsDesktop(){return TOOLS.map(function(t){return '<a href="'+t.href+q()+'"'+(t.href===curTool?' class="rpn-cur"':'')+
    '><span class="rpn-mi">'+t.ic+'</span><span class="rpn-mtx"><span class="rpn-mt">'+L(t)+'</span><span class="rpn-md">'+(LANG==="ko"?t.dko:t.den)+'</span></span></a>';}).join("");}
  function toolsDrawer(){return TOOLS.map(function(t){return '<a href="'+t.href+q()+'" class="rpn-sub'+(t.href===curTool?' rpn-on':'')+'"><span class="rpn-mi">'+t.ic+'</span>'+L(t)+'</a>';}).join("");}

  function headerHTML(){
    return '<div class="rpn-hdr" data-rpn><div class="rpn-bar">'+
      '<a class="rpn-logo" href="/'+q()+'"><span class="rpn-mark">R</span><span class="rpn-full">Race&nbsp;<b>Planner</b></span></a>'+
      '<span class="rpn-grow"></span>'+
      '<nav class="rpn-nav">'+
        '<div class="rpn-grp" id="rpn-grp"><button type="button" class="rpn-gbtn'+(active==="planner"?" rpn-on":"")+'">'+L(W.planner)+' '+CARET+'</button>'+
          '<div class="rpn-menu">'+toolsDesktop()+'</div></div>'+
        '<a href="/'+q()+'" class="'+onc("poster")+'">'+L(W.poster)+'</a>'+
        '<a href="/courses/'+q()+'" class="'+onc("courses")+'">'+L(W.courses)+'</a>'+
        '<a href="/guide/'+q()+'" class="'+onc("guide")+'">'+L(W.guide)+'</a>'+
      '</nav>'+
      '<div class="rpn-lang" id="rpn-lang"><button type="button" class="rpn-lbtn">'+GLOBE+(LANG==="ko"?"KO":"EN")+'</button>'+
        '<div class="rpn-menu rpn-lmenu"><button type="button" data-l="ko"'+(LANG==="ko"?' class="rpn-on"':'')+'>한국어</button><button type="button" data-l="en"'+(LANG==="en"?' class="rpn-on"':'')+'>English</button></div></div>'+
      '<button class="rpn-hamb" id="rpn-hamb" aria-label="menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>'+
      '</div></div>';
  }
  function drawerHTML(){
    return '<div class="rpn-scrim" id="rpn-scrim" data-rpn></div>'+
      '<aside class="rpn-drawer" id="rpn-drawer" data-rpn>'+
      '<div class="rpn-dhead"><a class="rpn-logo" href="/'+q()+'"><span class="rpn-mark">R</span><span>Race <b>Planner</b></span></a>'+
        '<button class="rpn-dclose" id="rpn-dclose" aria-label="close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
      '<nav class="rpn-dnav">'+
        '<div class="rpn-dsec">'+L(W.planner)+'</div>'+toolsDrawer()+
        '<div class="rpn-dsec">'+L(W.browse)+'</div>'+
        '<a href="/'+q()+'" class="'+onc("poster")+'"><span class="rpn-mi">📸</span>'+L(W.poster)+'</a>'+
        '<a href="/courses/'+q()+'" class="'+onc("courses")+'"><span class="rpn-mi">🧭</span>'+L(W.courses)+'</a>'+
        '<a href="/guide/'+q()+'" class="'+onc("guide")+'"><span class="rpn-mi">📖</span>'+L(W.guide)+'</a>'+
      '</nav>'+
      '<div class="rpn-dlang"><div class="rpn-dlbl">'+L(W.lang)+'</div>'+
        '<div class="rpn-seg"><button type="button" data-l="ko"'+(LANG==="ko"?' class="rpn-on"':'')+'>한국어</button><button type="button" data-l="en"'+(LANG==="en"?' class="rpn-on"':'')+'>English</button></div></div>'+
      '</aside>';
  }

  function build(){
    var s=document.createElement("style"); s.textContent=CSS; document.head.appendChild(s);
    document.documentElement.style.setProperty("--rpn-sans",'-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic","Segoe UI",Roboto,sans-serif');
    document.documentElement.style.setProperty("--rpn-mono",'"Space Grotesk",ui-monospace,Menlo,monospace');
    // header: replace existing <header> or prepend to body
    var box=document.createElement("div"); box.innerHTML=headerHTML();
    var hdr=box.firstChild;
    var old=document.querySelector("header");
    if(old){ old.parentNode.replaceChild(hdr, old); }
    else { document.body.insertBefore(hdr, document.body.firstChild); }
    // drawer
    var d=document.createElement("div"); d.innerHTML=drawerHTML();
    while(d.firstChild) document.body.appendChild(d.firstChild);

    var grp=document.getElementById("rpn-grp"), lang=document.getElementById("rpn-lang");
    function closeAll(){grp&&grp.classList.remove("rpn-o");lang&&lang.classList.remove("rpn-o");}
    grp&&grp.querySelector(".rpn-gbtn").addEventListener("click",function(e){e.stopPropagation();var o=grp.classList.contains("rpn-o");closeAll();if(!o)grp.classList.add("rpn-o");});
    lang&&lang.querySelector(".rpn-lbtn").addEventListener("click",function(e){e.stopPropagation();var o=lang.classList.contains("rpn-o");closeAll();if(!o)lang.classList.add("rpn-o");});
    document.addEventListener("click",function(e){if(!e.target.closest(".rpn-grp")&&!e.target.closest(".rpn-lang"))closeAll();});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"){closeAll();closeDrawer();}});
    Array.prototype.forEach.call(document.querySelectorAll("[data-l]"),function(b){b.addEventListener("click",function(){switchLang(b.getAttribute("data-l"));});});

    var drawer=document.getElementById("rpn-drawer"), scrim=document.getElementById("rpn-scrim");
    function openDrawer(){drawer.classList.add("rpn-open");scrim.classList.add("rpn-open");document.body.style.overflow="hidden";}
    function closeDrawer(){drawer.classList.remove("rpn-open");scrim.classList.remove("rpn-open");document.body.style.overflow="";}
    document.getElementById("rpn-hamb").addEventListener("click",openDrawer);
    document.getElementById("rpn-dclose").addEventListener("click",closeDrawer);
    scrim.addEventListener("click",closeDrawer);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",build); else build();
})();
