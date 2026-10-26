/* UTNP booth nutrition-type result. The page, the report, and the smoke test share this file. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.UTNP_TYPE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var RULE_VERSION = '1';
  // Course facts match the 2026-10-22 booth draft (utnp.kr distances, 2025 finish bands).
  var COURSES = {
    '9PEAKS': { label: '9PEAKS', sub: '121.7km · D+8,349m · 제한 40시간', night: true, bands: [[21, 29], [29, 36], [36, 40]] },
    '7PEAKS': { label: '7PEAKS', sub: '95.6km · D+6,817m · 제한 31시간', night: true, est: true, bands: [[16, 23], [23, 28], [28, 31]] },
    '5PEAKS': { label: '5PEAKS', sub: '44.9km · D+3,180m · 제한 13시간', bands: [[6, 9], [9, 11.5], [11.5, 13]] },
    '2PEAKS': { label: '2PEAKS', sub: '26km · D+1,874m · 제한 8시간', bands: [[3.5, 5.5], [5.5, 7], [7, 8]] },
    '1PEAK': { label: '1PEAK', sub: '12.2km · D+1,090m · 제한 4시간', est: true, bands: [[1.5, 2.5], [2.5, 3.3], [3.3, 4]] },
    'KIDS': { label: '키즈 트레일', sub: '9.2km · 가족 동반', fixed: [2, 4] },
    'OTHER': { label: '다른 대회 / 아직 미정', sub: '예상 시간을 직접 골라요', bands: [[1, 3], [3, 6], [6, 12]] }
  };
  var GOALS = ['기록 도전', '중간쯤', '완주가 목표'];
  var OTHER_TIMES = ['3시간 이내', '3~6시간', '6시간 이상'];
  var QUESTIONS = [
    { id: 'course', title: '이번에 뛰는<br>UTNP 종목은?', hint: '다른 대회를 준비 중이면 맨 아래를 골라 주세요', opts: Object.keys(COURSES) },
    { id: 'goal', title: '이번 레이스<br>목표는?', hint: '2025년 완주 기록으로 예상 시간을 계산했어요', dynamic: true },
    { id: 'sweat', title: '달리고 나면 모자·옷에<br>하얀 소금 자국이?', opts: ['거의 없어요', '가끔', '자주', '거의 매번'] },
    { id: 'cramp', title: '최근 1년, 레이스나 장거리<br>훈련 중 쥐가 난 적은?', opts: ['없어요', '날 뻔한 적만', '1~2번', '자주(거의 매번)'] },
    { id: 'energy', title: '에너지 젤을 고를 때<br>제일 중요한 건?', hint: '하나만 골라 주세요', opts: ['후반까지 힘이 버티는 것', '속이 편한 것', '꿀·메이플 같은 원료', '잘 모르겠어요'] },
    { id: 'caf', title: '레이스 중 카페인은?', opts: ['좋아요', '후반에만', '안 먹어요'] }
  ];
  // Sheet 판가_50원정리, 27 lines. medcof and guorg stay as the draft's flavor cards.
  var PRODUCTS = {
    medgel: { n: '메달리스트 에너지젤', f: '애플·그레이프·자몽앤허니', b: '메달리스트' },
    medcof: { n: '메달리스트 에너지젤 커피앤허니', f: '카페인 50mg', b: '메달리스트', caf: true },
    vital: { n: '바이탈솔루션 에너지젤 2.0', b: '바이탈솔루션' },
    upfree: { n: '얼티밋포텐셜 러닝 에너지젤 프리', b: '얼티밋포텐셜' },
    ollabite: { n: '올라 하이드로 에너지젤 바이트', f: '그린그레이프', b: '올라' },
    olla120: { n: '올라 120 하이드로 에너지젤', f: '딸기·콜라', b: '올라' },
    amino3: { n: '올라 아미노 3000 에너지젤', f: '그린애플', b: '올라' },
    hypo: { n: '올라 하이포토닉 100', f: '타 먹는 음료', b: '올라' },
    yogel: { n: '요헤미티 에너지젤', f: '메이플 수액 베이스', b: '요헤미티' },
    yocaf: { n: '요헤미티 에너지젤 카페인 110', f: '카페인 110mg', b: '요헤미티', caf: true },
    guliq: { n: 'GU 리퀴드 에너지 레몬에이드', b: 'GU' },
    guorg: { n: 'GU 리퀴드 에너지 오렌지', f: '카페인 20mg', b: 'GU', caf: true },
    yowater: { n: '요헤미티 워터 (전해질 발포정)', f: '오리지널·청포도·레몬·피치', b: '요헤미티' },
    gutab: { n: 'GU 하이드레이션 탭', f: '오렌지·레몬라임', b: 'GU' },
    cramp: { n: '올라 크램프턴', f: '허니레몬', b: '올라' },
    medrec: { n: '메달리스트 리커버리 드링크', b: '메달리스트' },
    upbcaa: { n: '얼티밋포텐셜 번잇 BCAA', b: '얼티밋포텐셜' },
    amino5: { n: '올라 아미노 5000+', f: '그린애플·레몬', b: '올라' },
    aminoshot: { n: '아미노바이탈 아미노샷 퍼펙트 에너지젤', b: '아미노바이탈' },
    fixgel: { n: '픽스 젤 엑스 프로 에너지젤', f: '맛별', b: '픽스' },
    xtreme: { n: '익스트림 엑티브 에너지젤', b: '익스트림' },
    guchew: { n: 'GU 에너지츄', f: '젤리', b: 'GU' },
    fixfuel: { n: '픽스 퓨얼 엑스 프로 55G 엔듀어런스 퓨엘 믹스 파우더', f: '맛별', b: '픽스' },
    pocari: { n: '포카리 스웨트', b: '동아오츠카' },
    citric: { n: '아미노바이탈 구연산워터', f: '10g', b: '아미노바이탈' },
    crampfix: { n: '픽스 크램픽스 퀵샷', b: '픽스' },
    upcaf: { n: '얼티밋포텐셜 러닝 에너지젤 카페인', b: '얼티밋포텐셜', caf: true },
    aminogold: { n: '아미노바이탈 골드 리커버리 드링크 4000', b: '아미노바이탈' },
    aminopro: { n: '아미노바이탈 프로 3800', f: '4.4g', b: '아미노바이탈' }
  };
  var TYPES = {
    fuel: { name: '롱런 연료형', desc: '후반까지 에너지가 끊기지 않게 챙기는 타입. 레이스 내내 일정한 간격으로 보급하는 러너가 많아요.', gels: ['medgel', 'olla120', 'vital', 'aminoshot', 'fixgel', 'guliq'] },
    gut: { name: '편한 속형', desc: '속이 편한 형태를 먼저 고르는 타입. 묽은 젤이나 마시는 형태를 많이 찾아요.', gels: ['vital', 'guliq', 'olla120', 'hypo'] },
    natural: { name: '내추럴형', desc: '원료를 보고 고르는 타입. 꿀이나 메이플처럼 익숙한 원료가 들어간 젤을 많이 찾아요.', gels: ['medgel', 'yogel'] },
    balance: { name: '밸런스형', desc: '기본 조합으로 시작하는 타입. 맛보고 손에 맞는 젤 하나와 전해질 하나부터 정해 보세요.', gels: ['olla120', 'vital', 'upfree', 'yogel', 'xtreme'] }
  };

  function fmt(h) {
    return h % 1 === 0 ? String(h) : h.toFixed(1).replace('.0', '');
  }
  function courseOptions() {
    return Object.keys(COURSES).map(function (k) {
      return { v: k, t: COURSES[k].label, s: COURSES[k].sub };
    });
  }
  function goalOptions(courseKey) {
    if (courseKey === 'KIDS') return [];
    var c = COURSES[courseKey];
    if (courseKey === 'OTHER') return OTHER_TIMES.map(function (t, i) { return { v: String(i), t: t }; });
    return GOALS.map(function (g, i) {
      return { v: String(i), t: g, s: '약 ' + fmt(c.bands[i][0]) + '~' + fmt(c.bands[i][1]) + '시간' + (c.est ? ' (추정)' : '') };
    });
  }
  function choiceLists() {
    return {
      course: Object.keys(COURSES),
      goal: ['0', '1', '2'],
      sweat: QUESTIONS[2].opts.slice(),
      cramp: QUESTIONS[3].opts.slice(),
      energy: QUESTIONS[4].opts.slice(),
      caf: QUESTIONS[5].opts.slice(),
      result_type: Object.keys(TYPES),
      salt_tag: ['true', 'false'],
      cramp_tag: ['true', 'false'],
      rv: [RULE_VERSION]
    };
  }
  function caffeineKeys() {
    return Object.keys(PRODUCTS).filter(function (k) { return PRODUCTS[k].caf; });
  }
  function prod(k) {
    var p = PRODUCTS[k];
    return { key: k, name: p.n, form: p.f || '', brand: p.b };
  }

  function compute(answers) {
    var course = answers.course;
    var c = COURSES[course];
    if (!c) throw Error('unknown course');
    var kids = course === 'KIDS';
    var goal = kids ? '' : String(answers.goal);
    var band = c.fixed || c.bands[Number(goal)];
    if (!band) throw Error('goal');
    var hi = band[1];
    var energy = answers.energy;
    var type = energy === '후반까지 힘이 버티는 것' ? 'fuel'
      : energy === '속이 편한 것' ? 'gut'
      : energy === '꿀·메이플 같은 원료' ? 'natural'
      : (hi > 6 ? 'fuel' : 'balance');
    var spec = TYPES[type];
    var salt = answers.sweat === '자주' || answers.sweat === '거의 매번';
    var crampTag = answers.cramp === '1~2번' || answers.cramp === '자주(거의 매번)';
    var nearCramp = answers.cramp === '날 뻔한 적만';
    var wantsCaf = answers.caf === '좋아요' || answers.caf === '후반에만';
    var ref = kids ? '아이와 함께라면 물과 평소 먹던 간식부터 챙기세요. 카페인 제품은 결과에서 뺐어요'
      : hi <= 1.5 ? '짧은 레이스는 소량으로도 충분한 경우가 많아요'
      : hi <= 4 ? '이 시간대 레이스는 시간당 탄수화물 약 60g까지가 국제 가이드라인 참고치예요'
      : '긴 레이스는 시간당 탄수화물 약 90g까지가 국제 가이드라인 참고치예요. 트레일처럼 강도가 낮으면 이보다 적게 잡기도 해요';
    function allow(keys) {
      return keys.filter(function (k) {
        var p = PRODUCTS[k];
        return p && !(p.caf && (kids || !wantsCaf));
      });
    }
    var gelKeys = allow(spec.gels);
    var gelTip = type === 'gut' ? '처음 먹는 제품은 레이스 전에 훈련에서 먼저 먹어 보세요.'
      : (hi > 6 ? '긴 레이스는 맛과 형태(젤·마시는 형태)를 섞어 고르는 러너가 많아요.' : '');
    var sections = [{
      when: 'BEFORE', title: '레이스 전',
      sub: '아래 선택지 중 처음 먹는 제품은 부스 시음 테이블에서 먼저 맛보세요.',
      flush: true, products: [], tip: ''
    }, {
      when: 'DURING', title: '레이스 중 · 메인 에너지',
      sub: '이 유형 러너들이 많이 고르는 젤',
      products: gelKeys.map(prod), tip: gelTip
    }];
    if (hi > 6 && type !== 'natural') {
      sections.push({
        when: 'DURING', title: '긴 레이스라면', sub: '6시간 넘는 레이스에서 함께 많이 보는',
        products: allow(['amino3', 'hypo', 'guchew', 'fixfuel', 'ollabite'].filter(function (k) {
          return spec.gels.indexOf(k) === -1;
        })).map(prod), tip: ''
      });
    }
    if (salt || hi > 6 || type === 'balance') {
      sections.push({
        when: 'DURING', title: salt ? '솔트 케어' : '전해질',
        sub: salt ? '소금 자국이 자주 남는 러너가 많이 고르는' : (hi > 6 ? '긴 레이스에서 물과 함께 많이 고르는' : '물과 함께 많이 고르는'),
        products: allow(['yowater', 'gutab', 'pocari', 'citric']).map(prod), tip: ''
      });
    }
    if (crampTag) {
      sections.push({
        when: 'DURING', title: '크램프 케어', sub: '쥐가 잦은 러너가 많이 찾는',
        products: allow(['cramp', 'crampfix']).map(prod),
        tip: '쥐가 났던 구간과 페이스를 기억해 두면 다음 레이스 계획 때 도움이 돼요. 초반 오버페이스를 피하는 러너가 많아요.'
      });
    } else if (nearCramp) {
      sections.push({
        when: 'DURING', title: '참고', sub: '쥐가 날 뻔했다면', products: [],
        tip: '쥐가 날 뻔했던 구간과 페이스를 기억해 두세요. 필요하면 부스에서 크램프턴도 맛볼 수 있어요.'
      });
    }
    if (!kids && wantsCaf) {
      sections.push({
        when: 'DURING',
        title: c.night ? '카페인 · 밤 구간에' : (answers.caf === '후반에만' ? '카페인 · 후반에' : '카페인'),
        sub: c.night ? '오후에 출발해 밤을 지나는 코스라, 밤 구간에 많이 고르는' : '카페인을 찾는 러너가 많이 고르는',
        products: allow(['yocaf', 'medcof', 'guorg', 'upcaf']).map(prod), tip: ''
      });
    }
    sections.push({
      when: 'AFTER', title: '완주 후', sub: '레이스가 끝나고 많이 찾는',
      products: allow(['medrec', 'upbcaa', 'amino5', 'aminogold', 'aminopro']).map(prod), tip: ''
    });
    var rpcAnswers = { course: String(course) };
    if (!kids) rpcAnswers.goal = goal;
    rpcAnswers.sweat = String(answers.sweat);
    rpcAnswers.cramp = String(answers.cramp);
    rpcAnswers.energy = String(answers.energy);
    rpcAnswers.caf = String(answers.caf);
    rpcAnswers.result_type = type;
    rpcAnswers.salt_tag = salt ? 'true' : 'false';
    rpcAnswers.cramp_tag = crampTag ? 'true' : 'false';
    rpcAnswers.rv = RULE_VERSION;
    var productKeys = [];
    sections.forEach(function (section) {
      section.products.forEach(function (p) { productKeys.push(p.key); });
    });
    return {
      type: type,
      name: spec.name,
      desc: spec.desc,
      salt: salt,
      crampTag: crampTag,
      courseLabel: c.label,
      bandText: '약 ' + fmt(band[0]) + '~' + fmt(band[1]) + '시간',
      estimated: !!c.est,
      ref: ref,
      sections: sections,
      productKeys: productKeys,
      rpcAnswers: rpcAnswers
    };
  }

  return {
    RULE_VERSION: RULE_VERSION,
    COURSES: COURSES,
    QUESTIONS: QUESTIONS,
    PRODUCTS: PRODUCTS,
    TYPES: TYPES,
    courseOptions: courseOptions,
    goalOptions: goalOptions,
    choiceLists: choiceLists,
    caffeineKeys: caffeineKeys,
    compute: compute
  };
});
