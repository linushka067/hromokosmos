/* ХРОНОКОСМОС — учебный проект. Никаких внешних JS-библиотек. */
'use strict';
const $ = id => document.getElementById(id);
const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const link = (url, label) => `<a target="_blank" rel="noopener noreferrer" href="${safe(url)}">${safe(label)} ↗</a>`;
const dateParts = d => [d.getFullYear(), d.getMonth() + 1, d.getDate()];
const dateUTC = (y, m, d) => new Date(Date.UTC(y, m - 1, d, 12));
const facts = []; let current = null, angle = 0, zoom = 1, spin = true, drag = 0, planetDots = [], lastWorld = [];
function message(id, txt) { $(id).innerHTML = `<p class="muted">${safe(txt)}</p>` }
function show(id, arr, make) { $(id).innerHTML = arr.length ? `<ul class="result-list">${arr.map(make).join('')}</ul>` : '<p class="muted">Точных записей в открытом архиве не найдено.</p>' }
function timeoutFetch(url, ms = 9000) { const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms); return fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } }).then(r => { if (!r.ok) throw Error('HTTP ' + r.status); return r.json() }).finally(() => clearTimeout(t)) }
function dateValid(value) { const d = new Date(value + 'T12:00:00'); return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === value && d <= new Date() && d.getFullYear() >= 1900 ? d : null }
function moon(d) { const days = (Date.UTC(...[d.getFullYear(), d.getMonth(), d.getDate()]) - Date.UTC(2000, 0, 6, 18, 14)) / (864e5); const age = ((days % 29.530588853) + 29.530588853) % 29.530588853; const f = age / 29.530588853; const labels = ['Новолуние', 'Растущая Луна', 'Первая четверть', 'Растущая Луна', 'Полнолуние', 'Убывающая Луна', 'Последняя четверть', 'Убывающая Луна']; const n = Math.floor((f * 8 + .5)) % 8; return { age, name: labels[n], icon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][n], ill: Math.round((1 - Math.cos(2 * Math.PI * f)) * 50) } }
const d2r = Math.PI / 180;
function stars(dt, lat, lon) {
    const c = $('skyCanvas'), g = c.getContext('2d'), w = c.width, h = c.height; g.clearRect(0, 0, w, h); const grd = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); grd.addColorStop(0, '#1e3564'); grd.addColorStop(1, '#070e24'); g.fillStyle = grd; g.fillRect(0, 0, w, h); g.strokeStyle = '#3b5b87'; for (let r = 55; r < 180; r += 55) { g.beginPath(); g.arc(w / 2, h / 2, r, 0, 7); g.stroke() } g.beginPath(); g.moveTo(w / 2, 20); g.lineTo(w / 2, h - 20); g.moveTo(20, h / 2); g.lineTo(w - 20, h / 2); g.stroke();
    const catalog = [[101.3, -16.7, 'Сириус'], [95.9, 7.4, 'Бетельгейзе'], [88.8, 7.4, 'Процион'], [279.2, 38.8, 'Вега'], [310.4, 45.3, 'Денеб'], [297.7, 8.9, 'Альтаир'], [213.9, 19.2, 'Арктур'], [79.2, 46, 'Капелла'], [68.9, 16.5, 'Альдебаран'], [201.3, -11.2, 'Спика'], [247.4, -26.4, 'Антарес'], [344.4, -29.6, 'Фомальгаут'], [37.9, 89.3, 'Полярная'], [186.6, -63.1, 'Акрукс'], [83.8, -5.4, 'Ригель']];
    const jd = dt.getTime() / 864e5 + 2440587.5, T = (jd - 2451545) / 36525; const gst = (280.46061837 + 360.98564736629 * (jd - 2451545) + .000387933 * T * T) % 360; const lst = (gst + lon + 720) % 360;
    let shown = 0; for (const [ra, dec, name] of catalog) { const ha = (lst - ra) * d2r, phi = lat * d2r, del = dec * d2r; const alt = Math.asin(Math.sin(del) * Math.sin(phi) + Math.cos(del) * Math.cos(phi) * Math.cos(ha)); if (alt <= 0) continue; const az = Math.atan2(-Math.sin(ha) * Math.cos(del), Math.sin(del) * Math.cos(phi) - Math.cos(del) * Math.sin(phi) * Math.cos(ha)); const radius = (Math.PI / 2 - alt) / (Math.PI / 2) * 175, x = w / 2 + radius * Math.sin(az), y = h / 2 - radius * Math.cos(az); g.fillStyle = '#eff9ff'; g.shadowBlur = 10; g.shadowColor = '#b8eaff'; g.beginPath(); g.arc(x, y, 2.5, 0, 7); g.fill(); g.shadowBlur = 0; g.font = '12px Arial'; g.fillText(name, x + 7, y - 6); shown++ } if (!shown) { g.fillStyle = '#fff'; g.font = '16px Arial'; g.fillText('Яркие звёзды каталога сейчас под горизонтом', 24, h / 2) }
}
const planets = [['Меркурий', .387, 87.97, '#adb5bc'], ['Венера', .723, 224.7, '#e6c6a0'], ['Земля', 1, 365.256, '#6bb8f9'], ['Марс', 1.524, 686.98, '#f78b68'], ['Юпитер', 5.203, 4332.6, '#d7a775'], ['Сатурн', 9.58, 10759, '#e9d08d'], ['Уран', 19.2, 30687, '#91dfed'], ['Нептун', 30.1, 60190, '#6397ef']];
function drawSolar() { const c = $('solarCanvas'), g = c.getContext('2d'), w = c.width, h = c.height; g.clearRect(0, 0, w, h); g.fillStyle = '#080f2b'; g.fillRect(0, 0, w, h); const cx = w / 2 + drag, cy = h / 2; g.fillStyle = '#ffd36d'; g.shadowColor = '#ffe09b'; g.shadowBlur = 25; g.beginPath(); g.arc(cx, cy, 16, 0, 7); g.fill(); g.shadowBlur = 0; planetDots = []; const t = current ? ((current.date.getTime() - Date.UTC(2000, 0, 1)) / 864e5) : 0; planets.forEach(([n, au, period, color], i) => { const rad = (48 + i * 25) * zoom; g.strokeStyle = 'rgba(167,200,255,.22)'; g.beginPath(); g.ellipse(cx, cy, rad, rad * .48, 0, 0, 2 * Math.PI); g.stroke(); const a = 2 * Math.PI * t / period + i * .8 + angle, x = cx + rad * Math.cos(a), y = cy + rad * .48 * Math.sin(a); g.fillStyle = color; g.beginPath(); g.arc(x, y, i > 3 ? 7 : 5, 0, 2 * Math.PI); g.fill(); g.fillStyle = '#dfedff'; g.font = '13px Arial'; g.fillText(n, x + 10, y - 9); planetDots.push({ x, y, n, au }) }); }
function runMotion() { if (spin) { angle += .0018; drawSolar() } requestAnimationFrame(runMotion) }
$('solarZoom').addEventListener('input', e => { zoom = +e.target.value / 100; drawSolar() }); $('motionToggle').addEventListener('click', () => { spin = !spin; $('motionToggle').textContent = spin ? '⏸ Остановить движение' : '▶ Включить движение'; $('motionToggle').setAttribute('aria-pressed', String(spin)) }); $('solarCanvas').addEventListener('click', e => { const r = e.target.getBoundingClientRect(), x = (e.clientX - r.left) * e.target.width / r.width, y = (e.clientY - r.top) * e.target.height / r.height; const p = planetDots.find(p => Math.hypot(p.x - x, p.y - y) < 25); if (p) $('planetDescription').textContent = `${p.n}: среднее расстояние от Солнца около ${p.au} а.е. Схема иллюстративная, орбиты упрощены.` }); let pointerX = null; $('solarCanvas').addEventListener('pointerdown', e => { pointerX = e.clientX; e.target.setPointerCapture(e.pointerId) }); $('solarCanvas').addEventListener('pointermove', e => { if (pointerX === null) return; drag += (e.clientX - pointerX) * 1.6; pointerX = e.clientX; drawSolar() }); $('solarCanvas').addEventListener('pointerup', () => { pointerX = null }); runMotion();
async function geocode(city) { const u = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=ru&format=json'; const j = await timeoutFetch(u); if (!j.results?.length) throw Error('Город не найден'); return j.results[0] }
async function weather(d, city) { try { const loc = await geocode(city); current.loc = loc; const ymd = current.iso; if (d.getFullYear() < 1940) { message('weatherContent', 'Архив погоды не покрывает годы до 1940.'); return } const q = new URLSearchParams({ latitude: loc.latitude, longitude: loc.longitude, start_date: ymd, end_date: ymd, daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', timezone: 'auto' }); const j = await timeoutFetch('https://archive-api.open-meteo.com/v1/archive?' + q); const a = j.daily; if (!a?.temperature_2m_max?.length) throw Error('Нет данных'); $('weatherContent').innerHTML = `<p>📍 ${safe(loc.name)}, ${safe(loc.country || '')}</p><p><strong>${a.temperature_2m_min[0]}…${a.temperature_2m_max[0]} °C</strong></p><p>Осадки: ${a.precipitation_sum[0]} мм</p><small>Историческая модель погоды, не измерение в конкретном доме.</small>`; $('weatherSource').innerHTML = link('https://open-meteo.com/en/docs/historical-weather-api', 'Open-Meteo') } catch (e) { message('weatherContent', 'Погоду не удалось получить: ' + e.message); $('weatherSource').innerHTML = link('https://open-meteo.com/en/docs/historical-weather-api', 'Открыть источник') } finally { stars(new Date(current.iso + 'T' + current.time + ':00Z'), current.loc?.latitude ?? 55.75, current.loc?.longitude ?? 37.62) } }
const entryText = x => (x.text || x.title || '').replace(/\s+/g, ' ').trim();
async function history() {
    const mm = String(current.date.getMonth() + 1).padStart(2, '0'), dd = String(current.date.getDate()).padStart(2, '0'); const base = `https://api.wikimedia.org/feed/v1/wikipedia/ru/onthisday/`; let j; try { j = await timeoutFetch(base + 'all/' + mm + '/' + dd) } catch (e) { try { j = await timeoutFetch(`https://ru.wikipedia.org/api/rest_v1/feed/onthisday/all/${mm}/${dd}`) } catch (err) { for (const id of ['russiaContent', 'worldContent', 'peopleContent']) message(id, 'Архив недоступен. Проверь интернет или перейди к источнику.'); $('russiaSource').innerHTML = link('https://ru.wikipedia.org/wiki/' + encodeURIComponent(`${current.date.getDate()}_${current.date.toLocaleDateString('ru-RU', { month: 'long' })}`), 'Википедия'); $('worldSource').innerHTML = link('https://ru.wikipedia.org/wiki/Портал:История', 'Архив'); return } }
    const events = (j.events || j.selected || []).filter(x => x.text); const exact = events.filter(x => x.year === current.date.getFullYear()); const pool = exact.length ? exact : events; const ruPattern = /росси|ссср|советск|москв|петербург|ленинград|российск|русск|киевск(ая|ий)|рсфср|сибир|кремл/i; const ru = pool.filter(x => ruPattern.test(entryText(x) + ' ' + (x.pages || []).map(y => y.title).join(' '))); const world = pool.filter(x => !ru.includes(x)); const label = exact.length ? 'События точно за выбранную дату' : 'События этого числа за разные годы (не обязательно год рождения)'; const item = x => `<li><strong>${safe(x.year || '')}</strong> — ${safe(entryText(x))}</li>`; show('russiaContent', ru.slice(0, 5), item); show('worldContent', world.slice(0, 6), item); lastWorld = pool; $('russiaSource').innerHTML = safe(label) + ' · ' + link('https://ru.wikipedia.org/wiki/Портал:История', 'Википедия'); $('worldSource').innerHTML = safe(label) + ' · ' + link('https://ru.wikipedia.org/wiki/Портал:История', 'Википедия'); const born = (j.births || []).slice(0, 6); show('peopleContent', born, x => `<li><strong>${safe(x.year)}</strong> — ${safe(entryText(x))}</li>`); $('peopleSource').innerHTML = link('https://ru.wikipedia.org/wiki/Категория:Родившиеся_по_датам', 'Википедия'); newspaper()
}
async function music() { const y = current.date.getFullYear(), iso = current.iso; const q = `date:${iso} AND type:single`; const base = 'https://musicbrainz.org/ws/2/release-group/?fmt=json&limit=8&query='; try { let j = await timeoutFetch(base + encodeURIComponent(q), 11000); let groups = j['release-groups'] || [], heading = 'Синглы с датой релиза ' + iso; if (!groups.length) { j = await timeoutFetch(base + encodeURIComponent(`date:${y} AND type:single`), 11000); groups = j['release-groups'] || []; heading = 'Синглы года ' + y + ' (не обязательно дня рождения)' } if (!groups.length) { message('musicContent', 'Подтверждённых музыкальных релизов не найдено.'); return } $('musicContent').innerHTML = `<p class="muted">${safe(heading)}</p><ul class="result-list">${groups.slice(0, 6).map(x => `<li>${safe(x.title)} — ${safe(x['artist-credit']?.[0]?.name || 'исполнитель не указан')}</li>`).join('')}</ul>` } catch (e) { message('musicContent', 'Музыкальная база сейчас недоступна. Это не означает, что песен в тот год не было.') } finally { $('musicSource').innerHTML = link('https://musicbrainz.org/search?query=' + encodeURIComponent(current.iso) + '&type=release_group&method=advanced', 'MusicBrainz — поиск релизов') } }
async function cinema() { const y = current.date.getFullYear(); const url = 'https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: `film ${y}`, gsrnamespace: '0', gsrlimit: '5', prop: 'info', inprop: 'url', format: 'json', origin: '*' }); try { const j = await timeoutFetch(url); const pages = Object.values(j.query?.pages || {}).filter(x => x.title); show('cinemaContent', pages, x => `<li>${link(x.fullurl || 'https://www.wikidata.org/wiki/' + encodeURIComponent(x.title), x.title)}</li>`); if (pages.length) $('cinemaContent').insertAdjacentHTML('afterbegin', '<p class="muted">Найденные страницы по поисковому запросу — это не подтверждённый список премьер года.</p>') } catch (e) { message('cinemaContent', 'База фильмов временно недоступна.') } finally { $('cinemaSource').innerHTML = link('https://www.wikidata.org/w/index.php?search=' + encodeURIComponent('film ' + y), 'Поиск Wikidata') } }
const inventions = [['1947', 'Создан транзистор'], ['1957', 'Запущен первый искусственный спутник Земли'], ['1969', 'Люди впервые высадились на Луне'], ['1971', 'Представлен первый коммерческий микропроцессор Intel 4004'], ['1983', 'TCP/IP стал основой сети ARPANET'], ['1989', 'Тим Бернерс-Ли предложил Всемирную паутину'], ['1991', 'Всемирная паутина стала общедоступной'], ['2007', 'Представлен первый iPhone'], ['2012', 'Объявлено об открытии бозона Хиггса'], ['2022', 'Опубликованы первые научные снимки телескопа Джеймса Уэбба']];
function techTimeline() { const y = current.date.getFullYear(), t = inventions.filter(x => Math.abs(+x[0] - y) <= 8); show('techContent', t, x => `<li><strong>${x[0]}</strong> — ${safe(x[1])}</li>`); if (!t.length) message('techContent', 'Для этого периода в небольшой учебной подборке пока нет записи.'); const events = inventions.filter(x => +x[0] >= y && +x[0] <= new Date().getFullYear()); show('timelineContent', events.slice(0, 9), x => `<li><strong>${x[0]}</strong> — ${safe(x[1])}</li>`) }
function newspaper() { if (!current) return; const e = lastWorld.slice(0, 3); $('newspaperContent').innerHTML = `<p class="newspaper-title">КОСМИЧЕСКИЕ ВЕСТИ</p><p>Специальный выпуск · ${safe(fmt.format(current.date))}</p><h4>В этот день появился новый герой истории</h4><p>Место рождения: ${safe(current.city)}. Фаза Луны: ${safe(moon(current.date).name)}.</p>${e.length ? `<ul>${e.map(x => `<li>${safe(x.year)} — ${safe(entryText(x))}</li>`).join('')}</ul>` : '<p>Архив исторических событий пока не ответил.</p>'}<small>Сведения из энциклопедического архива. Годы событий могут отличаться от года рождения.</small>` }
function printSheet(kind) { if (!current) return; const paper = $('printSheet'); const headline = kind === 'news' ? 'Газета дня рождения' : 'Паспорт времени'; paper.innerHTML = `<div class="print-card"><h1>✺ ХРОНОКОСМОС</h1><h2>${headline}</h2><h3>${safe(fmt.format(current.date))}</h3><p>Город: ${safe(current.city)}</p><p>День недели: ${safe(weekday.format(current.date))}</p><p>Луна: ${safe(moon(current.date).name)}</p>${kind === 'news' ? $('newspaperContent').innerHTML : ''}<p>У каждого дня есть своя Вселенная.</p></div>`; document.body.classList.add('print-mode'); window.print(); setTimeout(() => document.body.classList.remove('print-mode'), 800) }
$('printNews').addEventListener('click', () => printSheet('news')); $('savePdf').addEventListener('click', () => printSheet('passport'));
$('savePng').addEventListener('click', () => { if (!current) return; const c = document.createElement('canvas'); c.width = 1000; c.height = 600; const g = c.getContext('2d'), p = g.createLinearGradient(0, 0, 1000, 600); p.addColorStop(0, '#121c42'); p.addColorStop(1, '#553b85'); g.fillStyle = p; g.fillRect(0, 0, 1000, 600); g.fillStyle = '#e5c37d'; g.font = 'bold 45px Arial'; g.fillText('✺ ХРОНОКОСМОС', 70, 110); g.fillStyle = 'white'; g.font = 'bold 50px Arial'; g.fillText(fmt.format(current.date), 70, 285); g.font = '30px Arial'; g.fillText('Город: ' + current.city, 70, 360); g.fillText('Луна: ' + moon(current.date).name, 70, 410); g.font = '26px Arial'; g.fillText('У каждого дня есть своя Вселенная', 70, 520); const a = document.createElement('a'); a.download = 'chronocosmos-' + current.iso + '.png'; a.href = c.toDataURL('image/png'); a.click() });
$('compareForm').addEventListener('submit', e => { e.preventDefault(); if (!current) return; const other = dateValid($('compareDate').value); if (!other) { message('compareContent', 'Выбери корректную дату не позже сегодняшнего дня.'); return } const days = Math.round(Math.abs(other - current.date) / 864e5); $('compareContent').innerHTML = `<p><strong>${safe(fmt.format(current.date))}</strong> — ${safe(weekday.format(current.date))}, ${safe(moon(current.date).name)}.</p><p><strong>${safe(fmt.format(other))}</strong> — ${safe(weekday.format(other))}, ${safe(moon(other).name)}.</p><p>Между датами: <strong>${days.toLocaleString('ru-RU')}</strong> дней.</p>` });
$('searchForm').addEventListener('submit', async e => { e.preventDefault(); const date = dateValid($('birthDate').value), city = $('birthCity').value.trim(); if (!date || !city) { alert('Укажи правильную дату и город.'); return } current = { date, city, time: $('birthTime').value || '12:00', iso: $('birthDate').value, loc: null }; lastWorld = []; $('results').classList.remove('is-hidden'); $('dateHeading').textContent = fmt.format(date); $('resultsLead').textContent = 'Этот день был не похож ни на какой другой.'; $('passportDate').textContent = fmt.format(date); $('moonIcon').textContent = moon(date).icon; $('moonName').textContent = moon(date).name; $('moonInfo').textContent = 'Освещённость диска ≈ ' + moon(date).ill + '%'; const years = Math.max(0, new Date().getFullYear() - date.getFullYear()); $('facts').innerHTML = [weekday.format(date), years + ' лет (примерно)', Math.round((Date.now() - date) / 864e5).toLocaleString('ru-RU') + ' дней с рождения'].map(s => `<span class="fact">${safe(s)}</span>`).join(''); for (const id of ['weatherContent', 'russiaContent', 'worldContent', 'peopleContent', 'musicContent', 'cinemaContent']) message(id, 'Загружаем архив…'); techTimeline(); drawSolar(); newspaper(); $('statusBanner').textContent = 'Запрашиваем погодный, исторический и музыкальный архивы…'; $('results').scrollIntoView({ behavior: 'smooth', block: 'start' }); await Promise.allSettled([weather(date, city), history(), music(), cinema()]); $('statusBanner').textContent = 'Загрузка завершена. Если записи не найдены, открой ссылки на источники.' });
(function init() { const d = new Date(); $('birthDate').max = d.toISOString().slice(0, 10); $('compareDate').max = d.toISOString().slice(0, 10); $('birthDate').value = '2012-06-15'; $('compareDate').value = '2000-01-01'; const field = $('starfield'); for (let i = 0; i < 75; i++) { const s = document.createElement('i'); s.style.left = ((i * 37.7) % 100) + '%'; s.style.top = ((i * 23.19) % 100) + '%'; s.style.animationDelay = -(i % 9) + 's'; field.appendChild(s) } })();

function russianTopic(text) {
    return /росси|русск|ссср|советск|москв|петербург|ленинград|петроград|сталинград|российск|кремл|большевик|сибир|урал|царь|царск|император росс|древн[ея][йя] рус|киевск[аяой] рус|russia|russian|soviet|moscow|saint petersburg|ussr/i.test(text || '');
}
async function getHistorical(date, id) {
    const { m, d, y } = dateParts(date), mm = pad(m), dd = pad(d);
    const root = 'https://ru.wikipedia.org/api/rest_v1/feed/onthisday/all/' + mm + '/' + dd;
    const alternative = 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/' + mm + '/' + dd;
    source('worldSource', root, 'Википедия · события этого числа ↗');
    source('russiaSource', root, 'Википедия · календарь событий ↗');
    source('peopleSource', root, 'Википедия · дни рождения ↗');
    let data, language = 'ru';
    try { data = await fetchJSON(root, 12000) } catch (e) {
        try { data = await fetchJSON(alternative, 12000); language = 'en' } catch (error) {
            if (id !== requestId) return;
            const msg = 'Википедия сейчас недоступна. Можно открыть календарную страницу по ссылке.';
            showNotice('russiaContent', msg, sourceDayLink(mm, dd), 'Открыть день в Википедии ↗');
            showNotice('worldContent', msg, sourceDayLink(mm, dd), 'Открыть день в Википедии ↗');
            showNotice('peopleContent', msg, sourceDayLink(mm, dd), 'Открыть дни рождения ↗');
            console.info('Исторические события:', error.message); return;
        }
    }
    if (id !== requestId) return;
    currentEvents = Array.isArray(data?.events) ? data.events : [];
    currentBirths = Array.isArray(data?.births) ? data.births : [];
    const byYear = (a, b) => Math.abs(a.year - y) - Math.abs(b.year - y);
    const all = currentEvents.filter(e => Number.isInteger(e.year) && typeof e.text === 'string');
    const exact = all.filter(e => e.year === y);
    const russia = all.filter(e => russianTopic(e.text));
    const world = all.filter(e => !russianTopic(e.text));
    function pickItems(arr, max) { const inYear = arr.filter(e => e.year === y); return inYear.length ? { data: inYear.slice(0, max), exact: true } : { data: [...arr].sort(byYear).slice(0, max), exact: false } }
    const ru = pickItems(russia, 5), wr = pickItems(world, 6);
    function drawList(id, selection) {
        if (!selection.data.length) { showNotice(id, 'В выбранной энциклопедической подборке нет подходящих записей. Это не означает, что в тот день ничего не произошло.', sourceDayLink(mm, dd), 'Календарь событий ↗'); return; }
        const container = clear(id); const note = selection.exact ? 'Записи именно за ' + y + ' год' : 'В этот день и месяц в другие годы (точных записей за ' + y + ' год нет)'; textLine(container, note, 'note');
        showItems(id, selection.data, (li, item) => {
            const strong = makeEl('strong', item.year + ' — '); li.append(strong);
            const url = safeLinkFromPages(item); if (url) link(li, url, item.text); else li.append(document.createTextNode(item.text));
        });
        container.prepend(makeEl('p', note, 'note'));
    }
    drawList('russiaContent', ru); drawList('worldContent', wr);
    const people = [...currentBirths].filter(p => typeof p.text === 'string').sort((a, b) => b.year - a.year).slice(0, 6);
    if (!people.length) showNotice('peopleContent', 'В архиве нет данных о родившихся в эту дату.', sourceDayLink(mm, dd), 'Календарь дат ↗');
    else showItems('peopleContent', people, (li, item) => { li.append(makeEl('strong', item.year + ' — ')); const url = safeLinkFromPages(item); if (url) link(li, url, item.text); else li.append(document.createTextNode(item.text)) });
    if (language === 'en') {
        ['russiaSource', 'worldSource', 'peopleSource'].forEach(id => $(id).append(document.createTextNode(' · резервный англоязычный архив')));
    }
    createNewspaper();
}
function musicQuery(q) { const u = new URL('https://musicbrainz.org/ws/2/release-group/'); u.searchParams.set('query', q); u.searchParams.set('fmt', 'json'); u.searchParams.set('limit', '18'); return u.href; }
function musicSearchPage(date) { return 'https://musicbrainz.org/search?query=' + encodeURIComponent('firstreleasedate:' + date) + '&type=release_group&method=advanced'; }
async function showMusic(date, id) {
    const { y } = dateParts(date);
    source('musicSource', 'https://musicbrainz.org/', 'MusicBrainz · база музыкальных релизов ↗');
    let results = [], exact = true;
    try {
        const response = await fetchJSON(musicQuery('firstreleasedate:' + date + ' AND primarytype:single'), 16000);
        results = (response?.['release-groups'] || []).filter(e => e['first-release-date'] === date);
        if (!results.length) {
            // MusicBrainz просит не чаще одного запроса в секунду.
            await new Promise(resolve => setTimeout(resolve, 1150));
            const yearData = await fetchJSON(musicQuery('firstreleasedate:[' + y + ' TO ' + y + '] AND primarytype:single'), 16000);
            results = (yearData?.['release-groups'] || []).filter(e => String(e['first-release-date'] || '').startsWith(String(y)));
            exact = false;
        }
        if (id !== requestId) return;
        currentMusic = results.slice(0, 6);
        if (!currentMusic.length) { showNotice('musicContent', 'MusicBrainz не нашёл подтверждённых синглов этой даты. Попробуй открыть поиск по базе.', musicSearchPage(date), 'Найти релизы самостоятельно ↗'); return; }
        const el = clear('musicContent'); textLine(el, exact ? 'Синглы, впервые выпущенные в эту дату:' : 'Подборка синглов года рождения (не обязательно этого дня):', 'note');
        const ul = makeEl('ul'); currentMusic.forEach(item => {
            const li = makeEl('li'); const title = item.title || 'Без названия';
            const artist = (item['artist-credit'] || []).map(a => a?.name || '').filter(Boolean).join('') || 'Исполнитель не указан';
            const safeId = String(item.id || '');
            if (/^[a-f\d-]{36}$/i.test(safeId)) link(li, 'https://musicbrainz.org/release-group/' + safeId, title); else li.append(makeEl('strong', title));
            li.append(makeEl('span', ' — ' + artist)); li.append(makeEl('div', item['first-release-date'] || 'Дата неизвестна', 'note')); ul.append(li);
        }); el.append(ul);
    } catch (error) { if (id !== requestId) return; showNotice('musicContent', 'Музыкальная база сейчас не отвечает или ограничила запрос. Это не ошибка твоего сайта.', musicSearchPage(date), 'Посмотреть релизы в MusicBrainz ↗'); console.info('Музыка:', error.message) }
}
async function showCinema(date, id) {
    const { y } = dateParts(date);
    const category = 'Категория:Фильмы_' + y + '_года';
    const wikiURL = 'https://ru.wikipedia.org/wiki/' + encodeURIComponent(category);
    source('cinemaSource', wikiURL, 'Википедия · фильмы ' + y + ' года ↗');
    try {
        const u = new URL('https://ru.wikipedia.org/w/api.php');
        for (const [k, v] of Object.entries({ action: 'query', list: 'categorymembers', cmtitle: category.replace(/_/g, ' '), cmtype: 'page', cmlimit: '9', format: 'json', origin: '*' })) u.searchParams.set(k, v);
        const data = await fetchJSON(u.href, 12500); if (id !== requestId) return;
        const films = data?.query?.categorymembers || [];
        if (!films.length) { showNotice('cinemaContent', 'В этой категории Википедии пока нет записей или она недоступна.', wikiURL, 'Открыть список фильмов ↗'); return; }
        const el = clear('cinemaContent'); textLine(el, 'Статьи из категории «Фильмы ' + y + ' года». Это не рейтинг популярности.', 'note');
        const ul = makeEl('ul'); films.slice(0, 7).forEach(f => { const li = makeEl('li'); link(li, 'https://ru.wikipedia.org/wiki/' + encodeURIComponent(f.title.replace(/ /g, '_')), f.title); ul.append(li) }); el.append(ul);
    } catch (error) { if (id !== requestId) return; showNotice('cinemaContent', 'Не получилось загрузить список фильмов. Можно открыть категорию в Википедии.', wikiURL, 'Фильмы ' + y + ' года ↗'); console.info('Кино:', error.message) }
}
function showTechnology(date) {
    const y = dateParts(date).y;
    const near = TECH.map(t => ({ ...t, diff: Math.abs(t.year - y) })).sort((a, b) => a.diff - b.diff || a.year - b.year).slice(0, 5).sort((a, b) => a.year - b.year);
    const el = clear('techContent'); textLine(el, 'События ближайших лет. Годы указаны для каждого открытия.', 'note');
    const ul = makeEl('ul'); near.forEach(t => { const li = makeEl('li'); li.append(makeEl('strong', t.year + ' — ' + t.name)); li.append(makeEl('div', t.text, 'note')); ul.append(li) }); el.append(ul);
}
function showTimeline(date) {
    const y = dateParts(date).y; const now = Number(TODAY_TEXT.slice(0, 4));
    const list = TECH.filter(t => t.year >= y && t.year <= now);
    const el = clear('timelineContent'); const timeline = makeEl('div', null, 'timeline');
    function item(year, text) { const block = makeEl('div', null, 'timeline-item'); block.append(makeEl('strong', year + ' — '), document.createTextNode(text)); timeline.append(block) }
    item(y, 'Ты появился(лась) на свет!'); list.slice(0, 8).forEach(t => item(t.year, t.name)); item(now, 'Сегодня твоя история продолжается.'); el.append(timeline);
    if (list.length > 8) textLine(el, 'Показаны первые восемь этапов из учебной подборки.', 'note');
}
function paperText() {
    if (!current) return null;
    const day = current.date, year = dateParts(day).y, items = currentEvents.filter(e => e.year === year).slice(0, 2);
    return { day: formatDate(day), city: current.city, weather: currentWeather ? `Максимальная температура ${currentWeather.hi} °C, минимальная ${currentWeather.lo} °C, ${currentWeather.description}.` : 'Точные данные о погоде не загружены.', events: items.length ? items.map(e => e.text) : ['Энциклопедический архив не содержит подтверждённых событий ровно за эту дату.'], moon: moonPhase(day).name };
}
function createNewspaper() {
    const el = clear('newspaperContent'); const obj = paperText(); if (!obj) return;
    el.append(makeEl('div', 'СПЕЦИАЛЬНЫЙ ВЫПУСК • ' + obj.day.toUpperCase(), 'paper-top'));
    el.append(makeEl('div', 'Мир встречает тебя', 'paper-title'));
    el.append(makeEl('div', 'В этот день началась совершенно новая история.', 'paper-sub'));
    const content = makeEl('div', null, 'paper-columns');
    textLine(content, 'Место событий: ' + obj.city + '. Погода: ' + obj.weather);
    textLine(content, 'Ночное небо: ' + obj.moon + '.');
    obj.events.forEach(e => textLine(content, 'Из энциклопедии: ' + e));
    el.append(content);
}
function buildPrintPage(mode) {
    const el = clear('printSheet'); const p = paperText(); if (!p) return;
    el.append(makeEl('div', 'ХРОНОКОСМОС • МАШИНА ВРЕМЕНИ', 'print-top'));
    el.append(makeEl('h1', mode === 'news' ? 'Газета одного дня' : 'Паспорт времени'));
    el.append(makeEl('h2', p.day));
    textLine(el, 'Город рождения: ' + p.city);
    textLine(el, 'День недели: ' + WEEKDAYS[utcDate(current.date).getUTCDay()]);
    textLine(el, 'Фаза Луны: ' + p.moon);
    textLine(el, 'Погода: ' + p.weather);
    if (mode === 'news') {
        el.append(makeEl('h2', 'Исторические события'));
        p.events.forEach(e => textLine(el, e));
    } else {
        textLine(el, 'Знак зодиака (календарный): ' + zodiac(current.date));
        textLine(el, 'Дней с даты рождения: ' + Math.max(0, daysBetween(current.date, TODAY_TEXT)).toLocaleString('ru-RU'));
    }
    el.append(makeEl('p', 'Данные: Open-Meteo, Википедия; расчёт Луны приблизительный. Для сохранения выбери «Сохранить как PDF» в окне печати.', 'print-foot'));
    window.print();
}
function savePostcard() {
    if (!current) return;
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 680; const c = canvas.getContext('2d');
    const bg = c.createLinearGradient(0, 0, 1200, 680); bg.addColorStop(0, '#101333'); bg.addColorStop(1, '#49488e'); c.fillStyle = bg; c.fillRect(0, 0, 1200, 680);
    for (let i = 0; i < 110; i++) { const x = (i * 149 + 29) % 1200, y = (i * 211 + 37) % 680; c.fillStyle = '#ffffff80'; c.beginPath(); c.arc(x, y, 1 + (i % 3), 0, Math.PI * 2); c.fill() }
    c.fillStyle = '#d8fa78'; c.font = 'bold 36px Arial'; c.fillText('✺  ХРОНОКОСМОС', 66, 94);
    c.fillStyle = '#ffffff'; c.font = 'bold 73px Arial'; c.fillText('В тот день', 65, 240); c.fillText('Вселенная запомнила тебя.', 65, 320);
    c.fillStyle = '#dbd6ff'; c.font = '46px Arial'; c.fillText(formatDate(current.date), 65, 432);
    c.font = '29px Arial'; c.fillText('Город: ' + current.city, 65, 500);
    c.fillStyle = '#d8fa78'; c.font = '26px Arial'; c.fillText('У каждого дня есть своя Вселенная.', 65, 603);
    const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'ХРОНОКОСМОС_' + current.date + '.png'; document.body.append(a); a.click(); a.remove();
}
function compareDates(event) {
    event.preventDefault(); if (!current) return; const second = $('compareDate').value;
    if (!dateIsValid(second)) { showNotice('compareContent', 'Выбери настоящую дату от 1900 года до сегодняшнего дня.'); return; }
    const one = current.date, diff = Math.abs(daysBetween(one, second)); const container = clear('compareContent');
    const row = makeEl('div', null, 'compare-columns');
    [one, second].forEach(s => { const box = makeEl('div'); box.append(makeEl('strong', formatDate(s))); textLine(box, WEEKDAYS[utcDate(s).getUTCDay()]); textLine(box, moonPhase(s).icon + ' ' + moonPhase(s).name); row.append(box) });
    container.append(row); textLine(container, 'Между датами — ' + diff.toLocaleString('ru-RU') + ' дней.', 'compare-result');
}
async function search(event) {
    event.preventDefault(); const date = $('birthDate').value, time = $('birthTime').value || '12:00', city = $('birthCity').value.trim();
    if (!dateIsValid(date)) { alert('Пожалуйста, выбери правильную дату от 1900 года до сегодняшнего дня.'); return; }
    if (!city) { alert('Укажи город рождения.'); return; }
    requestId++; const id = requestId; current = { date, time, city }; currentWeather = null; currentEvents = []; currentBirths = []; currentMusic = []; currentCity = null;
    $('results').classList.remove('is-hidden'); $('dateHeading').textContent = formatDate(date) + ' — твоя точка во времени';
    $('resultsLead').textContent = 'Место рождения: ' + city + '. Начинаем путешествие по архивам и звёздному небу.';
    $('passportDate').textContent = formatDate(date); $('statusBanner').textContent = 'Загружаем информацию. Разделы появятся независимо друг от друга…';
    showFacts(date); showTechnology(date); showTimeline(date); createNewspaper();
    ['weatherContent', 'russiaContent', 'worldContent', 'peopleContent', 'musicContent', 'cinemaContent'].forEach(key => showNotice(key, 'Подключаемся к архиву…'));
    drawSolar();
    $('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
    const cityPromise = findCity(city).then(place => {
        if (id !== requestId) return null; currentCity = place; drawSky(date, time, place);
        return showWeather(date, place, id);
    }).catch(err => { if (id === requestId) { drawSky(date, time, null); showNotice('weatherContent', 'Не удалось определить город.'); console.info(err.message) } });
    const tasks = [cityPromise, getHistorical(date, id), showMusic(date, id), showCinema(date, id)];
    await Promise.allSettled(tasks);
    if (id === requestId) { $('statusBanner').textContent = 'Поиск завершён. Там, где архив не смог ответить, показаны пояснения и ссылки на источник.'; createNewspaper(); }
}
function initialize() {
    $('birthDate').max = TODAY_TEXT; $('compareDate').max = TODAY_TEXT;
    $('birthDate').value = Number(TODAY_TEXT.slice(0, 4)) > 2010 ? '2012-08-26' : '2000-01-01';
    makeStarfield(); $('searchForm').addEventListener('submit', search);
    $('compareForm').addEventListener('submit', compareDates);
    $('printNews').addEventListener('click', () => buildPrintPage('news'));
    $('savePdf').addEventListener('click', () => buildPrintPage('passport'));
    $('savePng').addEventListener('click', savePostcard);
    setupSolar();
    window.addEventListener('resize', () => { if (current) { drawSolar(); drawSky(current.date, current.time, currentCity) } });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize); else initialize();
