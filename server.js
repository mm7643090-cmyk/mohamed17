const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const app = express();
const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { cities: [], places: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  // حاول عمل commit محلي لملف البيانات حتى تبقى التغييرات محفوظة في المستودع
  try {
    const timestamp = new Date().toISOString();
    const filename = path.basename(DATA_FILE);
    execSync(`git add ${filename} && git commit -m "persist ${filename} @ ${timestamp}"`, { cwd: __dirname });
  } catch (err) {
    console.warn('Git commit failed (non-fatal):', err.message);
  }
  // حاول دفع التغييرات إلى الريموت إذا كان توكن GitHub متوفر
  try {
    const repo = process.env.GITHUB_REPOSITORY; // owner/repo
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_CODESPACE_TOKEN;
    if (repo && token) {
      const remoteUrl = `https://${token}@github.com/${repo}.git`;
      // دفع الفرع الحالي إلى main
      execSync(`git push ${remoteUrl} HEAD:main`, { cwd: __dirname, stdio: 'ignore' });
    }
  } catch (err) {
    console.warn('Git push failed (non-fatal):', err.message);
  }
}

app.get('/api/data', (req, res) => {
  const data = readData();
  res.json(data);
});

app.post('/api/data', (req, res) => {
  const newData = req.body;
  if (!newData || typeof newData !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const currentData = readData();
  const merged = {
    cities: Array.isArray(newData.cities) ? newData.cities : currentData.cities,
    places: Array.isArray(newData.places) ? newData.places : currentData.places,
  };

  writeData(merged);
  res.json(merged);
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
