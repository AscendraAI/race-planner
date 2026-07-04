#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Race Planner — programmatic marathon goal-time pace pages generator.
Reuses the CSS/header from the live /pace/index.html for exact visual parity.
Emits: /pace/marathon/index.html (hub) + /pace/marathon/<slug>/index.html (spokes)
Each spoke page carries UNIQUE data (splits, checkpoints, Riegel equivalents,
fueling, tailored FAQ) so it survives Google's Helpful-Content / scaled-content rules.
"""
import os, re, html, sys

SRC   = os.environ.get("SRC",  "pace/index.html")
OUT   = os.environ.get("OUT",  ".")
BASE  = "https://raceplanner.online"
GA    = "G-B0C2N8Q89V"
ADS   = "ca-pub-6369966478235204"

MARATHON = 42.195
HALF     = 21.0975

# ---- goal set (slug, "H:MM" label, total seconds) -------------------------
GOALS = [
    ("2-45", "2:45", 2*3600+45*60),
    ("3-00", "3:00", 3*3600),
    ("3-15", "3:15", 3*3600+15*60),
    ("3-30", "3:30", 3*3600+30*60),
    ("3-45", "3:45", 3*3600+45*60),
    ("4-00", "4:00", 4*3600),
    ("4-15", "4:15", 4*3600+15*60),
    ("4-30", "4:30", 4*3600+30*60),
    ("5-00", "5:00", 5*3600),
    ("5-30", "5:30", 5*3600+30*60),
]

# ---------- helpers ----------
def hms(sec):
    sec = round(sec); h = sec//3600; m = (sec%3600)//60; s = sec%60
    return (f"{h}:{m:02d}:{s:02d}" if h>0 else f"{m}:{s:02d}")

def msec(sec):  # M:SS  (pace)
    sec = round(sec); m = sec//60; s = sec%60
    return f"{m}:{s:02d}"

def extract_style(src_html):
    m = re.search(r"<style>.*?</style>", src_html, re.S)
    if not m:
        sys.exit("!! could not extract <style> from source")
    return m.group(0)

STYLE = extract_style(open(SRC, encoding="utf-8").read())

HEAD_FONTS_ADS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
    '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">'
    f'<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADS}" crossorigin="anonymous"></script>'
)

GTAG = (
    f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script>'
    "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}"
    f"gtag('js',new Date());gtag('config','{GA}');</script>"
)

HEADER = (
'<header><div class="wrap-h">'
'<a class="logo" href="/"><span class="mark">R</span><span class="full">Race&nbsp;<b>Planner</b></span></a>'
'<span class="spacer"></span>'
'<nav class="nav">'
'<a class="navlink" href="/gpx/" data-nav="0">Trail GPX Plan</a>'
'<a class="navlink" href="/" data-nav="1">HYROX Calculator</a>'
'<a class="navlink" href="/pace/" data-nav="2">Marathon Pace &amp; Predictor</a>'
'<a class="navlink" href="/guide/" data-nav="3">Guides</a>'
'</nav>'
'<span class="langtoggle"><button id="lang-ko" onclick="setLang(\'ko\')">한국어</button>'
'<button id="lang-en" onclick="setLang(\'en\')">EN</button></span>'
'</div></header>'
)

NAV_PAINT = """<script>(function(){
var NAV=[["/gpx/","Trail GPX Plan","트레일 GPX 레이스플랜"],["/","HYROX Calculator","하이록스 완주 계산기"],["/pace/","Marathon Pace & Predictor","마라톤 페이스·기록예측"],["/guide/","Guides","가이드"]];
function lang(){return (window.LANG==="ko"||document.documentElement.lang==="ko")?"ko":"en";}
function paint(){var L=lang();var path=location.pathname.replace(/index\\.html$/,"");if(path.length>1)path=path.replace(/\\/$/,"")+"/";
 document.querySelectorAll(".navlink[data-nav]").forEach(function(el){var it=NAV[+el.getAttribute("data-nav")];if(!it)return;
  el.textContent=(L==="ko")?it[2]:it[1];
  var href=it[0],active;if(href==="/")active=(path==="/");else if(href==="/guide/")active=path.indexOf("/guide/")===0;else active=path.indexOf(href)===0;
  el.classList.toggle("active",active);});}
var _s=window.setLang;if(typeof _s==="function"){window.setLang=function(l){_s(l);paint();};}
if(document.readyState!=="loading")paint();else document.addEventListener("DOMContentLoaded",paint);
setTimeout(paint,0);
})();</script>"""

I18N_CORE = """
function detectLang(){
  var u=new URLSearchParams(location.search).get("lang");
  if(u==="ko"||u==="en")return u;
  var s=localStorage.getItem("rp_lang");
  if(s==="ko"||s==="en")return s;
  var tz="";try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}
  var nav=(navigator.language||navigator.userLanguage||"").toLowerCase();
  if(nav.indexOf("ko")===0||tz==="Asia/Seoul")return "ko";
  return "en";
}
function applyLang(){
  var d=I18N[LANG];document.documentElement.lang=LANG;
  document.querySelectorAll("[data-i18n]").forEach(function(el){
    var k=el.getAttribute("data-i18n");if(d[k]==null)return;
    if(el.tagName==="TITLE")document.title=d[k];
    else if(el.tagName==="META")el.setAttribute("content",d[k]);
    else el.innerHTML=d[k];
  });
  document.getElementById("lang-ko").classList.toggle("on",LANG==="ko");
  document.getElementById("lang-en").classList.toggle("on",LANG==="en");
}
function setLang(l){LANG=l;localStorage.setItem("rp_lang",l);applyLang();}
"""

def page_shell(title, desc, canon, body, i18n_js, extra_head=""):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
{GTAG}
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
<title data-i18n="title">{html.escape(title)}</title>
<meta name="description" data-i18n="desc" content="{html.escape(desc)}" />
<link rel="canonical" href="{canon}" />
<link rel="alternate" hreflang="en" href="{canon}?lang=en" />
<link rel="alternate" hreflang="ko" href="{canon}?lang=ko" />
<link rel="alternate" hreflang="x-default" href="{canon}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="{html.escape(title)}" />
<meta name="theme-color" content="#0a0c10" />
<meta name="robots" content="index, follow" />
{STYLE}
{HEAD_FONTS_ADS}
{extra_head}
</head>
<body>
{HEADER}
<div class="shell"><div class="layout"><main class="center">
{body}
</main></div>
<footer>
  <span data-i18n="foot1">Race Planner · free tools for runners and HYROX athletes</span> — <a href="/pace/" data-i18n="foot_calc">Pace calculator</a><br/>
  <span data-i18n="foot2">Single-serve sports nutrition</span> — <a href="https://athletespick.com?utm_source=raceplanner&utm_medium=footer" target="_blank" rel="noopener">Athlete's Pick</a>
</footer>
</div>
<script>
var I18N={i18n_js};
var LANG="en";
{I18N_CORE}
LANG=detectLang();applyLang();
</script>
{NAV_PAINT}
</body>
</html>"""

def js_obj(d):
    # serialize a python dict of str->str into a JS object literal (values already HTML/JS-safe)
    items = []
    for k, v in d.items():
        v2 = v.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")
        items.append(f'{k}:"{v2}"')
    return "{" + ",".join(items) + "}"

# ---------------- SPOKE PAGE ----------------
def build_spoke(slug, label, T, prevg, nextg):
    pk   = T / MARATHON            # sec per km
    pm   = T / (MARATHON/1.609344) # sec per mile
    spd  = MARATHON / (T/3600.0)   # km/h
    hours = T/3600.0

    # unique per-km split table (even pace)
    rows = []
    for k in range(1, 43):
        d = k if k <= 42 else MARATHON
        rows.append(f'<tr><td>{k} km</td><td class="t">{hms(pk*k)}</td><td class="t">{msec(pk)}</td></tr>')
    rows.append(f'<tr><td>{MARATHON} km</td><td class="t">{hms(T)}</td><td class="t">{msec(pk)}</td></tr>')
    split_rows = "\n".join(rows)

    # checkpoints
    cps = [(5,"5K"),(10,"10K"),(15,"15K"),(HALF,"Half"),(25,"25K"),(30,"30K"),(35,"35K"),(40,"40K"),(MARATHON,"Finish")]
    cp_rows = "\n".join(
        f'<tr><td>{name}</td><td class="t">{hms(pk*dkm)}</td></tr>' for dkm,name in cps
    )

    # Riegel equivalents (fitness implied by this marathon time)
    def riegel(d2): return T * (d2/MARATHON)**1.06
    eq = [("5K",5),("10K",10),("Half",HALF)]
    eq_rows = "\n".join(
        f'<div><div class="rk">{n}</div><div class="rv">{hms(riegel(dd))}</div></div>' for n,dd in eq
    )

    # fueling (all these goals >2.5h -> 60-90 g/h band; trained gut up to ~90+)
    lo_gph, hi_gph = 60, 90
    carb_lo = round(lo_gph*hours); carb_hi = round(hi_gph*hours)
    na_lo, na_hi = 300, 800  # mg/h typical individual range

    pk_s = msec(pk); pm_s = msec(pm); spd_s = f"{spd:.1f}"
    half_t = hms(pk*HALF)

    # ---- FAQ (schema) ----
    faq = [
     (f"What pace is a {label} marathon?",
      f"A {label} marathon requires an even pace of {pk_s} per kilometer ({pm_s} per mile), about {spd_s} km/h. Over 42.195 km that adds up to exactly {label}."),
     (f"What are the 5K, 10K and halfway splits for a {label} marathon?",
      f"At even pace you pass 5K in {hms(pk*5)}, 10K in {hms(pk*10)}, and the halfway point (21.1 km) in {half_t}. Reaching halfway meaningfully faster than {half_t} is the classic positive-split mistake that causes late-race slowdown."),
     (f"How many carbohydrates do I need for a {label} marathon?",
      f"For a run of about {hours:.1f} hours, sports-nutrition consensus is roughly {lo_gph}–{hi_gph} g of carbohydrate per hour — around {carb_lo}–{carb_hi} g total — plus {na_lo}–{na_hi} mg of sodium per hour depending on sweat rate. Practice your exact fueling in training; never try anything new on race day."),
    ]
    faq_html = "\n".join(
      f'<h2>{html.escape(q)}</h2><p>{html.escape(a)}</p>' for q,a in faq
    )
    faq_ld = {
      "@context":"https://schema.org","@type":"FAQPage",
      "mainEntity":[{"@type":"Question","name":q,
        "acceptedAnswer":{"@type":"Answer","text":a}} for q,a in faq]
    }
    bc_ld = {
      "@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
        {"@type":"ListItem","position":1,"name":"Pace","item":f"{BASE}/pace/"},
        {"@type":"ListItem","position":2,"name":"Marathon","item":f"{BASE}/pace/marathon/"},
        {"@type":"ListItem","position":3,"name":f"{label} marathon","item":f"{BASE}/pace/marathon/{slug}/"},
      ]}
    import json
    ld = ('<script type="application/ld+json">'+json.dumps(faq_ld,ensure_ascii=False)+'</script>'
          '<script type="application/ld+json">'+json.dumps(bc_ld,ensure_ascii=False)+'</script>')

    # adjacent goal links
    adj = []
    if prevg: adj.append(f'<a class="morelink" href="/pace/marathon/{prevg[0]}/"><span class="ic">←</span><span data-i18n="prev">{prevg[1]} marathon pace</span></a>')
    if nextg: adj.append(f'<a class="morelink" href="/pace/marathon/{nextg[0]}/"><span class="ic">→</span><span data-i18n="next">{nextg[1]} marathon pace</span></a>')
    adj_html = "\n".join(adj)

    body = f"""
<section class="hero-top">
  <span class="eyebrow"><span class="pulse"></span><span data-i18n="eyebrow">MARATHON GOAL PACE</span></span>
  <h1 data-i18n="h1">{label} Marathon Pace</h1>
  <p class="lead" data-i18n="lead">The exact even pace, per-kilometer splits and checkpoint times you need to run a {label} marathon — plus fueling and equivalent race times. Free.</p>
</section>

<div class="card console">
  <div class="hero-card">
    <div class="k" data-i18n="need">Required even pace</div>
    <div class="v">{pk_s}</div>
    <div class="s"><span data-i18n="permi">per mile</span> <b>{pm_s}</b> · <span data-i18n="speed">speed</span> <b>{spd_s} km/h</b> · <span data-i18n="finish">finish</span> <b>{label}</b></div>
  </div>
  <div class="mini" style="margin-top:14px">
    <div><div class="mk" data-i18n="m5">5K split</div><div class="mv">{hms(pk*5)}</div></div>
    <div><div class="mk" data-i18n="m21">Halfway</div><div class="mv">{half_t}</div></div>
    <div><div class="mk" data-i18n="m30">30K split</div><div class="mv">{hms(pk*30)}</div></div>
  </div>
  <div class="hint" data-i18n="adjust">Want a different target? Use the full <a href="/pace/" style="color:var(--mint)">pace calculator &amp; race predictor</a>.</div>
</div>

<div class="card">
  <div class="sect" data-i18n="cp_sect">CHECKPOINT SPLITS</div>
  <table><thead><tr><th data-i18n="cp_dist">Distance</th><th style="text-align:right" data-i18n="cp_time">Time at even pace</th></tr></thead>
  <tbody>
{cp_rows}
  </tbody></table>
</div>

<div class="fuel">
  <h3>⚡ <span data-i18n="fuel_h">Fueling for a {label} marathon</span></h3>
  <p data-i18n="fuel_p">At roughly {hours:.1f} hours of running, aim for about <b>{lo_gph}–{hi_gph} g of carbohydrate per hour</b> (≈ {carb_lo}–{carb_hi} g total) and <b>{na_lo}–{na_hi} mg sodium per hour</b>. Test your exact fueling in training — never race on something new.</p>
  <a class="cta" href="https://athletespick.com?utm_source=raceplanner&utm_medium=fuelplan&utm_campaign=marathon_{slug}" target="_blank" rel="noopener" onclick="rpFuel()"><span data-i18n="fuel_cta">Build your race-day fuel →</span></a>
</div>

<div class="card">
  <div class="sect" data-i18n="eq_sect">EQUIVALENT RACE TIMES</div>
  <div class="runs">
{eq_rows}
    <div><div class="rk">Marathon</div><div class="rv">{label}</div></div>
  </div>
  <div class="hint" data-i18n="eq_note">Equivalent performances at the same fitness (Riegel model). Useful for pacing tune-up races.</div>
</div>

<details class="card"><summary style="cursor:pointer;font-weight:700;font-size:14px" data-i18n="full_split">Full kilometer-by-kilometer split table ▾</summary>
  <table style="margin-top:12px"><thead><tr><th>KM</th><th style="text-align:right" data-i18n="pc_cumul">Cumulative</th><th style="text-align:right" data-i18n="pc_pacekm">Pace/km</th></tr></thead>
  <tbody>
{split_rows}
  </tbody></table>
</details>

<div class="info">
  <h2 data-i18n="why_h">How to actually run a {label} marathon</h2>
  <p data-i18n="why_p">The pace above assumes an even effort. In a study of over 4 million race records, 28% of men and 17% of women slowed dramatically in the second half — "hitting the wall" — almost always because they banked time early. Aim to reach halfway ({half_t}) on schedule or a few seconds behind, then hold. A flat, even or slight negative split is how most runners hit {label}.</p>
{faq_html}
  <div class="moregrid" style="margin-top:16px">
{adj_html}
    <a class="morelink" href="/pace/marathon/"><span class="ic">≡</span><span data-i18n="allgoals">All marathon goal times</span></a>
    <a class="morelink" href="/pace/"><span class="ic">⏱</span><span data-i18n="tool">Pace calculator &amp; predictor</span></a>
  </div>
  <p class="disc" data-i18n="disc">Times are mathematical even-pace targets, not a guarantee. Real results vary with course, weather, fitness and fueling. Nutrition guidance is general — consult a professional for individual needs.</p>
</div>
{ld}
"""

    en = {
      "title": f"{label} Marathon Pace — Splits, Pace Chart & Fueling | Race Planner",
      "desc": f"Exact pace for a {label} marathon: {pk_s}/km ({pm_s}/mi). Full km splits, 5K/10K/halfway checkpoints, carb & sodium fueling, and equivalent 5K/10K/half times. Free.",
      "eyebrow":"MARATHON GOAL PACE",
      "h1": f"{label} Marathon Pace",
      "lead": f"The exact even pace, per-kilometer splits and checkpoint times you need to run a {label} marathon — plus fueling and equivalent race times. Free.",
      "need":"Required even pace","permi":"per mile","speed":"speed","finish":"finish",
      "m5":"5K split","m21":"Halfway","m30":"30K split",
      "adjust":'Want a different target? Use the full <a href="/pace/" style="color:var(--mint)">pace calculator &amp; race predictor</a>.',
      "cp_sect":"CHECKPOINT SPLITS","cp_dist":"Distance","cp_time":"Time at even pace",
      "fuel_h": f"Fueling for a {label} marathon",
      "fuel_p": f"At roughly {hours:.1f} hours of running, aim for about <b>{lo_gph}–{hi_gph} g of carbohydrate per hour</b> (≈ {carb_lo}–{carb_hi} g total) and <b>{na_lo}–{na_hi} mg sodium per hour</b>. Test your exact fueling in training — never race on something new.",
      "fuel_cta":"Build your race-day fuel →",
      "eq_sect":"EQUIVALENT RACE TIMES","eq_note":"Equivalent performances at the same fitness (Riegel model). Useful for pacing tune-up races.",
      "full_split":"Full kilometer-by-kilometer split table ▾","pc_cumul":"Cumulative","pc_pacekm":"Pace/km",
      "why_h": f"How to actually run a {label} marathon",
      "why_p": f'The pace above assumes an even effort. In a study of over 4 million race records, 28% of men and 17% of women slowed dramatically in the second half — "hitting the wall" — almost always because they banked time early. Aim to reach halfway ({half_t}) on schedule or a few seconds behind, then hold. A flat, even or slight negative split is how most runners hit {label}.',
      "prev": (f"{prevg[1]} marathon pace" if prevg else ""),
      "next": (f"{nextg[1]} marathon pace" if nextg else ""),
      "allgoals":"All marathon goal times","tool":"Pace calculator &amp; predictor",
      "disc":"Times are mathematical even-pace targets, not a guarantee. Real results vary with course, weather, fitness and fueling. Nutrition guidance is general — consult a professional for individual needs.",
      "foot1":"Race Planner · free tools for runners and HYROX athletes","foot_calc":"Pace calculator","foot2":"Single-serve sports nutrition",
    }
    ko = {
      "title": f"{label} 마라톤 페이스 — 구간기록·페이스표·보급 | 레이스 플래너",
      "desc": f"{label} 마라톤에 필요한 페이스: {pk_s}/km ({pm_s}/mi). km별 구간, 5K·10K·중간 체크포인트, 탄수·나트륨 보급, 5K·10K·하프 등가기록까지. 무료.",
      "eyebrow":"마라톤 목표 페이스",
      "h1": f"{label} 마라톤 페이스",
      "lead": f"{label} 마라톤 완주에 필요한 이븐 페이스·km별 구간·체크포인트 기록에 보급과 등가기록까지. 모두 무료.",
      "need":"필요 이븐 페이스","permi":"마일당","speed":"속도","finish":"완주",
      "m5":"5K 구간","m21":"중간지점","m30":"30K 구간",
      "adjust":'다른 목표가 필요하세요? 전체 <a href="/pace/" style="color:var(--mint)">페이스 계산기·기록예측</a>을 쓰세요.',
      "cp_sect":"체크포인트 구간","cp_dist":"거리","cp_time":"이븐 페이스 기준 통과 기록",
      "fuel_h": f"{label} 마라톤 보급 전략",
      "fuel_p": f"약 {hours:.1f}시간 달리는 레이스라면 시간당 <b>탄수 {lo_gph}–{hi_gph} g</b>(총 {carb_lo}–{carb_hi} g)와 <b>나트륨 {na_lo}–{na_hi} mg</b>을 목표로 하세요. 정확한 보급은 반드시 훈련에서 테스트하고, 레이스 당일 새 제품은 금물입니다.",
      "fuel_cta":"레이스 보급 구성하기 →",
      "eq_sect":"등가 기록","eq_note":"같은 체력에서의 등가 기록(Riegel 모델). 조정 레이스 페이싱에 유용합니다.",
      "full_split":"km별 전체 구간표 ▾","pc_cumul":"누적","pc_pacekm":"페이스/km",
      "why_h": f"{label} 마라톤, 실제로 이렇게 달린다",
      "why_p": f'위 페이스는 이븐 페이스 기준입니다. 400만 기록 분석에서 남성 28%·여성 17%가 후반에 급격히 무너졌고("벽"), 거의 대부분 초반에 시간을 벌어둔 탓이었습니다. 중간지점({half_t})을 예정대로 혹은 몇 초 뒤에 통과한 뒤 유지하세요. 이븐 또는 약한 네거티브 스플릿이 {label} 달성의 정석입니다.',
      "prev": (f"{prevg[1]} 마라톤 페이스" if prevg else ""),
      "next": (f"{nextg[1]} 마라톤 페이스" if nextg else ""),
      "allgoals":"마라톤 목표시간 전체","tool":"페이스 계산기·기록예측",
      "disc":"기록은 수학적 이븐 페이스 목표이지 보장이 아닙니다. 실제 결과는 코스·날씨·체력·보급에 따라 달라집니다. 영양 안내는 일반적 지침이며 개인별로 전문가와 상의하세요.",
      "foot1":"레이스 플래너 · 러너·하이록스 선수를 위한 무료 도구","foot_calc":"페이스 계산기","foot2":"스포츠 뉴트리션 낱개 구매",
    }
    i18n_js = "{en:"+js_obj(en)+",ko:"+js_obj(ko)+"}"

    ga_hook = f"""<script>
function rpFuel(){{try{{gtag('event','fuel_click',{{sport:'run',pack:'marathon',medium:'fuelplan',campaign:'marathon_{slug}'}});}}catch(e){{}}}}
try{{gtag('event','plan_generated',{{sport:'run',level:'{label}',medium:'seo_pace',dist_km:42.195}});}}catch(e){{}}
</script>"""

    return page_shell(en["title"], en["desc"], f"{BASE}/pace/marathon/{slug}/", body, i18n_js, "") \
        .replace("</body>", ga_hook + "\n</body>")

# ---------------- HUB PAGE ----------------
def build_hub():
    cards = []
    ld_items = []
    for i,(slug,label,T) in enumerate(GOALS):
        pk = T/MARATHON
        cards.append(
          f'<a class="morelink" href="/pace/marathon/{slug}/"><span class="ic">🏁</span>'
          f'<span><b>{label}</b> · <span style="color:var(--sub)">{msec(pk)}/km</span></span></a>')
        ld_items.append({"@type":"ListItem","position":i+1,"name":f"{label} marathon pace","url":f"{BASE}/pace/marathon/{slug}/"})
    cards_html = "\n".join(cards)
    import json
    ld = ('<script type="application/ld+json">'+json.dumps(
        {"@context":"https://schema.org","@type":"ItemList","itemListElement":ld_items},ensure_ascii=False)+'</script>')

    body = f"""
<section class="hero-top">
  <span class="eyebrow"><span class="pulse"></span><span data-i18n="eyebrow">MARATHON PACE CHART</span></span>
  <h1 data-i18n="h1">Marathon Pace Chart by Goal Time</h1>
  <p class="lead" data-i18n="lead">Pick your target finish time to get the exact even pace, per-kilometer splits, checkpoint times and fueling for your marathon. Free, no sign-up.</p>
</section>
<div class="card">
  <div class="sect" data-i18n="pick">PICK YOUR GOAL</div>
  <div class="moregrid">
{cards_html}
  </div>
  <div class="hint" data-i18n="custom">Need a time not listed, or another distance? Use the full <a href="/pace/" style="color:var(--mint)">pace calculator &amp; race predictor</a>.</div>
</div>
<div class="info">
  <h2 data-i18n="how_h">How to use a marathon pace chart</h2>
  <p data-i18n="how_p">Your goal time divided by 42.195 km gives the pace you must average. The hard part is holding it evenly: banking time in the first half is the number-one cause of the late-race collapse known as "hitting the wall". Each goal page below shows your exact 5K, 10K, halfway and 30K checkpoints so you can pace by feel and by watch.</p>
  <div class="moregrid" style="margin-top:14px">
    <a class="morelink" href="/pace/"><span class="ic">⏱</span><span data-i18n="tool">Pace calculator &amp; predictor</span></a>
    <a class="morelink" href="/"><span class="ic">🔥</span><span data-i18n="hyrox">HYROX finish-time calculator</span></a>
  </div>
</div>
{ld}
"""
    en = {
      "title":"Marathon Pace Chart by Goal Time — Splits & Fueling | Race Planner",
      "desc":"Free marathon pace chart. Pick a goal time (2:45 to 5:30) for exact even pace, per-km splits, 5K/10K/halfway checkpoints and carb & sodium fueling.",
      "eyebrow":"MARATHON PACE CHART","h1":"Marathon Pace Chart by Goal Time",
      "lead":"Pick your target finish time to get the exact even pace, per-kilometer splits, checkpoint times and fueling for your marathon. Free, no sign-up.",
      "pick":"PICK YOUR GOAL",
      "custom":'Need a time not listed, or another distance? Use the full <a href="/pace/" style="color:var(--mint)">pace calculator &amp; race predictor</a>.',
      "how_h":"How to use a marathon pace chart",
      "how_p":'Your goal time divided by 42.195 km gives the pace you must average. The hard part is holding it evenly: banking time in the first half is the number-one cause of the late-race collapse known as "hitting the wall". Each goal page shows your exact 5K, 10K, halfway and 30K checkpoints so you can pace by feel and by watch.',
      "tool":"Pace calculator &amp; predictor","hyrox":"HYROX finish-time calculator",
      "foot1":"Race Planner · free tools for runners and HYROX athletes","foot_calc":"Pace calculator","foot2":"Single-serve sports nutrition",
    }
    ko = {
      "title":"목표시간별 마라톤 페이스표 — 구간·보급 | 레이스 플래너",
      "desc":"무료 마라톤 페이스표. 목표시간(2:45~5:30)을 고르면 이븐 페이스·km별 구간·5K/10K/중간 체크포인트·탄수/나트륨 보급을 제공합니다.",
      "eyebrow":"마라톤 페이스표","h1":"목표시간별 마라톤 페이스표",
      "lead":"목표 완주시간을 고르면 이븐 페이스·km별 구간·체크포인트·보급까지 제공합니다. 무료, 가입 없음.",
      "pick":"목표를 고르세요",
      "custom":'원하는 시간이 없거나 다른 거리가 필요하세요? 전체 <a href="/pace/" style="color:var(--mint)">페이스 계산기·기록예측</a>을 쓰세요.',
      "how_h":"마라톤 페이스표 사용법",
      "how_p":'목표시간을 42.195 km로 나누면 평균 유지해야 할 페이스가 나옵니다. 어려운 건 이를 고르게 유지하는 것 — 전반에 시간을 벌어두면 후반 "벽"의 1순위 원인이 됩니다. 각 목표 페이지가 5K·10K·중간·30K 체크포인트를 정확히 보여주어 감과 시계로 페이싱할 수 있게 합니다.',
      "tool":"페이스 계산기·기록예측","hyrox":"하이록스 완주 기록 계산기",
      "foot1":"레이스 플래너 · 러너·하이록스 선수를 위한 무료 도구","foot_calc":"페이스 계산기","foot2":"스포츠 뉴트리션 낱개 구매",
    }
    i18n_js = "{en:"+js_obj(en)+",ko:"+js_obj(ko)+"}"
    return page_shell(en["title"], en["desc"], f"{BASE}/pace/marathon/", body, i18n_js, "")


def update_sitemap():
    sp = os.path.join(OUT, "sitemap.xml")
    if not os.path.exists(sp):
        print("!! sitemap.xml not found, skipping sitemap update"); return
    s = open(sp, encoding="utf-8").read()
    # remove any existing /pace/marathon/ url blocks (idempotent)
    s = re.sub(r'\s*<url>\s*<loc>https://raceplanner\.online/pace/marathon/[^<]*</loc>.*?</url>', '', s, flags=re.S)
    def blk(loc, pri, cf):
        return ("  <url>\n    <loc>"+loc+"</loc>\n"
                '    <xhtml:link rel="alternate" hreflang="en" href="'+loc+'?lang=en"/>\n'
                '    <xhtml:link rel="alternate" hreflang="ko" href="'+loc+'?lang=ko"/>\n'
                '    <xhtml:link rel="alternate" hreflang="x-default" href="'+loc+'"/>\n'
                "    <changefreq>"+cf+"</changefreq><priority>"+str(pri)+"</priority>\n  </url>\n")
    add = blk(BASE+"/pace/marathon/", 0.85, "weekly")
    for slug, label, T in GOALS:
        add += blk(BASE+"/pace/marathon/"+slug+"/", 0.75, "monthly")
    s = s.replace("</urlset>", add + "</urlset>")
    open(sp, "w", encoding="utf-8").write(s)
    print("sitemap updated:", s.count("<loc>"), "urls")

# ---------------- WRITE ----------------
def wr(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(content)
    return len(content)

def main():
    total = 0; n = 0
    p = f"{OUT}/pace/marathon/index.html"
    total += wr(p, build_hub()); n += 1
    for i,(slug,label,T) in enumerate(GOALS):
        prevg = (GOALS[i-1][0], GOALS[i-1][1]) if i>0 else None
        nextg = (GOALS[i+1][0], GOALS[i+1][1]) if i<len(GOALS)-1 else None
        p = f"{OUT}/pace/marathon/{slug}/index.html"
        total += wr(p, build_spoke(slug, label, T, prevg, nextg)); n += 1
    update_sitemap()
    print(f"OK  wrote {n} pages, {total} bytes  -> {OUT}/pace/marathon/")
    # quick self-check on one page's math
    T=3*3600+30*60; pk=T/MARATHON
    print(f"CHK 3:30 pace/km = {msec(pk)} (expect 4:58), half = {hms(pk*HALF)} (expect 1:45:00)")

if __name__ == "__main__":
    main()
