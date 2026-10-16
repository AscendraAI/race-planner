(function () {
  'use strict';
  if (!document.documentElement.classList.contains('utnp')) return;
  var app = document.getElementById('utnp-app');
  var state = { event: null, course: null, discipline: null, plan: null, answers: {},
    tried: [], curious: [], favorite: '', reasons: [], cardNo: '' };
  // The three levels already offered by the standard GPX planner.
  var FUEL_G_PER_H = { '완주': 30, '기록': 45, '경쟁': 60 };
  var SWEAT_PER_H = { '적음': [450, 300], '보통': null, '많음': [700, 600] };
  var FORM_KEYS = { '짜 먹는 젤': 'form_gel', '마시는 액체형': 'form_drink', '씹는 타입': 'form_chew', '천연 원료': 'form_natural' };
  var $ = function (id) { return document.getElementById(id); };
  var safe = function (s) { return esc(String(s == null ? '' : s)); };
  var QUESTIONS = [
    ['hunger', '배고픔은 언제 느끼나요?'],
    ['cramp', '쥐가 나는 편인가요?'],
    ['stomach', '젤을 먹을 때 속은 어떤가요?'],
    ['forms', '좋아하는 형태를 골라 주세요'],
    ['caffeine', '카페인은 어떻게 드시나요?']
  ];
  function pressOptions(key, options, multi) {
    return '<div class="ut-choice-row" data-group="' + key + '">' + options.map(function (o) {
      return '<button type="button" class="ut-choice" data-choice="' + safe(o) + '" aria-pressed="false">' + safe(o) + '</button>';
    }).join('') + '</div>';
  }
  function section(n, title, body, id) {
    return '<section class="ut-step" id="' + id + '"><div class="ut-num">' + n + ' / 07</div><h2>' + title + '</h2>' + body + '</section>';
  }
  function active() {
    var t = Date.now();
    return t >= Date.parse(state.event.startsAtKst) && t < Date.parse(state.event.endsAtKst);
  }
  function clearExpiredPending() {
    if (!configured() || Date.now() >= Date.parse(state.event.endsAtKst) || Date.now() >= Date.parse(state.event.contactPurgeOn + 'T00:00:00+09:00')) {
      localStorage.removeItem('rp_utnp_pending');
      return;
    }
    try {
      var saved = JSON.parse(localStorage.getItem('rp_utnp_pending') || 'null');
      if (saved && saved.rpc && saved.rpc.p_note) {
        saved.rpc.p_note = null;
        localStorage.setItem('rp_utnp_pending', JSON.stringify(saved));
      }
    } catch (e) { localStorage.removeItem('rp_utnp_pending'); }
  }
  function render() {
    var event = state.event, live = active();
    clearExpiredPending();
    document.documentElement.lang = 'ko';
    var displayBrands = event.participatingBrands.slice().sort(function (a, b) { return a.localeCompare(b, 'ko-KR'); });
    var races = event.disciplines.map(function (d) {
      return '<button type="button" class="ut-course" data-discipline="' + d.id + '" aria-pressed="false">' + safe(d.name) +
        '<small>' + d.distanceKm + 'km' + (d.estimated ? ' 약' : '+') + ' · 상승 ' + d.ascentM.toLocaleString('ko-KR') + 'm' + (d.estimated ? ' 약' : '+') + (d.cutoffHours ? ' · 제한 ' + d.cutoffHours + '시간' : '') + '</small></button>';
    }).join('');
    var survey = QUESTIONS.map(function (q, i) {
      return '<fieldset class="ut-fieldset ut-group"><legend>' + (i + 1) + '. ' + q[1] + '</legend>' + pressOptions(q[0], q[0] === 'forms' ? Object.keys(FORM_KEYS) : event.questions[q[0]]) + '</fieldset>';
    }).join('');
    var brands = displayBrands.map(function (b) { return '<button type="button" class="ut-choice" data-choice="' + safe(b) + '" aria-pressed="false">' + safe(b) + '</button>'; }).join('');
    app.innerHTML = '<div class="ut-wrap"><div class="ut-brand"><strong>RACE PLANNER</strong><span>UTNP 2026</span></div>' +
      '<div class="ut-hero"><div class="ut-kicker">내 레이스를 미리 그려 보세요</div><h1>' + safe(event.copy.headline) + '</h1><p>' + safe(event.copy.intro) + '</p></div>' +
      section('01', '어떤 종목에 나가나요?', '<p class="ut-sub">거리·상승·제한시간은 2026 UTNP 공식 종목 안내 기준입니다.</p><div class="ut-course-grid">' + races + '</div>', 'ut-step-course') +
      section('02', '목표 기록을 정해 주세요', '<p class="ut-sub">목표 기록을 직접 넣거나 인덱스로 예상 시간을 볼 수 있습니다.</p>' +
        pressOptions('goalMode', ['목표 기록', '인덱스']) +
        '<div id="ut-goal-manual"><div class="ut-field"><label for="ut-hours">목표 시간</label><div style="display:flex;gap:8px"><input id="ut-hours" type="number" min="0" max="72" inputmode="numeric" value="8" aria-label="목표 시간, 시"><input id="ut-minutes" type="number" min="0" max="59" inputmode="numeric" value="0" aria-label="목표 시간, 분"></div><div class="ut-hint">시 · 분 순서로 입력해 주세요.</div></div></div>' +
        '<div id="ut-goal-index" class="ut-hidden"><div class="ut-field"><label for="ut-index-value">인덱스 종류와 점수</label><div style="display:flex;gap:8px"><select id="ut-index-kind" aria-label="인덱스 종류"><option>ITRA</option><option>UTMB</option></select><input id="ut-index-value" type="number" min="1" max="1000" inputmode="numeric" placeholder="예: 600" aria-label="인덱스 점수"></div></div><p class="ut-hint" id="ut-index-estimate">' + safe(event.indexNote) + '</p></div>', 'ut-step-goal') +
      section('03', '내 레이스 정보', '<p class="ut-sub">계산과 부스 카드를 위한 선택입니다.</p>' +
        '<div class="ut-group"><div class="ut-label">성별</div>' + pressOptions('gender', event.questions.gender) + '</div>' +
        '<div class="ut-group"><div class="ut-label">나이대</div>' + pressOptions('age', event.questions.age) + '</div>' +
        '<div class="ut-group"><div class="ut-label">이번 레이스 계획</div>' + pressOptions('racePlan', event.questions.race_plan) + '</div>' +
        '<div class="ut-group"><div class="ut-label">땀은 어느 정도 나나요?</div>' + pressOptions('sweat', event.questions.sweat) + '</div>' +
        '<label class="ut-consent"><input id="ut-weather" type="checkbox"><span>대회 날씨로 페이스·보급 보정 (선택)</span></label>' +
        '<button class="ut-primary" id="ut-build" type="button">내 보급 플랜 보기</button><p class="ut-error" id="ut-build-error" role="alert"></p>', 'ut-step-profile') +
      section('04', '내 보급 플랜', '<p class="ut-sub">GPX 고도와 목표 시간을 바탕으로 계산했습니다.</p><div id="ut-plan-content">위에서 종목과 목표를 고른 뒤 플랜을 열어 주세요.</div>', 'ut-step-plan') +
      section('05', '9:16 공유 카드', '<p class="ut-sub">플랜을 만들면 #UTNP 카드가 나옵니다.</p><div id="ut-share-content"></div>', 'ut-step-share') +
      (live ? section('06', '부스 설문', '<p class="ut-sub">문항을 한 화면에서 골라 주세요. 연락처는 카드가 나온 뒤 선택할 수 있습니다.</p>' + survey +
        '<div class="ut-group"><div class="ut-label">써 본 브랜드</div><div class="ut-choice-row ut-brand-list" data-group="tried">' + brands + '</div></div>' +
        '<div class="ut-group"><div class="ut-label">궁금한 브랜드</div><div class="ut-choice-row ut-brand-list" data-group="curious">' + brands + '</div></div>' +
        '<div class="ut-group"><div class="ut-label">제일 좋아하는 브랜드 (선택)</div>' + pressOptions('favorite', displayBrands.concat(['그 밖의 브랜드'])) + '<div class="ut-field ut-hidden" id="ut-other-wrap"><label for="ut-other-brand">그 밖의 브랜드 이름</label><input id="ut-other-brand" maxlength="20"><div class="ut-hint">이름은 40자 글 칸에 함께 보관합니다.</div></div></div>' +
        '<div class="ut-group"><div class="ut-label">고른 이유 (선택)</div>' + pressOptions('reasons', event.reasonOptions) + '</div>' +
        '<div class="ut-field"><label for="ut-note">더 적고 싶은 말 (선택 · 40자)</label><input id="ut-note" maxlength="40" placeholder="이름·전화·건강 상태는 적지 마세요"></div>' +
        '<button class="ut-primary" id="ut-submit" type="button" disabled>부스 카드 만들기</button><p class="ut-status" id="ut-submit-status" role="status"></p><button class="ut-secondary ut-hidden" id="ut-retry" type="button">보관한 답 다시 보내기</button>', 'ut-step-survey') : '') +
      (live ? section('07', '부스 카드', '<p class="ut-sub">직원에게 이 카드를 보여 주세요.</p><div id="ut-booth-content">설문을 보내면 카드가 나옵니다.</div>' +
        '<div id="ut-contact-wrap" class="ut-hidden"><div class="ut-field"><label for="ut-contact">연락처 (선택)</label><input id="ut-contact" type="tel" autocomplete="tel" maxlength="120" placeholder="휴대전화 또는 이메일"></div>' +
        '<label class="ut-consent"><input id="ut-consent-required" type="checkbox"><span>연락처 수집·이용에 동의합니다. 목적: 플랜 재발송·행사 안내. 항목: 입력한 연락처. 보관: 2026년 11월 30일까지.</span></label>' +
        '<label class="ut-consent"><input id="ut-consent-marketing" type="checkbox"><span>마케팅 정보 수신에 동의합니다. (선택)</span></label>' +
        '<button class="ut-secondary" id="ut-save-contact" type="button">연락처 저장</button><p class="ut-status" id="ut-contact-status" role="status"></p></div>', 'ut-step-booth') : '') +
      (!live ? '<p class="ut-hint" id="ut-event-closed">' + safe(Date.now() < Date.parse(event.startsAtKst) ? event.copy.opens : event.copy.closed) + '</p>' : '') + '</div>';
    bind();
  }
  function selectButton(button) {
    var group = button.parentElement.dataset.group;
    var multi = ['forms', 'tried', 'curious', 'reasons'].includes(group);
    if (!multi) button.parentElement.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    button.setAttribute('aria-pressed', multi && button.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    var picked = Array.from(button.parentElement.querySelectorAll('[aria-pressed="true"]')).map(function (b) { return b.dataset.choice; });
    if (group === 'goalMode') { $('ut-goal-manual').classList.toggle('ut-hidden', picked[0] !== '목표 기록'); $('ut-goal-index').classList.toggle('ut-hidden', picked[0] !== '인덱스'); }
    else if (group === 'tried' || group === 'curious') {
      state[group] = picked;
      var other = group === 'tried' ? 'curious' : 'tried';
      state[other] = state[other].filter(function (brand) { return brand !== button.dataset.choice || !picked.includes(brand); });
      app.querySelectorAll('[data-group="' + other + '"] button').forEach(function (b) {
        if (b.dataset.choice === button.dataset.choice && picked.includes(b.dataset.choice)) b.setAttribute('aria-pressed', 'false');
      });
    }
    else if (group === 'reasons') state.reasons = picked;
    else if (group === 'favorite') { state.favorite = picked[0] || ''; $('ut-other-wrap').classList.toggle('ut-hidden', state.favorite !== '그 밖의 브랜드'); }
    else state.answers[group] = multi ? picked : picked[0];
    updateEstimate(); updateSubmit();
  }
  function bind() {
    app.querySelectorAll('[data-choice]').forEach(function (b) { b.addEventListener('click', function () { selectButton(b); }); });
    app.querySelectorAll('[data-discipline]').forEach(function (b) { b.addEventListener('click', function () { chooseCourse(b.dataset.discipline); }); });
    app.querySelector('[data-group="goalMode"] button').click();
    $('ut-build').addEventListener('click', build);
    ['ut-index-value', 'ut-index-kind'].forEach(function (id) { $(id).addEventListener('input', updateEstimate); });
    if (active()) {
      $('ut-submit').addEventListener('click', submit);
      $('ut-retry').addEventListener('click', retryPending);
      $('ut-save-contact').addEventListener('click', saveContact);
      try { var saved = JSON.parse(localStorage.getItem('rp_utnp_pending') || 'null'); if (saved && saved.rpc) { $('ut-submit-status').textContent = '기기에 보관한 답이 있습니다.'; $('ut-retry').classList.remove('ut-hidden'); } } catch (e) { localStorage.removeItem('rp_utnp_pending'); }
    }
  }
  function chooseCourse(id) {
    state.discipline = state.event.disciplines.find(function (d) { return d.id === id; });
    state.course = null;
    app.querySelectorAll('[data-discipline]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.discipline === id ? 'true' : 'false'); });
    $('ut-build-error').textContent = '';
    updateEstimate();
    fetch(state.discipline.course).then(function (r) { if (!r.ok) throw Error('course'); return r.json(); }).then(function (c) {
      if (state.discipline.id !== id) return;
      state.course = c;
    }).catch(function () { $('ut-build-error').textContent = '코스를 불러오지 못했습니다. 다시 골라 주세요.'; });
  }
  function seconds(s) { var p = s.split(':').map(Number); return p[0] * 3600 + p[1] * 60 + p[2]; }
  function targetSeconds() {
    var mode = app.querySelector('[data-group="goalMode"] [aria-pressed="true"]').dataset.choice;
    if (mode === '목표 기록') {
      var h = Number($('ut-hours').value), m = Number($('ut-minutes').value);
      return Number.isInteger(h) && h >= 0 && h <= 72 && Number.isInteger(m) && m >= 0 && m < 60 ? h * 3600 + m * 60 : NaN;
    }
    var kind = $('ut-index-kind').value, score = Number($('ut-index-value').value);
    if (!state.discipline || !state.answers.gender || !Number.isFinite(score) || score > 1000) return NaN;
    var base = state.discipline.indexReference[state.answers.gender === '여성' ? 'female' : 'male'];
    var minScore = Math.ceil(seconds(base) * 1000 * state.event.indexFactors[kind] / (72 * 3600));
    $('ut-index-value').min = String(minScore);
    if (score < minScore) return NaN;
    return Math.round(seconds(base) * 1000 * state.event.indexFactors[kind] / score);
  }
  function updateEstimate() {
    var s = targetSeconds();
    $('ut-index-estimate').textContent = state.event.indexNote + (Number.isFinite(s) ? ' · 예상 기록 ' + fmt(s) : '');
  }
  function updateSubmit() {
    var b = $('ut-submit'); if (!b) return;
    b.disabled = !state.plan || !QUESTIONS.every(function (q) { return q[0] === 'forms' ? Array.isArray(state.answers.forms) && state.answers.forms.length : !!state.answers[q[0]]; });
  }
  function build() {
    var error = $('ut-build-error'); error.textContent = '';
    var s = targetSeconds();
    if (!state.discipline || !state.course) { error.textContent = '종목을 고르고 코스가 열릴 때까지 기다려 주세요.'; return; }
    if (!Number.isFinite(s) || s < 3600 || s > 72 * 3600) { error.textContent = '목표 시간을 확인해 주세요.'; return; }
    if (!['gender', 'age', 'racePlan', 'sweat'].every(function (k) { return !!state.answers[k]; })) { error.textContent = '성별·나이대·계획·땀을 모두 골라 주세요.'; return; }
    var c = state.course;
    var course = rescaleCourse(buildSegments({ lat: c.pts.map(function (p) { return p[0]; }), lon: c.pts.map(function (p) { return p[1]; }), ele: c.ele, hasEle: true }), state.discipline.distanceKm * 1000);
    course.dPlus = state.discipline.ascentM; // Display the 2026 official figure; segment grades remain GPX-based.
    var level = FUEL_G_PER_H[state.answers.racePlan];
    var chosenDiscipline = state.discipline;
    var done = function (weather) {
      if (state.discipline !== chosenDiscipline) return;
      var p = buildPlan(course, s, 'trail', level, weather, SWEAT_PER_H[state.answers.sweat]);
      p.indexBased = app.querySelector('[data-group="goalMode"] [aria-pressed="true"]').dataset.choice === '인덱스';
      state.plan = p; window.PLAN = p; window.UTNP_DISCIPLINE = state.discipline.name;
      renderPlan(); renderShare(); updateSubmit();
      $('ut-step-plan').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if ($('ut-weather').checked) {
      error.textContent = '날씨를 확인하고 있습니다.';
      getWeather(c.start[0], c.start[1], chosenDiscipline.raceDate, chosenDiscipline.startHour)
        .then(function (weather) { error.textContent = ''; done(weather); })
        .catch(function () { error.textContent = '날씨를 불러오지 못해 날씨 보정 없이 계산했습니다.'; done(null); });
    } else done(null);
  }
  function renderPlan() {
    var p = state.plan, d = state.discipline;
    var total = Math.round(p.Tadj / 3600 * p.carbH), gel = Math.round(total / 25);
    var aids = d.aidStations;
    var rows = p.kms.map(function (k) {
      var aid = aids.find(function (a) { return Math.abs(a.km - k.distEnd / 1000) < 0.55; });
      var mark = p.marks.find(function (m) { return Math.abs(m.km - k.distEnd / 1000) < 0.55; });
      return '<tr class="' + (aid ? 'ut-aid' : '') + '"><td>' + (aid ? safe(aid.name) + ' · ' : '') + k.km + 'km</td><td>' + pace(k.pace) + '</td><td>' + fmt(k.cum) + '</td><td>' + (mark ? '보급 · 물 ' + mark.water + 'ml' : '') + '</td></tr>';
    }).join('');
    $('ut-plan-content').innerHTML = (p.indexBased ? '<p class="ut-hint">' + safe(state.event.indexNote.replace('추정치', '예상치')) + '</p>' : '') + '<div class="ut-total">총 ' + total.toLocaleString('ko-KR') + 'g <small>25g 젤 기준 약 ' + gel + '개</small></div>' +
      '<div class="ut-metrics"><div><small>탄수화물 / 시간</small><b>' + p.carbH + 'g</b></div><div><small>물 / 시간</small><b>' + p.waterH + 'ml</b></div><div><small>나트륨 / 시간</small><b>' + p.naH + 'mg</b></div></div>' +
      '<svg class="ut-elev" id="ut-elevation" role="img" aria-label="GPX 고도표" viewBox="0 0 500 100" preserveAspectRatio="none"></svg>' +
      '<div class="ut-table-wrap"><table class="ut-table"><thead><tr><th>구간·보급소</th><th>페이스</th><th>도착</th><th>보급 시점</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="ut-legend">초록색은 2026 UTNP 공식 코스에 표시된 보급 지점입니다. 페이스와 시간당 수치는 계획용 추정치입니다.' + (p.weather ? ' 날씨 보정 ' + p.pen.toFixed(1) + '%가 반영됐습니다.' : '') + '</p>' +
      (active() ? '<button class="ut-primary" id="ut-to-survey" type="button">' + safe(state.event.copy.surveyCta) + '</button>' : '');
    var values = p.course.prof.e, lo = Math.min.apply(null, values), hi = Math.max.apply(null, values), range = Math.max(1, hi - lo);
    var sampled = values.filter(function (_, i) { return i % Math.max(1, Math.floor(values.length / 200)) === 0; });
    var path = sampled.map(function (v, i) { return (i ? 'L' : 'M') + (i / Math.max(1, sampled.length - 1) * 500).toFixed(1) + ' ' + (95 - (v - lo) / range * 88).toFixed(1); }).join(' ');
    $('ut-elevation').innerHTML = '<path d="' + path + '" fill="none" stroke="#c8ff43" stroke-width="2"/>';
    if (active()) $('ut-to-survey').addEventListener('click', function () { $('ut-step-survey').scrollIntoView({ behavior: 'smooth' }); });
  }
  function renderShare() {
    var canvas = $('rp_canvas');
    $('ut-share-content').replaceChildren(canvas);
    canvas.className = 'ut-share-canvas';
    buildShareCard(state.plan);
    $('ut-share-content').insertAdjacentHTML('beforeend', '<button class="ut-secondary" id="ut-save-share" type="button">공유 카드 이미지 저장</button>');
    $('ut-save-share').addEventListener('click', function () { downloadCanvas(canvas, 'utnp-plan.png'); });
  }
  function downloadCanvas(canvas, name) {
    var a = document.createElement('a'); a.download = name; a.href = canvas.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }
  function deviceId() {
    var id = localStorage.getItem('rp_utnp_device_id');
    if (!id) { id = 'rp_' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); localStorage.setItem('rp_utnp_device_id', id); }
    return id;
  }
  function payload(contact) {
    var answers = { discipline: state.discipline.id, gender: state.answers.gender, age: state.answers.age,
      race_plan: state.answers.racePlan, sweat: state.answers.sweat, hunger: state.answers.hunger,
      cramp: state.answers.cramp, stomach: state.answers.stomach, caffeine: state.answers.caffeine };
    (state.answers.forms || []).forEach(function (form) { answers[FORM_KEYS[form]] = state.event.questions[FORM_KEYS[form]][0]; });
    state.event.participatingBrands.forEach(function (brand) {
      answers[state.event.brandAnswerKeys[brand]] = state.curious.includes(brand) ? '궁금해요' : state.tried.includes(brand) ? '써 봤어요' : '처음 봐요';
    });
    var other = state.favorite === '그 밖의 브랜드' ? $('ut-other-brand').value.trim() : '';
    var note = [other ? '기타: ' + other : '', $('ut-note').value.trim()].filter(Boolean).join(' · ');
    if (note.length > 40) throw Error('그 밖의 브랜드 이름과 한 줄 글은 합쳐서 40자까지 적을 수 있습니다.');
    if (note.includes('@') || /[0-9]{7,}/.test(note.replace(/[-\s]/g, ''))) throw Error('한 줄 글에 연락처를 적지 말아 주세요.');
    return { p_slug: state.event.slug, p_device_id: deviceId(), p_answers: answers,
      p_favorite_brand: state.favorite || null, p_reasons: state.reasons, p_note: note || null,
      p_contact: contact || null, p_consent_required: contact ? $('ut-consent-required').checked : false,
      p_consent_marketing: contact ? $('ut-consent-marketing').checked : false };
  }
  function configured() {
    var c = window.RP_EVENT_CONFIG || {};
    return c.url && c.anonKey && !c.url.startsWith('__') && !c.anonKey.startsWith('__');
  }
  function rpc(body) {
    if (!configured()) return Promise.reject(Error('config'));
    var c = window.RP_EVENT_CONFIG;
    return fetch(c.url.replace(/\/$/, '') + '/rest/v1/rpc/submit_event_survey', { method: 'POST',
      headers: { apikey: c.anonKey, Authorization: 'Bearer ' + c.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw Error('rpc ' + r.status); return r.json(); })
      .then(function (v) { if (!v || !/^U-\d{4,}$/.test(v.card_no)) throw Error('card'); return v; });
  }
  function submit() {
    var status = $('ut-submit-status'), button = $('ut-submit');
    var body;
    try { body = payload(null); } catch (e) { status.textContent = e.message; return; }
    if (!configured()) { status.textContent = '설문 연결 준비 중입니다. 잠시 뒤 다시 시도해 주세요.'; return; }
    status.textContent = '답을 보내고 있습니다.'; button.disabled = true;
    rpc(body).then(function (v) {
      state.cardNo = v.card_no; localStorage.removeItem('rp_utnp_pending');
      $('ut-retry').classList.add('ut-hidden');
      status.textContent = '부스 카드를 만들었습니다.'; showBooth();
      $('ut-step-booth').scrollIntoView({ behavior: 'smooth' });
    }).catch(function () {
      if (!active()) { clearExpiredPending(); status.textContent = '부스 기간이 끝났습니다.'; return; }
      var retryBody = Object.assign({}, body, { p_note: null });
      localStorage.setItem('rp_utnp_pending', JSON.stringify({ rpc: retryBody, disciplineId: state.discipline.id,
        plan: { goalSec: state.plan.goalSec, carbH: state.plan.carbH }, answers: state.answers,
        tried: state.tried, curious: state.curious, favorite: state.favorite, reasons: state.reasons }));
      status.textContent = '잠시 뒤 다시 시도해 주세요. 답은 이 기기에 보관했습니다.'; $('ut-retry').classList.remove('ut-hidden');
    })
      .finally(function () { button.disabled = false; });
  }
  function retryPending() {
    var status = $('ut-submit-status'), saved;
    if (!active()) { clearExpiredPending(); status.textContent = '부스 기간이 끝났습니다.'; return; }
    try { saved = JSON.parse(localStorage.getItem('rp_utnp_pending') || 'null'); } catch (e) {}
    if (!saved || !saved.rpc) { status.textContent = '보관한 답이 없습니다.'; return; }
    status.textContent = '보관한 답을 보내고 있습니다.';
    rpc(Object.assign({}, saved.rpc, { p_note: null })).then(function (v) {
      state.discipline = state.event.disciplines.find(function (d) { return d.id === saved.disciplineId; });
      state.plan = saved.plan; state.answers = saved.answers; state.tried = saved.tried;
      state.curious = saved.curious; state.favorite = saved.favorite; state.reasons = saved.reasons;
      state.cardNo = v.card_no;
      localStorage.removeItem('rp_utnp_pending');
      $('ut-retry').classList.add('ut-hidden'); status.textContent = '부스 카드를 만들었습니다.';
      showBooth(); $('ut-step-booth').scrollIntoView({ behavior: 'smooth' });
    }).catch(function () { status.textContent = '잠시 뒤 다시 시도해 주세요. 답은 이 기기에 보관했습니다.'; });
  }
  function showBooth() {
    var a = state.answers, d = state.discipline, p = state.plan;
    var chips = ['땀 ' + a.sweat, '쥐 ' + a.cramp, '속 ' + a.stomach, '카페인 ' + a.caffeine];
    var box = $('ut-booth-content');
    box.innerHTML = '<div class="ut-booth" id="ut-booth-card"><div class="ut-num">UTNP · 내 부스 카드</div><div class="ut-card-no">' + safe(state.cardNo) + '</div>' +
      '<div class="ut-booth-line"><small>플랜</small>' + safe(d.name) + ' · ' + fmt(p.goalSec) + ' · 시간당 ' + p.carbH + 'g</div>' +
      '<div class="ut-booth-line"><small>몸</small><div class="ut-chipline">' + chips.map(function (c) { return '<span>' + safe(c) + '</span>'; }).join('') + '</div></div>' +
      '<div class="ut-booth-line"><small>형태</small>' + safe((a.forms || []).join(' · ')) + '</div>' +
      '<div class="ut-booth-line"><small>궁금한 브랜드</small>' + safe(state.curious.join(' · ') || '없음') + '</div>' +
      '<div class="ut-booth-line"><small>좋아하는 브랜드</small>' + safe(state.favorite || '선택 안 함') + '</div>' +
      '<p class="ut-disclaimer">' + safe(state.event.copy.disclaimer) + '</p></div>' +
      '<button class="ut-secondary" id="ut-save-booth" type="button" style="margin-top:12px">카드 이미지로 저장</button>';
    $('ut-contact-wrap').classList.remove('ut-hidden');
    $('ut-save-booth').addEventListener('click', saveBooth);
  }
  function saveBooth() {
    var c = document.createElement('canvas'); c.width = 1080; c.height = 1440;
    var x = c.getContext('2d'), a = state.answers;
    x.fillStyle = '#fff'; x.fillRect(0, 0, 1080, 1440); x.fillStyle = '#1b3c22';
    x.font = 'bold 52px sans-serif'; x.fillText('UTNP · 내 부스 카드', 75, 120);
    x.font = 'bold 130px sans-serif'; x.fillText(state.cardNo, 75, 310);
    x.font = 'bold 45px sans-serif';
    var lines = [state.discipline.name + ' · ' + fmt(state.plan.goalSec), '탄수화물 ' + state.plan.carbH + 'g/시간',
      '땀 ' + a.sweat + ' · 쥐 ' + a.cramp, '속 ' + a.stomach + ' · 카페인 ' + a.caffeine,
      '형태 ' + (a.forms || []).join(' · '), '궁금 ' + (state.curious.join(' · ') || '없음')];
    lines.forEach(function (line, i) { x.fillText(line, 75, 460 + i * 125, 940); });
    x.font = '32px sans-serif'; x.fillText(state.event.copy.disclaimer, 75, 1320, 930);
    downloadCanvas(c, 'utnp-booth-card.png');
  }
  function saveContact() {
    var contact = $('ut-contact').value.trim(), status = $('ut-contact-status');
    if (!contact) { status.textContent = '연락처를 입력하거나 이 단계는 건너뛰어 주세요.'; return; }
    if (!$('ut-consent-required').checked) { status.textContent = '연락처 수집·이용 동의를 확인해 주세요.'; return; }
    // False is an explicit marketing choice; the two checkboxes remain separate.
    var body;
    try { body = payload(contact); } catch (e) { status.textContent = e.message; return; }
    status.textContent = '연락처를 저장하고 있습니다.';
    rpc(body).then(function () { status.textContent = '연락처를 저장했습니다.'; })
      .catch(function () { status.textContent = '잠시 뒤 다시 시도해 주세요.'; });
  }
  fetch('/events/utnp.json').then(function (r) { if (!r.ok) throw Error('event'); return r.json(); })
    .then(function (event) { state.event = event; render();
      var untilEnd = Date.parse(event.endsAtKst) - Date.now();
      if (untilEnd > 0) setTimeout(clearExpiredPending, Math.min(untilEnd + 100, 2147483647));
    })
    .catch(function () { app.innerHTML = '<div class="ut-wrap"><h1>UTNP 플랜을 열 수 없습니다.</h1><p>잠시 뒤 다시 시도해 주세요.</p></div>'; });
})();
