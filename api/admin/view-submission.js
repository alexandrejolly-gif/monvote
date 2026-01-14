import { supabase } from '../../lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  // Récupérer la dernière soumission
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !submissions || submissions.length === 0) {
    return res.status(200).send('<html><body><h1>Aucune soumission trouvée</h1></body></html>');
  }

  const sub = submissions[0];

  let html = '<html><head><meta charset="utf-8"><title>Dernière soumission</title>';
  html += '<style>body{font-family:sans-serif;padding:20px;max-width:1200px;margin:0 auto}';
  html += 'h1{color:#667eea}h2{color:#333;margin-top:30px}';
  html += '.box{background:#fff;border:1px solid #ddd;padding:20px;margin:20px 0;border-radius:8px}';
  html += 'pre{background:#f5f5f5;padding:15px;border-radius:5px;overflow-x:auto;white-space:pre-wrap}';
  html += 'img{max-width:100%;border:1px solid #ddd;border-radius:8px}';
  html += '.score{font-size:2rem;font-weight:bold;color:';
  html += sub.confidence_score >= 0.9 ? 'green' : sub.confidence_score >= 0.7 ? 'orange' : 'red';
  html += '}';
  html += '.status{display:inline-block;padding:8px 16px;border-radius:20px;font-weight:bold;background:';
  html += sub.status === 'auto_approved' ? '#4ade80' : sub.status === 'approved' ? '#22c55e' : sub.status === 'pending' ? '#fbbf24' : '#ef4444';
  html += ';color:white}';
  html += '</style></head><body>';

  html += '<h1>📄 Dernière soumission de tract</h1>';

  html += '<div class="box">';
  html += '<h2>Informations générales</h2>';
  html += `<p><strong>ID:</strong> ${sub.id}</p>`;
  html += `<p><strong>Commune:</strong> ${sub.commune_nom} (${sub.commune_code})</p>`;
  html += `<p><strong>Date:</strong> ${new Date(sub.created_at).toLocaleString('fr-FR')}</p>`;
  html += `<p><strong>Statut:</strong> <span class="status">${sub.status}</span></p>`;
  html += `<p><strong>Score de confiance:</strong> <span class="score">${Math.round((sub.confidence_score || 0) * 100)}%</span></p>`;
  if (sub.rejection_reason) {
    html += `<p><strong>Raison de rejet:</strong> ${sub.rejection_reason}</p>`;
  }
  html += '</div>';

  html += '<div class="box">';
  html += '<h2>🖼️ Image uploadée</h2>';
  html += `<img src="${sub.image_url}" alt="Tract">`;
  html += '</div>';

  if (sub.analysis_result) {
    html += '<div class="box">';
    html += '<h2>🔍 Résultat de l\'analyse Claude Vision</h2>';
    html += '<pre>' + JSON.stringify(sub.analysis_result, null, 2) + '</pre>';
    html += '</div>';
  }

  if (sub.validation_details) {
    html += '<div class="box">';
    html += '<h2>✅ Détails de la validation</h2>';
    html += '<pre>' + JSON.stringify(sub.validation_details, null, 2) + '</pre>';
    html += '</div>';
  }

  if (sub.extracted_data) {
    html += '<div class="box">';
    html += '<h2>📊 Données extraites</h2>';
    html += '<pre>' + JSON.stringify(sub.extracted_data, null, 2) + '</pre>';
    html += '</div>';
  }

  html += '</body></html>';

  return res.status(200).send(html);
}
