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


  /* RP-LOCKUP-START — tools/extract_brand.py 로 뽑은 원본에서 생성. 손으로 고치지 마세요.
     링·글자는 currentColor, 아크만 --brand-arc. 라이트 테마에서 --acc-line 을 재사용하면
     아크가 Ink 가 되어 링과 같은 색이 되므로 전용 토큰을 쓴다. */
  var LOCKUP="<svg class=\"rpn-lockup\" viewBox=\"0 0 1128.095 146\" aria-hidden=\"true\" focusable=\"false\"><g transform=\"translate(0 0) scale(1.5) translate(-2 -2)\"><path d=\"M93.5 50A43.5 43.5 0 1 1 49.9957 6.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"9\"></path><path d=\"M49.7722 6.5006A43.5 43.5 0 0 1 93.4994 50.2278\" fill=\"none\" stroke=\"var(--brand-arc,#FBD32C)\" stroke-width=\"9\"></path><g transform=\"translate(25.0014 32.5) scale(0.0496)\" fill=\"currentColor\"><path d=\"M189 391L373 700L599 700L389 391ZM0 0L0 700L194 700L194 0ZM124 164L259 164Q290 164 311 173Q332 182 343.5 199.5Q355 217 355 242Q355 267 343.5 285Q332 303 311 312Q290 321 259 321L124 321L124 468L275 468Q371 468 433.5 438.5Q496 409 526.5 355.5Q557 302 557 234Q557 165 526.5 112.5Q496 60 433.5 30Q371 0 275 0L124 0Z\"></path></g><g transform=\"translate(19.7393 32.5) scale(0.0496)\" fill=\"currentColor\"><path d=\"M693 0L693 700L887 700L887 0ZM817 157L952 157Q998 157 1023 177Q1048 197 1048 234Q1048 272 1023 292Q998 312 952 312L817 312L817 468L952 468Q1048 468 1110.5 440Q1173 412 1203.5 359Q1234 306 1234 234Q1234 161 1203.5 109Q1173 57 1110.5 28.5Q1048 0 952 0L817 0Z\"></path></g></g><g transform=\"translate(168 22) scale(0.12787724)\"><path d=\"M189 438L373 747L599 747L389 438ZM0 47L0 747L194 747L194 47ZM124 211L259 211Q290 211 311 220Q332 229 343.5 246.5Q355 264 355 289Q355 314 343.5 332Q332 350 311 359Q290 368 259 368L124 368L124 515L275 515Q371 515 433.5 485.5Q496 456 526.5 402.5Q557 349 557 281Q557 212 526.5 159.5Q496 107 433.5 77Q371 47 275 47L124 47ZM766 634L1136 634L1131 491L772 491ZM949 334L1042 544L1031 594L1111 747L1331 747L949 0L568 747L788 747L869 587L857 544ZM1512.9 397Q1512.9 338 1539.4 296.5Q1565.9 255 1609.9 233.5Q1653.9 212 1706.9 212Q1756.9 212 1793.9 225Q1830.9 238 1859.9 258.5Q1888.9 279 1910.9 302L1910.9 98Q1869.9 67 1820.4 48Q1770.9 29 1693.9 29Q1606.9 29 1533.9 55Q1460.9 81 1408.9 130Q1356.9 179 1328.4 246.5Q1299.9 314 1299.9 397Q1299.9 480 1328.4 547.5Q1356.9 615 1408.9 664Q1460.9 713 1533.9 739Q1606.9 765 1693.9 765Q1770.9 765 1820.4 745.5Q1869.9 726 1910.9 696L1910.9 492Q1888.9 515 1859.9 535.5Q1830.9 556 1793.9 569Q1756.9 582 1706.9 582Q1653.9 582 1609.9 560.5Q1565.9 539 1539.4 497.5Q1512.9 456 1512.9 397ZM2147 747L2500 747L2500 590L2147 590ZM2147 204L2500 204L2500 47L2147 47ZM2147 459L2480 459L2480 307L2147 307ZM2015 47L2015 747L2201 747L2201 47ZM2873.6 47L2873.6 747L3067.6 747L3067.6 47ZM2997.6 204L3132.6 204Q3178.6 204 3203.6 224Q3228.6 244 3228.6 281Q3228.6 319 3203.6 339Q3178.6 359 3132.6 359L2997.6 359L2997.6 515L3132.6 515Q3228.6 515 3291.1 487Q3353.6 459 3384.1 406Q3414.6 353 3414.6 281Q3414.6 208 3384.1 156Q3353.6 104 3291.1 75.5Q3228.6 47 3132.6 47L2997.6 47ZM3488.5 47L3488.5 747L3965.5 747L3965.5 582L3682.5 582L3682.5 47ZM4162.4 634L4532.4 634L4527.4 491L4168.4 491ZM4345.4 334L4438.4 544L4427.4 594L4507.4 747L4727.4 747L4345.4 0L3964.4 747L4184.4 747L4265.4 587L4253.4 544ZM5235.2 47L5235.2 403L4766.2 12L4766.2 747L4952.2 747L4952.2 391L5421.2 782L5421.2 47ZM6004.5 47L6004.5 403L5535.5 12L5535.5 747L5721.5 747L5721.5 391L6190.5 782L6190.5 47ZM6436.7 747L6789.7 747L6789.7 590L6436.7 590ZM6436.7 204L6789.7 204L6789.7 47L6436.7 47ZM6436.7 459L6769.7 459L6769.7 307L6436.7 307ZM6304.7 47L6304.7 747L6490.7 747L6490.7 47ZM7082.3 438L7266.3 747L7492.3 747L7282.3 438ZM6893.3 47L6893.3 747L7087.3 747L7087.3 47ZM7017.3 211L7152.3 211Q7183.3 211 7204.3 220Q7225.3 229 7236.8 246.5Q7248.3 264 7248.3 289Q7248.3 314 7236.8 332Q7225.3 350 7204.3 359Q7183.3 368 7152.3 368L7017.3 368L7017.3 515L7168.3 515Q7264.3 515 7326.8 485.5Q7389.3 456 7419.8 402.5Q7450.3 349 7450.3 281Q7450.3 212 7419.8 159.5Q7389.3 107 7326.8 77Q7264.3 47 7168.3 47L7017.3 47Z\" fill=\"currentColor\"></path></g></svg>";
  var MARKONLY="<svg class=\"rpn-markonly\" viewBox=\"0 0 100 100\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M93.5 50A43.5 43.5 0 1 1 49.9957 6.5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"9\"></path><path d=\"M49.7722 6.5006A43.5 43.5 0 0 1 93.4994 50.2278\" fill=\"none\" stroke=\"var(--brand-arc,#FBD32C)\" stroke-width=\"9\"></path><g transform=\"translate(25.0014 32.5) scale(0.0496)\" fill=\"currentColor\"><path d=\"M189 391L373 700L599 700L389 391ZM0 0L0 700L194 700L194 0ZM124 164L259 164Q290 164 311 173Q332 182 343.5 199.5Q355 217 355 242Q355 267 343.5 285Q332 303 311 312Q290 321 259 321L124 321L124 468L275 468Q371 468 433.5 438.5Q496 409 526.5 355.5Q557 302 557 234Q557 165 526.5 112.5Q496 60 433.5 30Q371 0 275 0L124 0Z\"></path></g><g transform=\"translate(19.7393 32.5) scale(0.0496)\" fill=\"currentColor\"><path d=\"M693 0L693 700L887 700L887 0ZM817 157L952 157Q998 157 1023 177Q1048 197 1048 234Q1048 272 1023 292Q998 312 952 312L817 312L817 468L952 468Q1048 468 1110.5 440Q1173 412 1203.5 359Q1234 306 1234 234Q1234 161 1203.5 109Q1173 57 1110.5 28.5Q1048 0 952 0L817 0Z\"></path></g></svg>";
  /* RP-LOCKUP-END */
  var CARET='<svg class="rpn-caret" viewBox="0 0 12 12"><path d="M2 4l4 4 4-4"/></svg>';
  var GLOBE='<svg class="rpn-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>';
  function onc(k){return active===k?" rpn-on":"";}

  function toolsDesktop(){return TOOLS.map(function(t){return '<a href="'+t.href+q()+'"'+(t.href===curTool?' class="rpn-cur"':'')+
    '><span class="rpn-mi">'+t.ic+'</span><span class="rpn-mtx"><span class="rpn-mt">'+L(t)+'</span><span class="rpn-md">'+(LANG==="ko"?t.dko:t.den)+'</span></span></a>';}).join("");}
  function toolsDrawer(){return TOOLS.map(function(t){return '<a href="'+t.href+q()+'" class="rpn-sub'+(t.href===curTool?' rpn-on':'')+'"><span class="rpn-mi">'+t.ic+'</span>'+L(t)+'</a>';}).join("");}

  function headerHTML(){
    return '<div class="rpn-hdr" data-rpn><div class="rpn-bar">'+
      '<a class="rpn-logo" href="/'+q()+'" aria-label="Race Planner">'+LOCKUP+MARKONLY+'</a>'+
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
      '<div class="rpn-dhead"><a class="rpn-logo" href="/'+q()+'" aria-label="Race Planner">'+LOCKUP+'</a>'+
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
