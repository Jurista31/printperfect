import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { defectType, limit = 10 } = await req.json();

    // Fetch all shared analyses with solutions
    const sharedAnalyses = await base44.entities.SharedAnalysis.list('-created_date', 200);
    
    // Fetch all solution votes
    const allVotes = await base44.entities.SolutionVote.list('-created_date', 1000);

    // Build solution effectiveness map
    const solutionScores = {};

    sharedAnalyses.forEach(analysis => {
      if (!analysis.solutions_applied || analysis.solutions_applied.length === 0) return;
      
      // Check if this analysis has the defect type we're looking for
      const hasRelevantDefect = defectType 
        ? analysis.defects?.some(d => 
            d.name?.toLowerCase().includes(defectType.toLowerCase())
          )
        : true;

      if (!hasRelevantDefect) return;

      analysis.solutions_applied.forEach(solution => {
        if (!solutionScores[solution]) {
          solutionScores[solution] = {
            solution,
            upvotes: 0,
            appearances: 0,
            analyses: [],
            successRate: 0
          };
        }

        solutionScores[solution].appearances++;
        solutionScores[solution].analyses.push({
          id: analysis.id,
          status: analysis.status,
          title: analysis.title
        });

        // Count upvotes for this solution
        const votes = allVotes.filter(v => 
          v.shared_analysis_id === analysis.id && 
          v.solution_text === solution &&
          v.vote_type === 'helpful'
        );
        solutionScores[solution].upvotes += votes.length;

        // Boost score if the print was successful
        if (analysis.status === 'successful') {
          solutionScores[solution].successRate += 1;
        }
      });
    });

    // Calculate final scores and rank
    const rankedSolutions = Object.values(solutionScores)
      .map(s => ({
        ...s,
        successRate: s.appearances > 0 ? s.successRate / s.appearances : 0,
        effectivenessScore: (s.upvotes * 3) + (s.successRate * s.appearances * 2) + s.appearances
      }))
      .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
      .slice(0, limit);

    return Response.json({
      solutions: rankedSolutions,
      totalAnalyzed: sharedAnalyses.length,
      defectType: defectType || 'all'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});