import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const WEATHER_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';
const PHOTO_URL = 'https://mars.nasa.gov/api/v1/raw_image_items/';
const PHOTO_PAGE_SIZE = 500;
const isNavcamPhoto = photo => photo.instrument?.startsWith('NAV_');
const CAMERA_NAMES = {
  FHAZ_LEFT_A: 'Front Hazcam Left', FHAZ_LEFT_B: 'Front Hazcam Left',
  FHAZ_RIGHT_A: 'Front Hazcam Right', FHAZ_RIGHT_B: 'Front Hazcam Right',
  RHAZ_LEFT_A: 'Rear Hazcam Left', RHAZ_LEFT_B: 'Rear Hazcam Left',
  RHAZ_RIGHT_A: 'Rear Hazcam Right', RHAZ_RIGHT_B: 'Rear Hazcam Right',
  NAV_LEFT_A: 'Navcam Left', NAV_LEFT_B: 'Navcam Left',
  NAV_RIGHT_A: 'Navcam Right', NAV_RIGHT_B: 'Navcam Right',
  MAST_LEFT: 'Mastcam Left', MAST_RIGHT: 'Mastcam Right',
  CHEMCAM_RMI: 'ChemCam', MAHLI: 'MAHLI', MARDI: 'MARDI',
};

const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
  month: 'long', day: 'numeric', year: 'numeric',
});

function useMarsWeather() {
  const [state, setState] = useState({ status: 'loading', soles: [], error: null });

  const load = useCallback(async signal => {
    setState(previous => ({ ...previous, status: 'loading', error: null }));
    try {
      const response = await fetch(WEATHER_URL, { signal });
      if (!response.ok) throw new Error(`Weather request failed (${response.status})`);
      const payload = await response.json();
      if (!payload.soles?.length) throw new Error('NASA returned no weather observations');
      setState({ status: 'success', soles: payload.soles, error: null });
    } catch (error) {
      if (error.name !== 'AbortError') setState({ status: 'error', soles: [], error });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { ...state, retry: () => load() };
}

function Header({ updatedAt, online }) {
  return <header className="mission-header">
    <div className="nasa-logo"><div className="logo-text">NASA</div><div className="mission-designation">MARS WEATHER STATION</div></div>
    <div className="status-indicator">
      <div className={`status-dot ${online ? 'active' : ''}`} />
      <span>{online ? 'LIVE CONNECTION' : 'CONNECTION DEGRADED'}</span>
      <div className="data-freshness"><span className="freshness-label">LAST UPDATE</span><span className="freshness-time">{updatedAt || '--'}</span><span className="data-delay-warning">DATA DELAY: ~7 DAYS</span></div>
    </div>
  </header>;
}

function CurrentConditions({ latest, status, onRetry }) {
  return <section className="data-panel primary-panel">
    <div className="panel-header"><h2>CURRENT CONDITIONS</h2><div className="location-info"><span className="coordinates">4.5°S 137.4°E</span><span className="location">GALE CRATER</span></div></div>
    <div className="weather-grid">
      <div className="info-block sol-info"><div className="data-label">MISSION SOL</div><div className="data-value large">{latest?.sol ?? '---'}</div><div className="data-sublabel">{latest ? formatDate(latest.terrestrial_date) : status === 'error' ? 'Weather link unavailable' : 'Loading...'}</div></div>
      <div className="info-block temperature-block"><div className="temp-container-display">
        <div className="temp-reading-display high-temp"><div className="temp-data-display"><span className="temp-label">HIGH</span><span className="temp-value-display">{latest?.max_temp ?? '--'}°F</span></div></div>
        <div className="temp-reading-display low-temp"><div className="temp-data-display"><span className="temp-label">LOW</span><span className="temp-value-display">{latest?.min_temp ?? '--'}°F</span></div></div>
      </div></div>
      <div className="info-block env-data">
        <EnvItem label="PRESSURE" value={latest?.pressure ? `${latest.pressure} Pa` : '--- Pa'} />
        <EnvItem label="SUNRISE" value={latest?.sunrise ? `${latest.sunrise} LMST` : '--:-- LMST'} />
        <EnvItem label="SUNSET" value={latest?.sunset ? `${latest.sunset} LMST` : '--:-- LMST'} />
      </div>
      <div className="info-block alert-panel"><div className="alert-header"><span className="alert-title">ALERT SYSTEM</span><div className="alert-status">STANDBY</div></div><div className="alert-indicators">{['DUST STORM', 'EXTREME TEMP', 'LOW PRESSURE', 'HIGH WIND'].map(label => <div className="alert-led" key={label}><div className="led-light"/><span className="led-label">{label}</span></div>)}</div>{status === 'error' && <button className="period-btn" onClick={onRetry}>RETRY WEATHER LINK</button>}</div>
    </div>
  </section>;
}

function EnvItem({ label, value }) {
  return <div className="env-item"><div className="env-info"><span className="env-label">{label}</span><span className="env-value">{value}</span></div></div>;
}

const modeMeta = [
  ['history', 'HISTORY', '01', 'M3 17c3-5 5 0 8-6s5 0 10-6M3 21h18'],
  ['bar', 'BAR', '02', 'M5 19V9h3v10H5Zm6 0V4h3v15h-3Zm6 0v-7h3v7h-3Z'],
  ['radial', 'RADIAL', '03', 'M12 4a8 8 0 1 0 8 8M12 8a4 4 0 1 0 4 4m-4 0 6-6'],
  ['combined', 'COMBINED', '04', 'M3 16h3l2-7 4 10 3-12 2 9h4'],
];

function TemperatureAnalysis({ soles }) {
  const [mode, setMode] = useState('history');
  const [period, setPeriod] = useState(7);
  const data = useMemo(() => soles.slice(0, period).map(item => ({ sol: item.sol, high: Number(item.max_temp), low: Number(item.min_temp) })).filter(item => Number.isFinite(item.high) && Number.isFinite(item.low)), [soles, period]);
  const highs = data.map(item => item.high), lows = data.map(item => item.low);
  const average = list => list.length ? Math.round(list.reduce((sum, value) => sum + value, 0) / list.length) : '--';
  const trend = data.length > 1 ? ((data.at(-1).high + data.at(-1).low) - (data[0].high + data[0].low)) / 2 : 0;

  return <section className="data-panel chart-panel">
    <div className="panel-header"><h2>TEMPERATURE ANALYSIS</h2><ModeSelector mode={mode} setMode={setMode}/></div>
    <div className="temperature-analysis">
      <div className="analysis-header"><div className="period-selector">{[7, 30].map(value => <button key={value} className={`period-btn ${period === value ? 'active' : ''}`} onClick={() => setPeriod(value)}>{value} DAYS</button>)}</div><div className="analysis-summary"><Summary label="AVG HIGH" value={`${average(highs)}°F`}/><Summary label="AVG LOW" value={`${average(lows)}°F`}/><Summary label="RANGE" value={data.length ? `${average(highs) - average(lows)}°F` : '--°F'}/></div></div>
      <div className="temperature-scroll-container"><div className="temperature-scroll" data-mode={mode}>{data.length ? mode === 'history' ? <HistoryChart data={data}/> : <SvgChart data={data} mode={mode}/> : <div className="chart-empty">Waiting for weather data…</div>}</div></div>
      <div className="analysis-footer"><div className="trend-indicator"><span className="trend-label">TREND</span><span className={`trend-value ${trend > 2 ? 'warming' : trend < -2 ? 'cooling' : ''}`}>{trend > 2 ? 'WARMING' : trend < -2 ? 'COOLING' : 'STABLE'}</span></div><div className="extreme-values"><Summary label="HIGHEST" value={data.length ? `${Math.max(...highs)}°F` : '--°F'}/><Summary label="LOWEST" value={data.length ? `${Math.min(...lows)}°F` : '--°F'}/></div></div>
    </div>
  </section>;
}

function ModeSelector({ mode, setMode }) {
  const selected = modeMeta.find(item => item[0] === mode);
  return <div className="flight-mode-selector" role="radiogroup" aria-label="Temperature display mode"><div className="flight-mode-status"><span className="flight-status-light"/><span className="flight-status-label">DISPLAY MODE</span><span className="flight-status-value">{selected[1]}</span></div><div className="flight-mode-buttons">{modeMeta.map(([value, label, number, path]) => <button key={value} type="button" role="radio" aria-checked={mode === value} className={`flight-mode-button ${mode === value ? 'active' : ''}`} onClick={() => setMode(value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={path}/></svg><span>{label}</span><small>{number}</small></button>)}</div></div>;
}

function Summary({ label, value }) { return <div className="summary-item"><span className="summary-label">{label}</span><span className="summary-value">{value}</span></div>; }

function HistoryChart({ data }) {
  const ordered = [...data].reverse();
  const min = Math.min(...data.map(item => item.low));
  const max = Math.max(...data.map(item => item.high));
  const range = Math.max(1, max - min);
  return ordered.map((day, index) => {
    const left = (day.low - min) / range * 100;
    const width = (day.high - day.low) / range * 100;
    return <div className="temp-day" key={day.sol}><div className="day-info"><div className="day-label">Sol {day.sol}</div><div className="day-date">{index === ordered.length - 1 ? 'TODAY' : `DAY ${ordered.length - index}`}</div></div><div className="temp-readings"><div className="temp-reading"><div className="temp-type">LOW</div><div className="temp-value low">{day.low}°F</div></div><div className="temp-bar"><div className="temp-bar-fill" style={{ width: `${width}%`, marginLeft: `${left}%` }}/></div><div className="temp-reading"><div className="temp-type">HIGH</div><div className="temp-value high">{day.high}°F</div></div></div></div>;
  });
}

function SvgChart({ data, mode }) {
  const [tip, setTip] = useState(null);
  const ordered = [...data].reverse();
  const width = 900, height = 360, left = 72, right = 32, top = 34, bottom = 55;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const rawMin = Math.min(...ordered.map(item => item.low)), rawMax = Math.max(...ordered.map(item => item.high));
  const min = Math.floor((rawMin - 5) / 10) * 10, max = Math.ceil((rawMax + 5) / 10) * 10, range = max - min || 1;
  const inset = mode === 'bar' || mode === 'combined' ? 42 : 0;
  const x = index => left + inset + (ordered.length === 1 ? (plotWidth - inset * 2) / 2 : index * (plotWidth - inset * 2) / (ordered.length - 1));
  const y = value => top + (max - value) / range * plotHeight;
  const showTip = (event, day, series) => setTip({ text: `Sol ${day.sol} · ${series.toUpperCase()} ${day[series]}°F`, series, x: event.clientX, y: event.clientY });
  const pointEvents = (day, series) => ({ tabIndex: 0, onMouseEnter: event => showTip(event, day, series), onMouseMove: event => showTip(event, day, series), onMouseLeave: () => setTip(null), onFocus: event => showTip(event, day, series), onBlur: () => setTip(null) });
  const linePoints = series => ordered.map((day, index) => `${x(index)},${y(day[series])}`).join(' ');
  const barWidth = Math.max(6, Math.min(28, plotWidth / ordered.length / 3));

  if (mode === 'radial') return <RadialChart data={ordered} tooltip={tip} setTooltip={setTip}/>;
  return <div className="react-chart-wrap"><svg className={`temperature-chart chart-${mode}`} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${mode} temperature chart`}>
    {[0, 1, 2, 3, 4].map(index => { const lineY = top + index * plotHeight / 4; return <g key={index}><line className="chart-grid" x1={left} y1={lineY} x2={width - right} y2={lineY}/><text className="chart-axis-label" x={left - 12} y={lineY + 4} textAnchor="end">{Math.round(max - index * range / 4)}°</text></g>; })}
    {ordered.map((day, index) => <text key={day.sol} className="chart-axis-label" x={x(index)} y={height - 20} textAnchor="middle">Sol {day.sol}</text>)}
    {mode === 'combined' && <polygon className="chart-range-area" points={`${linePoints('high')} ${[...ordered].reverse().map((day, reverseIndex) => `${x(ordered.length - reverseIndex - 1)},${y(day.low)}`).join(' ')}`}/>} 
    {(mode === 'bar' || mode === 'combined') && ordered.map((day, index) => <g key={day.sol} className="chart-bar-group"><rect className="chart-bar low" x={x(index) - barWidth - 2} y={y(day.low)} width={barWidth} height={top + plotHeight - y(day.low)} {...pointEvents(day, 'low')}/><rect className="chart-bar high" x={x(index) + 2} y={y(day.high)} width={barWidth} height={top + plotHeight - y(day.high)} {...pointEvents(day, 'high')}/></g>)}
    {mode === 'combined' && <polyline className="chart-line average" points={ordered.map((day, index) => `${x(index)},${y((day.high + day.low) / 2)}`).join(' ')}/>} 
  </svg>{tip && <ChartTooltip {...tip}/>}</div>;
}

function RadialChart({ data, tooltip, setTooltip }) {
  const width = 900, height = 360, cx = 450, cy = 185, radius = 125;
  const values = data.flatMap(item => [item.low, item.high]), min = Math.min(...values) - 5, range = Math.max(1, Math.max(...values) - min + 5);
  const position = (index, distance) => [cx + Math.cos(-Math.PI / 2 + index * Math.PI * 2 / data.length) * distance, cy + Math.sin(-Math.PI / 2 + index * Math.PI * 2 / data.length) * distance];
  const coords = (day, index, series) => position(index, 25 + (day[series] - min) / range * (radius - 25));
  const polygon = series => data.map((day, index) => coords(day, index, series).join(',')).join(' ');
  const events = (day, series) => ({ tabIndex: 0, onMouseEnter: event => setTooltip({ text: `Sol ${day.sol} · ${series.toUpperCase()} ${day[series]}°F`, series, x: event.clientX, y: event.clientY }), onMouseLeave: () => setTooltip(null), onFocus: event => setTooltip({ text: `Sol ${day.sol} · ${series.toUpperCase()} ${day[series]}°F`, series, x: event.clientX, y: event.clientY }), onBlur: () => setTooltip(null) });
  return <div className="react-chart-wrap"><svg className="temperature-chart chart-radial" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Radial temperature chart">
    {[.25, .5, .75, 1].map(scale => <polygon key={scale} className="radar-grid" points={data.map((_, index) => position(index, radius * scale).join(',')).join(' ')}/>)}
    {data.map((day, index) => { const [ax, ay] = position(index, radius), [lx, ly] = position(index, radius + 20); return <g key={day.sol}><line className="chart-grid" x1={cx} y1={cy} x2={ax} y2={ay}/><text className="chart-axis-label" x={lx} y={ly + 4} textAnchor="middle">{day.sol}</text></g>; })}
    <polygon className="radar-shape high" points={polygon('high')}/><polygon className="radar-shape low" points={polygon('low')}/>
    {['high', 'low'].flatMap(series => data.map((day, index) => { const [px, py] = coords(day, index, series); return <circle key={`${series}-${day.sol}`} className={`radar-point ${series}`} cx={px} cy={py} r="5" {...events(day, series)}/>; }))}
  </svg>{tooltip && <ChartTooltip {...tooltip}/>}</div>;
}

function ChartTooltip({ text, series, x, y }) { return <div className="chart-tooltip visible react-tooltip" data-series={series} style={{ left: x, top: y }}>{text}</div>; }

function PhotoGallery() {
  const [photos, setPhotos] = useState([]), [status, setStatus] = useState('loading'), [error, setError] = useState(null), [page, setPage] = useState(0), [more, setMore] = useState(true);
  const [camera, setCamera] = useState('ALL'), [includeNavcam, setIncludeNavcam] = useState(false), [index, setIndex] = useState(0), [imageLoading, setImageLoading] = useState(true), [modal, setModal] = useState(false);
  const requestRef = useRef(null);

  const loadPage = useCallback(async (targetPage, replace = false) => {
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    setStatus(targetPage === 0 ? 'loading' : 'loading-more'); setError(null);
    try {
      const query = new URLSearchParams({ mission: 'msl', per_page: String(PHOTO_PAGE_SIZE), page: String(targetPage), order: 'sol desc,instrument_sort asc,date_taken desc' });
      const response = await fetch(`${PHOTO_URL}?${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Image request failed (${response.status})`);
      const payload = await response.json();
      setPhotos(previous => replace ? payload.items : [...previous, ...payload.items.filter(item => !previous.some(photo => photo.id === item.id))]);
      setMore(Boolean(payload.more)); setPage(targetPage); setStatus('success');
    } catch (requestError) {
      if (requestError.name !== 'AbortError') { setError(requestError); setStatus('error'); }
    }
  }, []);

  useEffect(() => { loadPage(0, true); return () => requestRef.current?.abort(); }, [loadPage]);
  const visiblePhotos = useMemo(() => includeNavcam ? photos : photos.filter(photo => !isNavcamPhoto(photo)), [photos, includeNavcam]);
  const navcamCount = useMemo(() => photos.filter(isNavcamPhoto).length, [photos]);
  const cameras = useMemo(() => [...new Set(visiblePhotos.map(photo => photo.instrument))], [visiblePhotos]);
  const filtered = useMemo(() => camera === 'ALL' ? visiblePhotos : visiblePhotos.filter(photo => photo.instrument === camera), [visiblePhotos, camera]);
  const current = filtered[index] || filtered[0];
  useEffect(() => { setIndex(0); setImageLoading(true); }, [camera, includeNavcam]);
  useEffect(() => { setImageLoading(true); }, [current?.id]);
  const move = direction => setIndex(value => (value + direction + filtered.length) % filtered.length);
  const select = value => { setIndex(value); setImageLoading(true); };
  const minSol = photos.length ? Math.min(...photos.map(photo => photo.sol)) : null, maxSol = photos.length ? Math.max(...photos.map(photo => photo.sol)) : null;

  return <section className="data-panel image-panel">
    <div className="panel-header"><h2>SURFACE IMAGERY</h2><div className="search-range-display"><span className="range-label">SEARCH RANGE:</span><span className="range-value">{minSol ? `SOL ${minSol} TO ${maxSol}` : 'ACQUIRING...'}</span></div><div className="image-controls"><span className="rover-info">CURIOSITY ROVER</span><div className="image-counter"><span className="counter-text">IMAGE {filtered.length ? index + 1 : '--'} OF {filtered.length || '--'}</span></div></div></div>
    <div className="sol-search-indicator"><div className="search-info"><span className="search-label">PHOTO LINK</span><span className="search-value">{status === 'loading' ? 'CONNECTING TO NASA...' : status === 'loading-more' ? 'RECEIVING NEXT IMAGE PACKET...' : status === 'error' ? 'LINK INTERRUPTED' : `${photos.length} CURRENT RAW IMAGES RECEIVED`}</span></div>{status === 'error' && <button className="continue-search-btn" onClick={() => loadPage(page, page === 0)}>RETRY LINK</button>}{status === 'success' && more && <button className="continue-search-btn" onClick={() => loadPage(page + 1)}>LOAD {PHOTO_PAGE_SIZE} MORE</button>}</div>
    <div className="image-viewer"><div className="image-content"><div className="main-image-container">
      {current && <><div className="image-navigation"><button className="nav-btn prev-btn" onClick={() => move(-1)} aria-label="Previous photo">‹</button><button className="nav-btn next-btn" onClick={() => move(1)} aria-label="Next photo">›</button></div><div className="photo-display"><img src={current.https_url || current.url} alt={current.description || current.title} className="rover-photo" onLoad={() => setImageLoading(false)} onError={() => setImageLoading(false)} onClick={() => setModal(true)}/></div><div className="image-camera-info"><span className="camera-label">{CAMERA_NAMES[current.instrument] || current.instrument} | Sol {current.sol}</span></div></>}
      {(status === 'loading' || imageLoading) && <div className="image-loading"><div className="loading-spinner"/><span className="loading-text">{status === 'loading' ? 'ACQUIRING LATEST IMAGE PACKET' : 'DECODING IMAGE'}</span></div>}
      {status === 'error' && !current && <div className="image-error"><strong>PHOTO LINK UNAVAILABLE</strong><span>{error?.message}</span><button className="continue-search-btn" onClick={() => loadPage(0, true)}>RETRY</button></div>}
    </div><div className="camera-filter-panel"><div className="filter-header"><span className="filter-label">CAMERA FILTER</span><span className="active-filter">{camera === 'ALL' ? 'ALL CAMERAS' : CAMERA_NAMES[camera] || camera}</span></div><button className={`navcam-toggle ${includeNavcam ? 'active' : ''}`} type="button" aria-pressed={includeNavcam} onClick={() => { setIncludeNavcam(value => !value); setCamera('ALL'); }}><span className="navcam-toggle-copy"><strong>INCLUDE NAVCAM</strong><small>{navcamCount} lower-resolution images</small></span><span className="navcam-switch" aria-hidden="true"><span/></span></button><div className="camera-buttons"><CameraButton active={camera === 'ALL'} onClick={() => setCamera('ALL')}>ALL ({visiblePhotos.length})</CameraButton>{cameras.map(value => <CameraButton key={value} active={camera === value} onClick={() => setCamera(value)}>{CAMERA_NAMES[value] || value} ({visiblePhotos.filter(photo => photo.instrument === value).length})</CameraButton>)}</div></div></div></div>
    <div className="thumbnail-gallery">{filtered.map((photo, photoIndex) => <button key={photo.id} className={`thumbnail-item ${photoIndex === index ? 'active' : ''}`} onClick={() => select(photoIndex)} aria-label={`View ${photo.title}`}><img src={photo.https_url || photo.url} alt="" loading="lazy"/></button>)}</div>
    {modal && current && <div className="photo-modal react-modal" role="dialog" aria-modal="true" aria-label="Surface image analysis" onClick={() => setModal(false)}><div className="modal-header"><span className="modal-title">SURFACE IMAGE ANALYSIS</span><button className="close-modal" onClick={() => setModal(false)} aria-label="Close">×</button></div><img className="modal-content" src={current.https_url || current.url} alt={current.description}/><div className="modal-caption">{current.title} · NASA/JPL-Caltech</div></div>}
  </section>;
}

function CameraButton({ active, onClick, children }) { return <button className={`camera-btn ${active ? 'active' : ''}`} onClick={onClick}>{children}</button>; }

export default function App() {
  const weather = useMarsWeather();
  const latest = weather.soles[0];
  const updatedAt = latest ? new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
  return <div className="mission-control"><Header updatedAt={updatedAt} online={weather.status === 'success'}/><main className="control-panel"><CurrentConditions latest={latest} status={weather.status} onRetry={weather.retry}/><TemperatureAnalysis soles={weather.soles}/><PhotoGallery/></main><footer className="system-footer"><div className="system-info"><span>CURIOSITY ROVER</span><span>|</span><span>GALE CRATER</span><span>|</span><span>NASA JPL</span></div><div className="data-source">Weather and raw imagery from NASA Mars Science Laboratory</div></footer></div>;
}
