const http = require('http');
const { execSync } = require('child_process');

const PROJECTS = [
  { name: 'Thai-Blitz', repo: 'DanielIshi/thai-blitz-ai-language-coach', emoji: '🇹🇭' },
  { name: 'Icon-Selection', repo: 'DanielIshi/icon-selection-ui', emoji: '🖼️' },
  { name: 'ORCHESTRATOR', repo: 'DanielIshi/ORCHESTRATOR', emoji: '🎬' },
];

function getIssues(repo) {
  try {
    const result = execSync(
      `gh issue list --repo ${repo} --state all --limit 100 --json number,title,state,labels,createdAt,updatedAt`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return JSON.parse(result);
  } catch (e) {
    console.error(`Error fetching ${repo}:`, e.message);
    return [];
  }
}

function getPRs(repo) {
  try {
    const result = execSync(
      `gh pr list --repo ${repo} --state all --limit 20 --json number,title,state,createdAt,updatedAt`,
      { encoding: 'utf-8', timeout: 30000 }
    );
    return JSON.parse(result);
  } catch (e) {
    return [];
  }
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/api/projects') {
    const data = PROJECTS.map(p => ({
      ...p,
      issues: getIssues(p.repo),
      prs: getPRs(p.repo)
    }));
    res.end(JSON.stringify(data));
  } else if (req.url === '/health') {
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3456;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Dashboard API running on http://127.0.0.1:${PORT}`);
});
