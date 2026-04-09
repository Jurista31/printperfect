import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all defect corrections and missed defects for pattern analysis
    const [corrections, missedDefects] = await Promise.all([
      base44.entities.DefectCorrection.list('-created_date', 500),
      base44.entities.MissedDefect.list('-created_date', 500)
    ]);

    // Build defect vocabulary from corrections and missed defects
    const defectNames = [
      ...corrections.map(c => c.corrected_name || c.original_name),
      ...missedDefects.map(m => m.defect_name)
    ].filter(Boolean);

    // Extract keywords and build similarity matrix
    const keywords = extractKeywords(defectNames);
    const clusters = clusterDefects(defectNames, keywords);

    return Response.json({
      clusters,
      totalDefects: defectNames.length,
      uniqueDefects: new Set(defectNames).size,
      keywords
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function extractKeywords(defectNames) {
  const wordFrequency = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  
  defectNames.forEach(name => {
    const words = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
    
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });
  });

  // Return top keywords sorted by frequency
  return Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, freq]) => ({ word, frequency: freq }));
}

function clusterDefects(defectNames, keywords) {
  const keywordSet = new Set(keywords.map(k => k.word));
  
  // Group defects by shared keywords
  const clusters = {};
  
  defectNames.forEach(name => {
    const words = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => keywordSet.has(w));
    
    if (words.length === 0) return;
    
    // Use most significant keyword as cluster key
    const clusterKey = words[0];
    
    if (!clusters[clusterKey]) {
      clusters[clusterKey] = {
        keyword: clusterKey,
        defects: [],
        count: 0
      };
    }
    
    clusters[clusterKey].defects.push(name);
    clusters[clusterKey].count++;
  });

  // Convert to array and sort by count
  return Object.values(clusters)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map(cluster => ({
      ...cluster,
      defects: [...new Set(cluster.defects)].slice(0, 10) // Unique defects, max 10 per cluster
    }));
}