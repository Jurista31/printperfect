import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch learning data: community-wide (service role) + personal (user-scoped)
    const [corrections, missedDefects, sharedAnalyses, allVotes, myCorrections, myMissedDefects, myFeedback] = await Promise.all([
      base44.asServiceRole.entities.DefectCorrection.list('-created_date', 200),
      base44.asServiceRole.entities.MissedDefect.list('-created_date', 200),
      base44.asServiceRole.entities.SharedAnalysis.list('-created_date', 100),
      base44.asServiceRole.entities.SolutionVote.list('-created_date', 500),
      base44.entities.DefectCorrection.list('-created_date', 100),
      base44.entities.MissedDefect.list('-created_date', 100),
      base44.entities.AnalysisFeedback.list('-created_date', 50)
    ]);

    // Build learned patterns
    const learnedPatterns = {
      commonFalsePositives: [],
      commonMissedDefects: [],
      highConfidenceDefects: [],
      effectiveSolutions: {},
      defectFrequency: {}
    };

    // Analyze corrections for false positives
    const falsePositiveMap = {};
    corrections.forEach(c => {
      if (c.is_false_positive) {
        const defectName = c.original_name.toLowerCase();
        falsePositiveMap[defectName] = (falsePositiveMap[defectName] || 0) + 1;
      }
    });
    learnedPatterns.commonFalsePositives = Object.entries(falsePositiveMap)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([defect, count]) => `${defect} (${count} false positives)`);

    // Analyze missed defects
    const missedMap = {};
    missedDefects.forEach(m => {
      const defectName = m.defect_name.toLowerCase();
      missedMap[defectName] = (missedMap[defectName] || 0) + 1;
    });
    learnedPatterns.commonMissedDefects = Object.entries(missedMap)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([defect, count]) => `${defect} (missed ${count} times)`);

    // Analyze high-confidence corrections (certain + not false positive)
    const highConfMap = {};
    corrections.forEach(c => {
      if (!c.is_false_positive && c.confidence === 'certain') {
        const defectName = (c.corrected_name || c.original_name).toLowerCase();
        highConfMap[defectName] = (highConfMap[defectName] || 0) + 1;
      }
    });
    learnedPatterns.highConfidenceDefects = Object.entries(highConfMap)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([defect, count]) => defect);

    // Calculate defect frequency across all data
    const freqMap = {};
    corrections.forEach(c => {
      const name = (c.corrected_name || c.original_name).toLowerCase();
      freqMap[name] = (freqMap[name] || 0) + 1;
    });
    missedDefects.forEach(m => {
      const name = m.defect_name.toLowerCase();
      freqMap[name] = (freqMap[name] || 0) + 1;
    });
    sharedAnalyses.forEach(a => {
      if (a.defects) {
        a.defects.forEach(d => {
          const name = d.name.toLowerCase();
          freqMap[name] = (freqMap[name] || 0) + 1;
        });
      }
    });
    learnedPatterns.defectFrequency = Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

    // Analyze effective solutions from community
    const solutionEffectiveness = {};
    sharedAnalyses.forEach(analysis => {
      if (analysis.solutions_applied && analysis.status === 'successful') {
        analysis.solutions_applied.forEach(solution => {
          const votes = allVotes.filter(v => 
            v.shared_analysis_id === analysis.id &&
            v.solution_text === solution &&
            v.vote_type === 'helpful'
          ).length;

          const key = solution.toLowerCase().substring(0, 100);
          if (!solutionEffectiveness[key] || votes > solutionEffectiveness[key].votes) {
            solutionEffectiveness[key] = {
              solution: solution,
              votes,
              defects: analysis.defects?.map(d => d.name) || []
            };
          }
        });
      }
    });
    learnedPatterns.effectiveSolutions = Object.values(solutionEffectiveness)
      .filter(s => s.votes >= 2)
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10);

    // --- PERSONAL LEARNING ---
    const personalFalsePositives = {};
    const personalMissed = {};
    const personalSeverityCorrections = [];
    const personalLowRatedDefects = {};

    myCorrections.forEach(c => {
      if (c.is_false_positive) {
        const name = c.original_name.toLowerCase();
        personalFalsePositives[name] = (personalFalsePositives[name] || 0) + 1;
      }
      if (c.corrected_severity && c.original_severity && c.corrected_severity !== c.original_severity) {
        personalSeverityCorrections.push(
          `"${c.original_name}": AI said ${c.original_severity}, you corrected to ${c.corrected_severity}`
        );
      }
    });

    myMissedDefects.forEach(m => {
      const name = m.defect_name.toLowerCase();
      personalMissed[name] = (personalMissed[name] || 0) + 1;
    });

    // Low-rated analyses — which defect types appeared in analyses rated 1-2 stars
    myFeedback.filter(f => f.rating <= 2).forEach(f => {
      if (f.false_positives) {
        f.false_positives.forEach(fp => {
          const name = fp.toLowerCase();
          personalLowRatedDefects[name] = (personalLowRatedDefects[name] || 0) + 1;
        });
      }
    });

    const hasPersonalData = myCorrections.length > 0 || myMissedDefects.length > 0;

    const personalSection = hasPersonalData ? `
**YOUR PERSONAL CORRECTION HISTORY (${myCorrections.length} corrections, ${myMissedDefects.length} missed defects reported):**

${Object.keys(personalFalsePositives).length > 0 ? `🚫 YOU'VE MARKED THESE AS FALSE POSITIVES ON YOUR PRINTS:
${Object.entries(personalFalsePositives).map(([d, c]) => `- ${d} (${c}x)`).join('\n')}
→ Be VERY cautious about flagging these unless you're certain.` : ''}

${Object.keys(personalMissed).length > 0 ? `🔍 DEFECTS YOU'VE CAUGHT THAT AI MISSED ON YOUR PRINTS:
${Object.entries(personalMissed).sort((a,b) => b[1]-a[1]).map(([d, c]) => `- ${d} (${c}x)`).join('\n')}
→ Look EXTRA carefully for these in this analysis.` : ''}

${personalSeverityCorrections.length > 0 ? `⚖️ YOUR SEVERITY CORRECTIONS (you tend to rate differently than AI):
${personalSeverityCorrections.slice(0, 5).join('\n')}
→ Calibrate severity accordingly for your prints.` : ''}

Apply this personal history to give a more accurate analysis tailored to your specific printing patterns.
` : '';

    // Build enhanced prompt additions
    const enhancedSection = `
**LEARNED PATTERNS FROM COMMUNITY DATA:**

Based on ${corrections.length + missedDefects.length} user corrections and ${sharedAnalyses.length} community posts:

${learnedPatterns.commonFalsePositives.length > 0 ? `
⚠️ AVOID FALSE POSITIVES - Users commonly corrected these as wrong:
${learnedPatterns.commonFalsePositives.map(fp => `- ${fp}`).join('\n')}
Be EXTRA careful when identifying these defects.
` : ''}

${learnedPatterns.commonMissedDefects.length > 0 ? `
🔍 WATCH FOR COMMONLY MISSED DEFECTS:
${learnedPatterns.commonMissedDefects.map(md => `- ${md}`).join('\n')}
These are frequently missed by initial analysis - look carefully for them.
` : ''}

${learnedPatterns.highConfidenceDefects.length > 0 ? `
✅ HIGH-CONFIDENCE DEFECTS (frequently confirmed by users):
${learnedPatterns.highConfidenceDefects.map(d => `- ${d}`).join('\n')}
` : ''}

📊 DEFECT FREQUENCY IN COMMUNITY (most common to least):
${Object.entries(learnedPatterns.defectFrequency).slice(0, 10).map(([d, count]) => 
  `- ${d}: ${count} occurrences`
).join('\n')}

${learnedPatterns.effectiveSolutions.length > 0 ? `
💡 TOP COMMUNITY-VALIDATED SOLUTIONS:
${learnedPatterns.effectiveSolutions.map(s => 
  `- "${s.solution}" (${s.votes} upvotes) - Used for: ${s.defects.slice(0, 2).join(', ')}`
).join('\n')}

When you identify similar defects, prioritize suggesting these validated solutions.
` : ''}

**APPLY THIS LEARNING:** Use these patterns to improve accuracy. Avoid false positives, watch for missed defects, and suggest community-validated solutions when relevant.
`;

    const fullEnhancedSection = personalSection + enhancedSection;

    return Response.json({
      enhancedSection: fullEnhancedSection,
      stats: {
        totalCorrections: corrections.length,
        totalMissedDefects: missedDefects.length,
        totalCommunityPosts: sharedAnalyses.length,
        totalVotes: allVotes.length,
        falsePositivesIdentified: learnedPatterns.commonFalsePositives.length,
        missedDefectsIdentified: learnedPatterns.commonMissedDefects.length,
        personalCorrections: myCorrections.length,
        personalMissedDefects: myMissedDefects.length
      },
      learnedPatterns
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});