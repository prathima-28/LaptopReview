// analyzeLogic.js
function extractNumbers(text, pattern) {
  const re = new RegExp(pattern, 'i');
  const m = text.match(re);
  if (!m) return null;
  const num = m[1] ? parseFloat(m[1].replace(/[^0-9.]/g, '')) : null;
  return num;
}

function detectCPU(text) {
  if (/intel\s*core\s*i9|ryzen\s*9/i.test(text)) return { name: 'i9/ryzen9', score: 100 };
  if (/intel\s*core\s*i7|ryzen\s*7/i.test(text)) return { name: 'i7/ryzen7', score: 90 };
  if (/intel\s*core\s*i5|ryzen\s*5/i.test(text)) return { name: 'i5/ryzen5', score: 75 };
  if (/intel\s*core\s*i3|ryzen\s*3/i.test(text)) return { name: 'i3/ryzen3', score: 50 };
  if (/apple\s*m\d+/i.test(text)) return { name: 'apple-m', score: 95 };
  return { name: 'unknown', score: 45 };
}

function detectRAM(text) {
  const m = text.match(/(\d{1,3})\s*GB\s*RAM|(\d{1,3})\s*GB\s*memory/i);
  if (m) {
    const val = parseInt(m[1] || m[2], 10);
    return val;
  }
  const m2 = text.match(/(\d{1,3})GB/i);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

function detectStorage(text) {
  const ssd = /ssd/i.test(text);
  const hdd = /hdd|hard\s*disk/i.test(text);
  let size = null;
  const m = text.match(/(\d{2,4})\s*(GB|TB)/i);
  if (m) {
    let n = parseInt(m[1], 10);
    if (/TB/i.test(m[2])) n = n * 1024;
    size = n;
  }
  return { ssd, hdd, sizeGB: size };
}

function detectGPU(text) {
  if (/nvidia|rtx|gtx|radeon|mx250|mx450|intel iris xe|geforce/i.test(text)) {
    if (/rtx|radeon\s*rx|nvidia\s*geforce\s*rtx|rtx\s*40|rtx\s*30/i.test(text)) return { present: true, score: 100 };
    if (/gtx|radeon|mx|intel iris xe/i.test(text)) return { present: true, score: 75 };
    return { present: true, score: 70 };
  }
  return { present: false, score: 10 };
}

function detectBatteryHours(text) {
  const m = text.match(/(\d{1,2})\s*(?:-hour|hours|hrs)/i) || text.match(/battery.*?(\d{1,2})\s*hours/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

function detectWeight(text) {
  const mKg = text.match(/(\d\.\d)\s*kg/i) || text.match(/(\d\.\d)\s*kilograms/i);
  if (mKg) return parseFloat(mKg[1]);
  const mLb = text.match(/(\d{1,3})\s*lb/i) || text.match(/(\d{1,3})\s*pounds/i);
  if (mLb) return parseInt(mLb[1], 10) * 0.453592;
  return null;
}

function detectDisplay(text) {
  const resMatch = text.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
  const refresh = text.match(/(\d{2,3})Hz/i);
  return { resolution: resMatch ? `${resMatch[1]}x${resMatch[2]}` : null, refresh: refresh ? parseInt(refresh[1], 10) : null };
}

function scoreGeneral(specs) {
  const text = (specs.title + ' ' + specs.details + ' ' + specs.bullets).toLowerCase();
  const cpu = detectCPU(text);
  const ram = detectRAM(text) || 0;
  const storage = detectStorage(text);
  const gpu = detectGPU(text);
  const battery = detectBatteryHours(text) || 0;
  const weight = detectWeight(text) || null;
  const display = detectDisplay(text);

  const attributes = [];

  let cpuScore = cpu.score;
  attributes.push({ name: 'Processor (CPU)', score: cpuScore, reason: `Detected ${cpu.name}` });

  let ramScore = 0;
  if (ram >= 16) ramScore = 100;
  else if (ram >= 8) ramScore = 80;
  else if (ram > 0) ramScore = 40;
  else ramScore = 30;
  attributes.push({ name: 'Memory (RAM)', score: ramScore, reason: ram ? `${ram} GB detected` : 'RAM not found' });

  let storageScore = 0;
  if (storage.ssd) {
    if (storage.sizeGB >= 512) storageScore = 100;
    else if (storage.sizeGB >= 256) storageScore = 85;
    else storageScore = 60;
  } else if (storage.hdd) {
    storageScore = 30;
  } else {
    storageScore = 40;
  }
  attributes.push({
    name: 'Storage',
    score: storageScore,
    reason: storage.ssd ? `SSD ~ ${storage.sizeGB || 'unknown'} GB` : storage.hdd ? 'HDD' : 'Unknown'
  });

  let batteryScore = 50;
  if (battery >= 8) batteryScore = 100;
  else if (battery >= 6) batteryScore = 80;
  else if (battery > 0) batteryScore = 50;
  else batteryScore = 40;
  attributes.push({ name: 'Battery Life', score: batteryScore, reason: battery ? `${battery} hours` : 'Battery life not specified' });

  let portScore = 60;
  if (weight && weight <= 1.6) portScore = 100;
  else if (weight && weight <= 2.2) portScore = 80;
  else if (weight) portScore = 50;
  attributes.push({ name: 'Portability', score: portScore, reason: weight ? `${weight.toFixed(2)} kg` : 'Weight not specified' });

  let displayScore = 70;
  if (display.resolution && /1920/.test(display.resolution)) displayScore = 85;
  if (display.resolution && /3840/.test(display.resolution)) displayScore = 100;
  attributes.push({ name: 'Display (Resolution)', score: displayScore, reason: display.resolution ? `${display.resolution}` : 'Resolution not specified' });

  const hasUSB = /usb|hdmi|thunderbolt|type-c|usb-c/i.test(text);
  attributes.push({ name: 'Ports & Connectivity', score: hasUSB ? 85 : 40, reason: hasUSB ? 'Ports detected' : 'Port info missing' });

  attributes.push({ name: 'Graphics (GPU)', score: gpu.present ? gpu.score : 40, reason: gpu.present ? 'Dedicated GPU detected' : 'Integrated or not specified' });

  return { attributes, summary: { cpu, ram, storage, gpu, battery, weight, display } };
}

function scorePurposeSpecific(specs, purpose) {
  const text = (specs.title + ' ' + specs.details + ' ' + specs.bullets).toLowerCase();
  const gpu = detectGPU(text);
  const ram = detectRAM(text) || 0;
  const cpuInfo = detectCPU(text);
  const storage = detectStorage(text);
  const display = detectDisplay(text);

  const attrs = [];

  if (purpose === 'computer-science' || purpose === 'programming' || purpose === 'cse') {
    attrs.push({ name: 'CPU for Compilation/VMs', score: cpuInfo.score, reason: `Detected ${cpuInfo.name}` });
    attrs.push({
      name: 'RAM for VMs & IDEs',
      score: ram >= 32 ? 100 : ram >= 16 ? 90 : ram >= 8 ? 60 : 30,
      reason: `${ram} GB`
    });
    attrs.push({
      name: 'Storage for projects',
      score: storage.sizeGB >= 500 ? 100 : storage.sizeGB >= 256 ? 80 : 50,
      reason: storage.sizeGB ? `${storage.sizeGB} GB` : 'Not found'
    });
    attrs.push({ name: 'Graphics (for ML/Acceleration)', score: gpu.present ? gpu.score : 30, reason: gpu.present ? 'GPU present' : 'GPU missing or integrated' });
  } else if (purpose === 'gaming') {
    attrs.push({ name: 'CPU (Gaming)', score: cpuInfo.score, reason: cpuInfo.name });
    attrs.push({ name: 'GPU (Gaming)', score: gpu.present ? gpu.score : 10, reason: gpu.present ? 'Dedicated GPU' : 'No dedicated GPU' });
    attrs.push({ name: 'RAM (Gaming)', score: ram >= 32 ? 100 : ram >= 16 ? 85 : 50, reason: `${ram} GB` });
    attrs.push({ name: 'Display Refresh', score: display.refresh ? (display.refresh >= 144 ? 100 : 80) : 50, reason: display.refresh ? `${display.refresh} Hz` : 'Not specified' });
    attrs.push({ name: 'Cooling & Build', score: 70, reason: 'Automatic check limited; please inspect thermal design' });
  } else if (purpose === 'design' || purpose === 'graphic-design' || purpose === 'media') {
    attrs.push({ name: 'CPU (Rendering)', score: cpuInfo.score, reason: cpuInfo.name });
    attrs.push({ name: 'RAM (Design)', score: ram >= 32 ? 100 : ram >= 16 ? 90 : 60, reason: `${ram} GB` });
    attrs.push({
      name: 'Storage (Large files)',
      score: storage.sizeGB >= 512 ? 100 : storage.sizeGB >= 256 ? 80 : 50,
      reason: storage.sizeGB ? `${storage.sizeGB} GB` : 'Not specified'
    });
    attrs.push({ name: 'GPU (Acceleration)', score: gpu.present ? gpu.score : 40, reason: gpu.present ? 'GPU present' : 'GPU recommended' });
    attrs.push({
      name: 'Display Color Accuracy',
      score: display.resolution && /4k|3840/i.test(display.resolution) ? 100 : display.resolution && /1920/i.test(display.resolution) ? 70 : 40,
      reason: display.resolution || 'Not specified'
    });
  } else if (purpose === 'architecture' || purpose === 'cad') {
    attrs.push({ name: 'CPU (CAD/Rendering)', score: cpuInfo.score, reason: cpuInfo.name });
    attrs.push({ name: 'RAM (CAD)', score: ram >= 32 ? 100 : ram >= 16 ? 85 : 50, reason: `${ram} GB` });
    attrs.push({
      name: 'Storage',
      score: storage.sizeGB >= 1024 ? 100 : storage.sizeGB >= 512 ? 85 : 55,
      reason: storage.sizeGB ? `${storage.sizeGB} GB` : 'Not specified'
    });
    attrs.push({ name: 'GPU (3D Accel)', score: gpu.present ? gpu.score : 30, reason: gpu.present ? 'GPU present' : 'GPU needed' });
  } else if (purpose === 'business' || purpose === 'liberal-arts') {
    attrs.push({ name: 'CPU (Office)', score: cpuInfo.score >= 75 ? 90 : 70, reason: cpuInfo.name });
    attrs.push({ name: 'RAM (Office)', score: ram >= 8 ? (ram >= 16 ? 90 : 75) : 40, reason: `${ram} GB` });
    attrs.push({ name: 'Portability & Battery', score: 80, reason: 'Prefer lightweight and long battery' });
    attrs.push({ name: 'Storage', score: storage.sizeGB >= 256 ? 80 : 50, reason: storage.sizeGB ? `${storage.sizeGB} GB` : 'Not specified' });
  } else if (purpose === 'film' || purpose === 'media-arts') {
    attrs.push({ name: 'CPU (Video Editing)', score: cpuInfo.score, reason: cpuInfo.name });
    attrs.push({ name: 'RAM (Video)', score: ram >= 32 ? 100 : ram >= 16 ? 85 : 55, reason: `${ram} GB` });
    attrs.push({
      name: 'Storage (Fast)',
      score: storage.sizeGB >= 1024 ? 100 : storage.sizeGB >= 512 ? 85 : 60,
      reason: storage.sizeGB ? `${storage.sizeGB} GB` : 'Not specified'
    });
    attrs.push({ name: 'GPU (Render Accel)', score: gpu.present ? gpu.score : 40, reason: gpu.present ? 'GPU present' : 'Recommended' });
  } else if (purpose === 'medical') {
    attrs.push({ name: 'CPU (Medical Apps)', score: cpuInfo.score >= 75 ? 85 : 60, reason: cpuInfo.name });
    attrs.push({ name: 'RAM (Medical)', score: ram >= 16 ? 85 : ram >= 8 ? 65 : 35, reason: `${ram} GB` });
    attrs.push({ name: 'Portability & Battery', score: 90, reason: 'Prefer long battery for clinical rotations' });
  } else {
    attrs.push({ name: 'General Purpose Fit', score: 70, reason: 'Fallback generic checks' });
  }

  return attrs;
}

function analyzeSpecs(specs, budget, purpose) {
  const gen = scoreGeneral(specs);
  const purposeAttrs = scorePurposeSpecific(specs, (purpose || 'general').toLowerCase());

  const attributes = [...gen.attributes, ...purposeAttrs];

  const genAvg = Math.round(gen.attributes.reduce((s, a) => s + a.score, 0) / gen.attributes.length);
  const pAvg = Math.round(purposeAttrs.reduce((s, a) => s + a.score, 0) / purposeAttrs.length);
  const overall = Math.round((genAvg * 0.6) + (pAvg * 0.4));

  let verdict = 'wait';
  if (overall >= 80) verdict = 'buy';
  else if (overall <= 45) verdict = 'no';

  const pros = [];
  const cons = [];
  gen.attributes.forEach(a => { if (a.score >= 80) pros.push(a.name); else cons.push(a.name); });
  purposeAttrs.forEach(a => { if (a.score >= 80) pros.push(a.name); else cons.push(a.name); });

  let comment = '';
  if (verdict === 'buy') comment = `🎉 Great choice! Overall score ${overall}/100. Pros: ${pros.slice(0,5).join(', ')}. This laptop meets most general and ${purpose} needs.`;
  else if (verdict === 'wait') comment = `🤔 Not bad. Overall score ${overall}/100. Pros: ${pros.slice(0,4).join(', ')}. Cons: ${cons.slice(0,4).join(', ')}. Consider checking the points mentioned or waiting for a better option.`;
  else comment = `🚫 Not recommended. Overall score ${overall}/100. Main issues: ${cons.slice(0,6).join(', ')}. You might want to increase budget or choose another model.`;

  const attributesWithReason = attributes.map(a => ({ ...a, short: `${a.score}% — ${a.reason}` }));

  return {
    overall,
    verdict,
    comment,
    attributes: attributesWithReason,
    debug: { generalSummary: gen.summary }
  };
}

module.exports = { analyzeSpecs };
