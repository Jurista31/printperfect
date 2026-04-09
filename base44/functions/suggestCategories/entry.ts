import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { defectName, defectDescription } = await req.json();
    
    if (!defectName) {
      return Response.json({ error: 'Defect name is required' }, { status: 400 });
    }

    // Fetch historical data to learn patterns
    const [corrections, missedDefects] = await Promise.all([
      base44.entities.DefectCorrection.list('-created_date', 300),
      base44.entities.MissedDefect.list('-created_date', 300)
    ]);

    // Build category frequency map from historical data
    const categoryFrequency = {};
    
    corrections.forEach(c => {
      if (c.categories && Array.isArray(c.categories)) {
        c.categories.forEach(cat => {
          const key = `${c.corrected_name || c.original_name}|${cat}`.toLowerCase();
          categoryFrequency[key] = (categoryFrequency[key] || 0) + 1;
        });
      }
    });

    missedDefects.forEach(m => {
      if (m.categories && Array.isArray(m.categories)) {
        m.categories.forEach(cat => {
          const key = `${m.defect_name}|${cat}`.toLowerCase();
          categoryFrequency[key] = (categoryFrequency[key] || 0) + 1;
        });
      }
    });

    // Analyze the new defect and suggest categories
    const suggestedCategories = analyzeSimilarity(
      defectName,
      defectDescription,
      categoryFrequency,
      [...corrections, ...missedDefects]
    );

    return Response.json({
      suggestedCategories,
      confidence: suggestedCategories.length > 0 ? 'high' : 'low'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function analyzeSimilarity(defectName, defectDescription, categoryFrequency, historicalData) {
  const allCategories = {
    'Extrusion Issues': 0,
    'Layer Problems': 0,
    'Surface Quality': 0,
    'Temperature-Related': 0,
    'Bed Adhesion': 0,
    'Mechanical Issues': 0,
    'Material Issues': 0,
    'Support Problems': 0,
    'Dimensional Accuracy': 0,
    'Flow Issues': 0
  };

  const searchTerms = (defectName + ' ' + (defectDescription || ''))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  // Keyword-based category matching
  const categoryKeywords = {
    'Extrusion Issues': ['extrusion', 'under', 'over', 'flow', 'filament', 'nozzle', 'clog'],
    'Layer Problems': ['layer', 'shift', 'separation', 'delamination', 'adhesion', 'bonding'],
    'Surface Quality': ['surface', 'finish', 'rough', 'smooth', 'texture', 'line', 'blob', 'artifact'],
    'Temperature-Related': ['temperature', 'temp', 'heat', 'cooling', 'warping', 'curl'],
    'Bed Adhesion': ['bed', 'adhesion', 'stick', 'warping', 'lift', 'corner', 'first layer'],
    'Mechanical Issues': ['mechanical', 'belt', 'wobble', 'vibration', 'loose', 'binding'],
    'Material Issues': ['material', 'filament', 'moisture', 'quality', 'brittle', 'color'],
    'Support Problems': ['support', 'overhang', 'bridge', 'sagging', 'drooping'],
    'Dimensional Accuracy': ['dimension', 'size', 'tolerance', 'fit', 'accuracy', 'measurement'],
    'Flow Issues': ['flow', 'inconsistent', 'variation', 'fluctuation', 'extrusion']
  };

  // Score each category
  Object.keys(categoryKeywords).forEach(category => {
    const keywords = categoryKeywords[category];
    let score = 0;
    
    searchTerms.forEach(term => {
      keywords.forEach(keyword => {
        if (term.includes(keyword) || keyword.includes(term)) {
          score += 3;
        }
      });
    });

    // Boost score based on historical frequency
    Object.keys(categoryFrequency).forEach(key => {
      if (key.toLowerCase().includes(defectName.toLowerCase())) {
        const [, cat] = key.split('|');
        if (cat === category.toLowerCase()) {
          score += categoryFrequency[key] * 2;
        }
      }
    });

    allCategories[category] = score;
  });

  // Return top 3 categories
  return Object.entries(allCategories)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, score]) => ({
      category,
      confidence: score > 10 ? 'high' : score > 5 ? 'medium' : 'low'
    }));
}