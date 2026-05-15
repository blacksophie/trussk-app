import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateCandidateAnalysis(candidateName: string, jobDescription: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        You are a specialized heavy civil construction recruiter for Strata Civil. 
        Analyze why ${candidateName} is a fit for the following job description:
        "${jobDescription}"
        
        Style Guide:
        - Start with their specific experience relevance.
        - Mention their background with self-performing contractors and FDOT if applicable.
        - Mention their success in Florida/location proximity.
        - End with their potential contribution to the project.
        - Keep it professional, encouraging, and authoritative.
        
        Example Style:
        "Jack's extensive experience in structures, bridges, and marine construction, particularly within the FDOT framework, aligns well with the requirements outlined in the Senior Superintendent role. His background with self-performing contractors and proven success in Florida, particularly in the Manatee County area, make him a strong candidate to contribute to the success of our projects."
        
        Provide a 2-3 sentence analysis of ${candidateName}.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      if (error?.status === 429 && i < retries - 1) {
        const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Rate limit hit. Retrying in ${Math.round(waitTime)}ms...`);
        await delay(waitTime);
        continue;
      }
      console.error("Analysis generation failed:", error);
      break;
    }
  }
  return null; // Return null so we can fall back to fitNotes in the component
}
