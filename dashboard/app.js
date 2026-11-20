'use strict';
/* Token Radar dashboard.
 *
 * A static page: it reads the board from data.js (window.RADAR, written by
 * main.ts from the same snapshot), ranks and filters it in the browser, and
 * opens one protocol at a time for its model and its farm plan. No network,
 * no framework, no fetch: everything on this page comes from the snapshot.
 *
 * The farm plan is generated here, in the page, from the row itself: the
 * capital tier from the protocol's TVL, the hold from its age, the one action
 * from its category. The plan says what to do on-chain and what to do before
 * or after a token issues; it never predicts whether or when one issues, and
 * the board says a protocol "records no token", never "has no token".
 */

var DATA = typeof window !== 'undefined' ? window.RADAR : undefined;

/* ------------------------------------------------------------------ */
/* formatting                                                          */
/* ------------------------------------------------------------------ */

/** $2.75B, $499.1M, $323.6M, $41.7M, $812k. */
function fmtMoney(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'k';
  return '$' + String(v);
}

/** A floor that is a whole number of millions reads $50M, not $50.0M. */
function fmtFloor(v) {
  if (v >= 1e6 && v % 1e6 === 0) return '$' + v / 1e6 + 'M';
  return fmtMoney(v);
}

/** -2.19%, +5.64%; a missing reading is an em dash. */
function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

/** 543 days reads 1.5y, 56 days reads 56d; unknown age is an em dash. */
function fmtAge(days) {
  if (days === null || days === undefined) return '—';
  if (days >= 365) return (days / 365).toFixed(1) + 'y';
  return days + 'd';
}

/** A multiplier with up to 4 decimals, trailing zeroes cut: 0.989, 0.7984, 1.16. */
function fmtMult(v) {
  var s = v.toFixed(4).replace(/\.?0+$/, '');
  return s === '' || s === '-' ? '0' : s;
}

/** Escape a string for an HTML text node. */
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------ */
/* the farm plan, from the row                                         */
/* ------------------------------------------------------------------ */

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(tvl) {
  if (tvl >= 5e9) return 250;
  if (tvl >= 1e9) return 150;
  if (tvl >= 1e8) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer window. */
function holdDaysFor(age) {
  if (age === null || age === undefined) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(row, capital, chain) {
  var c = (row.category || '').toLowerCase();
  var name = row.name;
  if (c.indexOf('lend') !== -1 || c.indexOf('cdp') !== -1 || c.indexOf('collateral') !== -1) {
    return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
  }
  if (c.indexOf('dex') !== -1 || c.indexOf('yield') !== -1 || c.indexOf('leveraged farm') !== -1) {
    return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
  }
  if (c.indexOf('bridge') !== -1) {
    return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
  }
  if (c.indexOf('staking') !== -1 || c.indexOf('restak') !== -1) {
    return 'Stake $' + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
  }
  if (c.indexOf('perpetual') !== -1 || c.indexOf('derivative') !== -1) {
    return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
  }
  if (c.indexOf('prediction') !== -1) {
    return 'Fund $' + capital + ' and place one market position on ' + name + '.';
  }
  if (c.indexOf('curator') !== -1 || c.indexOf('allocator') !== -1) {
    return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
  }
  if (c.indexOf('stable') !== -1) {
    return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
  }
  if (c.indexOf('rwa') !== -1) {
    return 'Mint $' + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
  }
  if (c.indexOf('insurance') !== -1) {
    return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
  }
  return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
}

/** Seven steps, each an action with a cost and a time. */
function farmPlan(row) {
  var chain = row.chains.length > 0 ? row.chains[0] : 'its main chain';
  var capital = capitalFor(row.tvl_usd);
  var hold = holdDaysFor(row.age_days);
  var gas = capital >= 150 ? 8 : 4;
  return [
    {
      text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.',
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: actionFor(row, capital, chain),
      cost: '$' + capital + ' of capital and about $' + gas + ' of gas',
      time: '15 minutes to set up',
    },
    {
      text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.',
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.',
      cost: 'the $' + capital + ' stays in the position',
      time: hold + ' days',
    },
    {
      text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.",
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: 'If the protocol issues a token, check eligibility on its own page, claim only from its published link, and never pay a fee to claim.',
      cost: 'no fee to check eligibility',
      time: '15 minutes',
    },
    {
      text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.',
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/* ------------------------------------------------------------------ */
/* state                                                               */
/* ------------------------------------------------------------------ */

var MIN_TVL_CHOICES = [0, 10000000, 50000000, 100000000, 500000000];

var state = {
  q: '',
  category: '',
  chain: '',
  minTvl: 0,
  status: 'pre', // 'pre' for pre-token rows, 'live' for the live-token set
  sortKey: 'rank', // 'rank' or 'implied'
  sortDir: 1, // 1 is the natural order (rank up, implied value down), -1 reverses it
  openSlug: null,
};

/** The live set, in market-cap order, each row keeping its place in that order. */
var liveRanked = [];
if (DATA) {
  liveRanked = DATA.live
    .slice()
    .sort(function (a, b) { return (b.mcap_usd || 0) - (a.mcap_usd || 0); })
    .map(function (row, i) {
      var copy = {};
      for (var k in row) copy[k] = row[k];
      copy.liveRank = i + 1;
      return copy;
    });
}

function findRow(slug) {
  if (!DATA) return null;
  for (var i = 0; i < DATA.rows.length; i++) {
    if (DATA.rows[i].slug === slug) return { kind: 'pre', row: DATA.rows[i] };
  }
  for (var j = 0; j < liveRanked.length; j++) {
    if (liveRanked[j].slug === slug) return { kind: 'live', row: liveRanked[j] };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* filtering and sorting                                               */
/* ------------------------------------------------------------------ */

function matches(row, q) {
  if (state.category && row.category !== state.category) return false;
  if (state.chain && row.chains.indexOf(state.chain) === -1) return false;
  if (row.tvl_usd < state.minTvl) return false;
  if (q) {
    var hay = [row.name, row.category || ''].concat(row.chains).join(' ').toLowerCase();
    if (hay.indexOf(q) === -1) return false;
  }
  return true;
}

function visibleRows() {
  var q = state.q.trim().toLowerCase();
  var pool = state.status === 'live' ? liveRanked : DATA.rows;
  var rows = pool.filter(function (row) { return matches(row, q); });
  if (state.status === 'pre') {
    if (state.sortKey === 'rank') {
      rows.sort(function (a, b) { return state.sortDir * (a.rank - b.rank); });
    } else {
      rows.sort(function (a, b) { return state.sortDir * (b.implied_value_usd - a.implied_value_usd); });
    }
  } else {
    rows.sort(function (a, b) { return (b.mcap_usd || 0) - (a.mcap_usd || 0); });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* rendering: header, hero, filters                                    */
/* ------------------------------------------------------------------ */

function $(id) { return document.getElementById(id); }

function renderHeader() {
  var source = DATA.source || '';
  var label = source.indexOf('DefiLlama') === 0 ? 'DefiLlama protocol index' : source;
  $('meta').innerHTML =
    '<span>Snapshot ' + esc(DATA.as_of) + '</span>' +
    '<span>' + esc(label) + '</span>' +
    '<span>' + esc(DATA.model_version) + ' model</span>';
  document.title = 'Token Radar — ' + DATA.watchlist_size + ' watchlist protocols, ranked by implied value';
}

function renderHero() {
  $('headline').textContent = DATA.watchlist_size + ' watchlist protocols, ranked by implied value';
  $('lede').textContent =
    'The watchlist is the floor: every protocol with at least ' + fmtFloor(DATA.floor_usd) +
    ' of TVL and no token on record. The early radar adds ' + DATA.early_size +
    ' pre-token protocols below that floor. Implied value is a model, not a promise.';
  var stats = [
    ['Watchlist covered', DATA.watchlist_size + ' / ' + DATA.watchlist_size],
    ['Pre-token rows scored', String(DATA.board_size)],
    ['Early rows below the floor', String(DATA.early_size)],
    ['Live-token protocols set aside', String(DATA.live_size)],
  ];
  $('stats').innerHTML = stats
    .map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; })
    .join('');
}

function fillSelect(id, values, allLabel) {
  var el = $(id);
  var html = '<option value="">' + esc(allLabel) + '</option>';
  values.forEach(function (v) {
    html += '<option value="' + esc(v) + '">' + esc(v) + '</option>';
  });
  el.innerHTML = html;
}

function renderFilterOptions() {
  var cats = {};
  var chains = {};
  DATA.rows.concat(DATA.live).forEach(function (row) {
    if (row.category) cats[row.category] = true;
    row.chains.forEach(function (c) { chains[c] = true; });
  });
  fillSelect('category', Object.keys(cats).sort(), 'All categories');
  fillSelect('chain', Object.keys(chains).sort(), 'All chains');
}

function syncControls() {
  $('q').value = state.q;
  $('category').value = state.category;
  $('chain').value = state.chain;
  $('minTvl').value = String(state.minTvl);
  $('statusPre').setAttribute('aria-pressed', state.status === 'pre' ? 'true' : 'false');
  $('statusLive').setAttribute('aria-pressed', state.status === 'live' ? 'true' : 'false');
}

/* ------------------------------------------------------------------ */
/* rendering: the board                                                */
/* ------------------------------------------------------------------ */

function arrowFor(key, naturalDir) {
  if (state.sortKey !== key) return '<span class="arrow">&#8744;</span>';
  return state.sortDir === naturalDir
    ? '<span class="arrow">&#8744;</span>'
    : '<span class="arrow">&#8743;</span>';
}

function renderHead() {
  if (state.status === 'live') {
    $('boardHead').innerHTML =
      '<tr><th>Rank</th><th>Protocol</th><th class="num">TVL</th><th class="num">7d</th>' +
      '<th class="num">Market cap</th><th>Token</th></tr>';
    return;
  }
  $('boardHead').innerHTML =
    '<tr>' +
    '<th class="sortable' + (state.sortKey === 'rank' ? ' active' : '') + '" data-sort="rank">Rank' + arrowFor('rank', 1) + '</th>' +
    '<th>Protocol</th>' +
    '<th class="num">TVL</th>' +
    '<th class="num">7d</th>' +
    '<th class="num">Age</th>' +
    '<th class="num sortable' + (state.sortKey === 'implied' ? ' active' : '') + '" data-sort="implied">Implied value' + arrowFor('implied', 1) + '</th>' +
    '<th>Token</th>' +
    '</tr>';
}

function subline(row, allChains) {
  var chains = allChains ? row.chains : row.chains.slice(0, 2);
  var where = chains.length > 0 ? ' on ' + chains.join(', ') : '';
  if (row.category) return row.category + where;
  return where ? where.slice(4) : '';
}

function changeCell(v) {
  if (v === null || v === undefined) return '<td class="num change flat">—</td>';
  var cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  return '<td class="num change ' + cls + '">' + esc(fmtPct(v)) + '</td>';
}

function barCell(value, max) {
  var pct = max > 0 ? Math.max(0.4, (value / max) * 100) : 0;
  return (
    '<td class="num"><span class="value-cell">' +
    '<span class="bar"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
    '<span class="value">' + esc(fmtMoney(value)) + '</span>' +
    '</span></td>'
  );
}

function renderBoard() {
  var rows = visibleRows();
  var max = 0;
  rows.forEach(function (r) {
    var v = state.status === 'live' ? r.mcap_usd || 0 : r.implied_value_usd;
    if (v > max) max = v;
  });
  var html = '';
  rows.forEach(function (row) {
    var rank = state.status === 'live' ? row.liveRank : row.rank;
    var selected = state.openSlug === row.slug ? ' class="selected"' : '';
    html += '<tr data-slug="' + esc(row.slug) + '"' + selected + '>';
    html += '<td class="rank">' + rank + '</td>';
    html += '<td><div class="proto-name">' + esc(row.name) + '</div>' +
      '<div class="proto-sub">' + esc(subline(row, false)) + '</div></td>';
    html += '<td class="num tvl">' + esc(fmtMoney(row.tvl_usd)) + '</td>';
    html += changeCell(row.change_7d);
    if (state.status === 'live') {
      html += barCell(row.mcap_usd || 0, max);
      html += '<td class="token"><span class="dot"></span>live</td>';
    } else {
      html += '<td class="num age">' + esc(fmtAge(row.age_days)) + '</td>';
      html += barCell(row.implied_value_usd, max);
      html += '<td class="token"><span class="dot"></span>no token</td>';
    }
    html += '</tr>';
  });
  if (rows.length === 0) {
    var cols = state.status === 'live' ? 6 : 7;
    html = '<tr class="empty"><td colspan="' + cols + '">No protocols match these filters.</td></tr>';
  }
  $('boardBody').innerHTML = html;
  $('count').textContent = rows.length + (rows.length === 1 ? ' row shown' : ' rows shown');
  $('caption').textContent =
    state.status === 'live'
      ? 'Live-token protocols, by market cap. Select a row for its market value.'
      : 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.';
  renderHead();
}

/* ------------------------------------------------------------------ */
/* rendering: the detail dialog                                        */
/* ------------------------------------------------------------------ */

/** The board's own value, recomputed in the page from the row: TVL x comparable
 *  multiple x 0.6 x growth x maturity x chain. The comparable multiple and the
 *  chain multiplier were rounded to 4 decimals before scoring, so the row
 *  carries them as scored; growth and maturity are recomputed exactly from
 *  the row's own 7-day change and age, with the model constants data.js
 *  carries. The result is the board's integer, not an approximation of it. */
function recompute(row) {
  var m = DATA.model;
  var rawGrowth = typeof row.change_7d === 'number' && Number.isFinite(row.change_7d) ? row.change_7d : 0;
  var growthPct = Math.min(m.growth_cap, Math.max(m.growth_floor, rawGrowth));
  var growthMult = 1 + (growthPct / 100) * m.growth_weight;
  var age = row.age_days === null || row.age_days === undefined ? m.unknown_age_days : row.age_days;
  var maturityMult = m.maturity_floor + (Math.min(Math.max(age, 0), m.maturity_days) / m.maturity_days) * m.maturity_range;
  return Math.max(
    1,
    Math.round(
      row.tvl_usd *
        row.comp_multiple *
        m.not_yet_issued *
        growthMult *
        maturityMult *
        row.chain_multiplier,
    ),
  );
}

function fact(label, value, total) {
  return '<div' + (total ? ' class="total"' : '') + '><dt>' + esc(label) + '</dt><dd>' + value + '</dd></div>';
}

function renderDetail() {
  var dialog = $('dialog');
  if (!state.openSlug) {
    dialog.hidden = true;
    dialog.innerHTML = '';
    return;
  }
  var found = findRow(state.openSlug);
  if (!found) {
    dialog.hidden = true;
    dialog.innerHTML = '';
    return;
  }
  var row = found.row;
  var html = '';
  html += '<div class="dialog-head"><span class="dialog-rank">' +
    (found.kind === 'live'
      ? 'Live token, market-cap rank ' + row.liveRank + ' of ' + liveRanked.length
      : 'Rank ' + row.rank + ' of ' + DATA.board_size) +
    '</span><button type="button" class="dialog-close" id="closeDialog">Close</button></div>';
  html += '<h2>' + esc(row.name) + '</h2>';
  html += '<p class="dialog-sub">' + esc(subline(row, true)) + '</p>';

  if (found.kind === 'live') {
    var ratio = row.tvl_usd > 0 && row.mcap_usd ? row.mcap_usd / row.tvl_usd : null;
    html += '<h3>Market value</h3><dl class="facts">';
    html += fact('TVL', esc(fmtMoney(row.tvl_usd)));
    html += fact('Seven-day growth', esc(fmtPct(row.change_7d)));
    html += fact('Market cap / TVL', ratio === null ? '—' : esc(ratio.toFixed(2) + ' x'));
    html += fact('Market cap', esc(fmtMoney(row.mcap_usd || 0)), true);
    html += '</dl>';
    html += '<p class="note">This protocol already trades. The board shows the market\u2019s own value, ' +
      'not an implied value, and the radar scores only protocols that record no token.</p>';
  } else {
    var recomputed = recompute(row);
    var same = recomputed === row.implied_value_usd;
    var compLabel = row.category
      ? 'Comparable multiple (' + row.category + ')'
      : 'Comparable multiple (global median)';
    html += '<h3>Implied value</h3><dl class="facts">';
    html += fact('TVL', esc(fmtMoney(row.tvl_usd)));
    html += fact('Seven-day growth', esc(fmtPct(row.change_7d)));
    html += fact('Age with no token', esc(fmtAge(row.age_days)));
    html += fact(compLabel, esc(fmtMult(row.comp_multiple) + ' x (' + row.comp_count + ' comp' + (row.comp_count === 1 ? '' : 's') + ')'));
    html += fact('Not-yet-issued discount', esc(fmtMult(DATA.model.not_yet_issued) + ' x'));
    html += fact('Growth multiplier', esc(fmtMult(row.growth_multiplier)));
    html += fact('Maturity multiplier', esc(fmtMult(row.maturity_multiplier)));
    html += fact('Chain multiplier', esc(fmtMult(row.chain_multiplier)));
    html += fact('Implied value', esc(fmtMoney(row.implied_value_usd)), true);
    html += '</dl>';
    html += '<p class="note">Model ' + esc(DATA.model_version) + ': the same function scores every protocol. ' +
      'The page recomputes this row as ' + esc(fmtMoney(recomputed)) +
      (same
        ? ', the same number board.json carries. '
        : '; board.json carries ' + esc(fmtMoney(row.implied_value_usd)) + '. ') +
      'This is an estimate, not a price.</p>';
    html += '<h3>Farm plan</h3><ol class="plan">';
    farmPlan(row).forEach(function (step, i) {
      html += '<li><span class="n">' + (i + 1) + '.</span>' +
        '<span class="t">' + esc(step.text) + '</span>' +
        '<span class="c">Cost: ' + esc(step.cost) + '. Time: ' + esc(step.time) + '.</span></li>';
    });
    html += '</ol>';
  }

  dialog.innerHTML = html;
  dialog.hidden = false;
  $('closeDialog').addEventListener('click', function () {
    state.openSlug = null;
    syncHash();
    renderDetail();
    renderBoard();
  });
}

/* ------------------------------------------------------------------ */
/* hash params: views are linkable                                     */
/* ------------------------------------------------------------------ */

function readHash() {
  var params = new URLSearchParams(window.location.hash.slice(1));
  var p = params.get('p');
  state.openSlug = p && findRow(p) ? p : null;
  var cat = params.get('category') || '';
  state.category = cat;
  var chain = params.get('chain') || '';
  state.chain = chain;
  var min = parseInt(params.get('minTvl') || '0', 10);
  state.minTvl = MIN_TVL_CHOICES.indexOf(min) !== -1 ? min : 0;
  state.q = params.get('q') || '';
  var status = params.get('status') || 'pre';
  state.status = status === 'live' ? 'live' : 'pre';
}

function syncHash() {
  var params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.chain) params.set('chain', state.chain);
  if (state.minTvl) params.set('minTvl', String(state.minTvl));
  if (state.status === 'live') params.set('status', 'live');
  if (state.openSlug) params.set('p', state.openSlug);
  var hash = params.toString();
  var url = window.location.pathname + window.location.search + (hash ? '#' + hash : '');
  window.history.replaceState(null, '', url);
}

/* ------------------------------------------------------------------ */
/* wiring                                                              */
/* ------------------------------------------------------------------ */

function renderAll() {
  syncControls();
  renderBoard();
  renderDetail();
}

function init() {
  if (!DATA) {
    $('boardBody').innerHTML =
      '<tr class="empty"><td colspan="7">data.js did not load: the board needs its dataset.</td></tr>';
    return;
  }
  renderHeader();
  renderHero();
  renderFilterOptions();
  readHash();
  renderAll();

  $('q').addEventListener('input', function (e) {
    state.q = e.target.value;
    syncHash();
    renderBoard();
  });
  $('category').addEventListener('change', function (e) {
    state.category = e.target.value;
    syncHash();
    renderBoard();
  });
  $('chain').addEventListener('change', function (e) {
    state.chain = e.target.value;
    syncHash();
    renderBoard();
  });
  $('minTvl').addEventListener('change', function (e) {
    state.minTvl = parseInt(e.target.value, 10) || 0;
    syncHash();
    renderBoard();
  });
  $('statusPre').addEventListener('click', function () {
    if (state.status === 'pre') return;
    state.status = 'pre';
    syncHash();
    renderAll();
  });
  $('statusLive').addEventListener('click', function () {
    if (state.status === 'live') return;
    state.status = 'live';
    syncHash();
    renderAll();
  });
  $('boardHead').addEventListener('click', function (e) {
    var th = e.target.closest('th[data-sort]');
    if (!th) return;
    var key = th.getAttribute('data-sort');
    if (state.sortKey === key) {
      state.sortDir = -state.sortDir;
    } else {
      state.sortKey = key;
      state.sortDir = 1;
    }
    renderBoard();
  });
  $('boardBody').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (!tr) return;
    state.openSlug = tr.getAttribute('data-slug');
    syncHash();
    renderDetail();
    renderBoard();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.openSlug) {
      state.openSlug = null;
      syncHash();
      renderDetail();
      renderBoard();
    }
  });
  window.addEventListener('hashchange', function () {
    readHash();
    renderAll();
  });
}

init();
