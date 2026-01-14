import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  let html = '<html><head><meta charset="utf-8"><title>Diagnostic MonVote</title>';
  html += '<style>body{font-family:sans-serif;padding:20px;max-width:1000px;margin:0 auto}';
  html += 'h1{color:#667eea}h2{color:#333;margin-top:30px}';
  html += '.ok{color:green}-.error{color:red}.warning{color:orange}';
  html += 'pre{background:#f5f5f5;padding:15px;border-radius:5px;overflow-x:auto}';
  html += '.box{background:#fff;border:1px solid #ddd;padding:20px;margin:20px 0;border-radius:8px}';
  html += '</style></head><body>';

  html += '<h1>🔍 Diagnostic de la base de données MonVote</h1>';

  // 1. Test rate_limits
  html += '<div class="box"><h2>📊 Table rate_limits</h2>';
  try {
    const { data, error } = await supabase
      .from('rate_limits')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42703') {
        html += '<p class="error">❌ Structure incorrecte (ancienne version)</p>';
        html += '<p>La table existe mais avec les mauvaises colonnes.</p>';
      } else if (error.code === '42P01') {
        html += '<p class="error">❌ Table inexistante</p>';
      } else {
        html += `<p class="error">❌ Erreur: ${error.message}</p>`;
      }

      html += '<h3>Solution SQL:</h3>';
      html += '<pre>DROP TABLE IF EXISTS rate_limits CASCADE;\n\n';
      html += 'CREATE TABLE rate_limits (\n';
      html += '  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n';
      html += '  identifier_type VARCHAR(20) NOT NULL,\n';
      html += '  identifier_hash VARCHAR(64) NOT NULL,\n';
      html += '  action_type VARCHAR(30) NOT NULL,\n';
      html += '  count INTEGER DEFAULT 1,\n';
      html += '  window_start TIMESTAMPTZ DEFAULT NOW(),\n';
      html += '  created_at TIMESTAMPTZ DEFAULT NOW(),\n';
      html += '  updated_at TIMESTAMPTZ DEFAULT NOW(),\n';
      html += '  UNIQUE(identifier_type, identifier_hash, action_type)\n';
      html += ');\n\n';
      html += 'CREATE INDEX idx_rate_limits_lookup\n';
      html += 'ON rate_limits(identifier_type, identifier_hash, action_type);</pre>';
    } else {
      html += '<p class="ok">✅ Table OK</p>';
    }
  } catch (e) {
    html += `<p class="error">❌ Exception: ${e.message}</p>`;
  }
  html += '</div>';

  // 2. Test storage buckets
  html += '<div class="box"><h2>🪣 Storage Buckets</h2>';
  try {
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      html += `<p class="error">❌ Erreur: ${bucketsError.message}</p>`;
    } else {
      html += '<p>Buckets existants: ';
      html += buckets.map(b => b.name).join(', ') || '<em>aucun</em>';
      html += '</p>';

      const hasSubmissions = buckets.some(b => b.name === 'submissions');

      if (!hasSubmissions) {
        html += '<p class="error">❌ Bucket "submissions" manquant</p>';
        html += '<h3>Solution:</h3>';
        html += '<p><strong>Option 1 - Via l\'interface Supabase:</strong></p>';
        html += '<ol>';
        html += '<li>Allez sur votre dashboard Supabase</li>';
        html += '<li>Cliquez sur "Storage" dans le menu</li>';
        html += '<li>Cliquez sur "Create a new bucket"</li>';
        html += '<li>Nom: <code>submissions</code></li>';
        html += '<li>Cochez "Public bucket"</li>';
        html += '<li>Cliquez sur "Create bucket"</li>';
        html += '</ol>';
        html += '<p><strong>Option 2 - Via SQL:</strong></p>';
        html += '<pre>INSERT INTO storage.buckets (id, name, public)\n';
        html += 'VALUES (\'submissions\', \'submissions\', true)\n';
        html += 'ON CONFLICT (id) DO NOTHING;</pre>';
      } else {
        html += '<p class="ok">✅ Bucket "submissions" existe</p>';
      }
    }
  } catch (e) {
    html += `<p class="error">❌ Exception: ${e.message}</p>`;
  }
  html += '</div>';

  // 3. Test autres tables
  html += '<div class="box"><h2>📋 Autres tables</h2>';
  const tables = ['communes', 'candidats', 'questions', 'sessions', 'submissions'];
  html += '<ul>';
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        html += `<li class="error">${table}: ❌ ${error.message}</li>`;
      } else {
        html += `<li class="ok">${table}: ✅ OK</li>`;
      }
    } catch (e) {
      html += `<li class="error">${table}: ❌ ${e.message}</li>`;
    }
  }
  html += '</ul></div>';

  html += '<div class="box">';
  html += '<h2>📝 Instructions</h2>';
  html += '<ol>';
  html += '<li>Allez sur votre <a href="https://supabase.com/dashboard" target="_blank">dashboard Supabase</a></li>';
  html += '<li>Sélectionnez votre projet</li>';
  html += '<li>Pour les requêtes SQL: allez dans <strong>SQL Editor</strong></li>';
  html += '<li>Pour le bucket: allez dans <strong>Storage</strong></li>';
  html += '<li>Après avoir fait les modifications, actualisez cette page pour vérifier</li>';
  html += '</ol>';
  html += '</div>';

  html += '</body></html>';

  return res.status(200).send(html);
}
