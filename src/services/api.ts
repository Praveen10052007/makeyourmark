import { AIProviderId, AIProviderInfo, AISettings, CareerRoadmapPlan, StudyNoteCategory } from '../types';

export interface ServerHealth {
  status: string;
  app: string;
  hasApiKey: boolean;
  providers?: AIProviderInfo[];
  youtubeConfigured?: boolean;
  liveJobsConfigured?: boolean;
  firebaseConfigured?: boolean;
  environment: string;
  timestamp: string;
}

export interface InterviewQuestionResponse {
  question: string;
  category: string;
  keyAspectsToLookFor: string[];
}

export interface InterviewEvaluationResponse {
  score: number;
  grade: string;
  correctPoints?: string[];
  missingInformation?: string[];
  mistakes?: string[];
  strengths: string[];
  areasForImprovement: string[];
  constructiveFeedback?: string;
  idealAnswerSummary: string;
}

export interface ResumeAnalysisResponse {
  atsScore: number;
  disclaimer?: string;
  summary: string;
  grammarAndReadability?: string;
  formattingFeedback?: string;
  sectionChecks?: {
    contactInfo: boolean;
    summary: boolean;
    skills: boolean;
    education: boolean;
    projects: boolean;
    experience: boolean;
  };
  missingSections?: string[];
  strengths: string[];
  improvements: string[];
  missingKeywords: string[];
  jdMatchAnalysis?: {
    provided: boolean;
    matchedKeywords: string[];
    missingFromJd: string[];
    relevanceNote: string;
  };
  bulletRewrites: {
    original: string;
    improved: string;
    reason: string;
  }[];
}

function getStoredAISettings(): Partial<AISettings> {
  try {
    const raw = localStorage.getItem('mym_ai_settings');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

async function handleFetch(url: string, options: RequestInit = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 503 && data.setupRequired) {
        throw new Error(data.error || 'AI provider API key is not configured on the server.');
      }
      throw new Error(data.error || `Server returned ${res.status}: ${res.statusText}`);
    }

    return data;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Check your internet connection or server status.');
    }
    throw error;
  }
}

export async function checkServerHealth(): Promise<ServerHealth> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch {
    return {
      status: 'offline-mode',
      app: 'MakeYourMark',
      hasApiKey: false,
      environment: 'client',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function fetchAIProviders(): Promise<{
  providers: AIProviderInfo[];
  defaultProvider: AIProviderId;
}> {
  return await handleFetch('/api/ai/providers', { method: 'GET' });
}

export interface AITutorParams {
  topic: string;
  subject?: string;
  mode?: string;
  skillLevel?: string;
  language?: 'en' | 'ta';
  dataSaver?: boolean;
  responseStyle?: 'concise' | 'balanced' | 'comprehensive';
  documentContext?: string;
  conversationHistory?: { role: 'user' | 'model'; content: string }[];
  provider?: AIProviderId;
  model?: string;
  allowFallback?: boolean;
}

export interface AITutorResult {
  result: string;
  providerUsed: AIProviderId;
  modelUsed: string;
  fallbackFrom?: string;
}

export async function requestAITutor(
  paramsOrTopic: string | AITutorParams,
  mode?: string,
  skillLevel?: string,
  language?: 'en' | 'ta',
  dataSaver?: boolean
): Promise<string> {
  const res = await requestAITutorDetailed(paramsOrTopic, mode, skillLevel, language, dataSaver);
  return res.result;
}

export async function requestAITutorDetailed(
  paramsOrTopic: string | AITutorParams,
  mode?: string,
  skillLevel?: string,
  language?: 'en' | 'ta',
  dataSaver?: boolean
): Promise<AITutorResult> {
  const aiPrefs = getStoredAISettings();
  const baseBody =
    typeof paramsOrTopic === 'string'
      ? {
          topic: paramsOrTopic,
          mode: mode || 'simple-explanation',
          skillLevel: skillLevel || aiPrefs.difficulty || 'intermediate',
          language: language || 'en',
          dataSaver: !!dataSaver,
        }
      : paramsOrTopic;

  return await handleFetch('/api/ai/tutor', {
    method: 'POST',
    body: JSON.stringify({
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      responseStyle: aiPrefs.responseStyle || 'balanced',
      allowFallback: aiPrefs.allowFallback !== false,
      ...baseBody,
    }),
  });
}

export interface AIChatParams {
  messages: { role: 'user' | 'model'; content: string }[];
  mode?: 'study' | 'career' | 'resume' | 'interview';
  language?: 'en' | 'ta';
  dataSaver?: boolean;
  userContext?: any;
  websiteUrl?: string;
  documentSnippet?: string;
  provider?: AIProviderId;
  model?: string;
  allowFallback?: boolean;
}

export interface AIChatResult {
  reply: string;
  providerUsed?: AIProviderId;
  modelUsed?: string;
  fallbackFrom?: string;
  websiteFetchInfo?: {
    url: string;
    status: 'fetched' | 'failed';
    title?: string;
    message: string;
  } | null;
}

export async function requestAIChat(
  paramsOrMessages: { role: 'user' | 'model'; content: string }[] | AIChatParams,
  language?: 'en' | 'ta',
  dataSaver?: boolean
): Promise<string> {
  const res = await requestAIChatDetailed(paramsOrMessages, language, dataSaver);
  return res.reply;
}

export async function requestAIChatDetailed(
  paramsOrMessages: { role: 'user' | 'model'; content: string }[] | AIChatParams,
  language?: 'en' | 'ta',
  dataSaver?: boolean
): Promise<AIChatResult> {
  const aiPrefs = getStoredAISettings();
  const baseBody = Array.isArray(paramsOrMessages)
    ? {
        messages: paramsOrMessages,
        language: language || 'en',
        dataSaver: !!dataSaver,
      }
    : paramsOrMessages;

  return await handleFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
      ...baseBody,
    }),
  });
}

export async function generateInterviewQuestion(
  role: string,
  difficulty: string,
  category?: string,
  previousQuestions?: string[]
): Promise<InterviewQuestionResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/interview', {
    method: 'POST',
    body: JSON.stringify({
      action: 'generate-question',
      role,
      difficulty,
      category,
      previousQuestions,
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
    }),
  });
}

export async function evaluateInterviewAnswer(
  role: string,
  difficulty: string,
  previousQuestion: string,
  userAnswer: string,
  category?: string
): Promise<InterviewEvaluationResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/interview', {
    method: 'POST',
    body: JSON.stringify({
      action: 'evaluate-answer',
      role,
      difficulty,
      category,
      previousQuestion,
      userAnswer,
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
    }),
  });
}

export async function generateInterviewScorecard(params: {
  role: string;
  difficulty: string;
  interviewHistory: {
    question: string;
    answer: string;
    score: number;
    grade: string;
    category?: string;
  }[];
}): Promise<any> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/interview', {
    method: 'POST',
    body: JSON.stringify({
      action: 'generate-scorecard',
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
      ...params,
    }),
  });
}

export async function requestSkillGapAnalysis(params: {
  careerGoal: string;
  targetCompany?: string;
  education?: string;
  department?: string;
  yearOfStudy?: string;
  currentSkills?: string[];
  skillProficiencies?: Record<string, string>;
  projects?: string;
  internships?: string;
  certifications?: string;
  dailyStudyHours?: number;
  targetDate?: string;
  preferredLearningMethods?: string;
}): Promise<any> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/skill-gap', {
    method: 'POST',
    body: JSON.stringify({
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
      ...params,
    }),
  });
}

export async function generateDynamicCareerRoadmap(params: {
  careerGoal: string;
  careerCategory: string;
  currentSkills?: string[];
  experienceLevel?: string;
  dailyStudyHours?: number;
  targetMonths?: number;
  language?: 'en' | 'ta';
}): Promise<CareerRoadmapPlan> {
  const aiPrefs = getStoredAISettings();
  const res = await handleFetch('/api/ai/roadmap-generate', {
    method: 'POST',
    body: JSON.stringify({
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
      ...params,
    }),
  });
  return {
    id: `roadmap_${Date.now()}`,
    ...res,
    updatedAt: new Date().toISOString(),
  };
}

export async function requestAINoteGeneration(params: {
  action: 'generate-from-topic' | 'generate-from-skill' | 'summarize-material' | 'revision-from-explanation' | 'interview-prep-notes';
  topic?: string;
  sourceMaterial?: string;
  category: StudyNoteCategory;
  skillName?: string;
  language?: 'en' | 'ta';
}): Promise<{
  title: string;
  content: string;
  suggestedTags: string[];
  category: StudyNoteCategory;
  providerUsed: AIProviderId;
  modelUsed: string;
}> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/notes', {
    method: 'POST',
    body: JSON.stringify({
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
      ...params,
    }),
  });
}

export async function analyzeResume(
  resumeText: string,
  targetRole: string,
  jobDescription?: string
): Promise<ResumeAnalysisResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/resume-analyze', {
    method: 'POST',
    body: JSON.stringify({
      resumeText,
      targetRole,
      jobDescription,
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
    }),
  });
}

export interface SummaryCoachResponse {
  teachingTip: string;
  options: { title: string; text: string }[];
}

export interface BulletCoachResponse {
  teachingTip: string;
  bullets: string[];
}

export interface SkillCoachResponse {
  teachingTip: string;
  categories: { category: string; skills: string[] }[];
}

export async function coachResumeSummary(targetRole: string, inputData: string): Promise<SummaryCoachResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/resume-coach', {
    method: 'POST',
    body: JSON.stringify({
      action: 'generate-summary',
      targetRole,
      inputData,
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
    }),
  });
}

export async function coachResumeBullets(targetRole: string, inputData: string): Promise<BulletCoachResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/resume-coach', {
    method: 'POST',
    body: JSON.stringify({
      action: 'generate-bullets',
      targetRole,
      inputData,
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
    }),
  });
}

export async function coachResumeSkills(targetRole: string): Promise<SkillCoachResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/resume-coach', {
    method: 'POST',
    body: JSON.stringify({
      action: 'suggest-skills',
      targetRole,
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
    }),
  });
}

export interface PersonalizedRoadmapResponse {
  summary: string;
  estimatedMonths: number;
  milestones: {
    step: number;
    title: string;
    timeframe: string;
    skillsToMaster: string[];
    projectToBuild: string;
    recommendedAction: string;
  }[];
}

export async function generatePersonalizedRoadmap(profileData: {
  targetRole: string;
  currentSkills: string[];
  learningSkills: string[];
  degree?: string;
  targetCompanies?: string[];
}): Promise<PersonalizedRoadmapResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/personalized-roadmap', {
    method: 'POST',
    body: JSON.stringify({
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
      ...profileData,
    }),
  });
}

export interface LinkedInAssistResponse {
  headlines?: string[];
  about?: string;
  message?: string;
  tip: string;
  keyHighlights?: string[];
  alternativeSubject?: string;
}

export async function requestLinkedInAssist(
  action: 'headline' | 'about' | 'outreach',
  targetRole: string,
  studentDetails: string
): Promise<LinkedInAssistResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/linkedin-assist', {
    method: 'POST',
    body: JSON.stringify({
      action,
      targetRole,
      studentDetails,
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
    }),
  });
}

export interface GeneratedWeeklySprintResponse {
  weeklyGoal: string;
  recommendedHours: number;
  motivationalQuote: string;
  tasks: {
    dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    title: string;
    category: 'Coding & DSA' | 'Interview Prep' | 'Resume & LinkedIn' | 'Projects' | 'Core CS & System Design';
    priority: 'High' | 'Medium' | 'Low';
    estimatedMinutes: number;
    notes: string;
  }[];
}

export async function generateAIWeeklySprint(params: {
  targetRole: string;
  currentSkills: string[];
  weeklyTargetHours?: number;
}): Promise<GeneratedWeeklySprintResponse> {
  const aiPrefs = getStoredAISettings();
  return await handleFetch('/api/ai/weekly-tasks', {
    method: 'POST',
    body: JSON.stringify({
      provider: aiPrefs.provider,
      model: aiPrefs.model,
      allowFallback: aiPrefs.allowFallback !== false,
      ...params,
    }),
  });
}

export interface YouTubeSearchVideo {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  thumbnail: string;
  description: string;
  publishedAt: string;
  watchUrl: string;
}

export async function searchYouTubeVideos(queryText: string): Promise<{
  liveApi: boolean;
  query: string;
  youtubeSearchUrl: string;
  videos: YouTubeSearchVideo[];
  message?: string;
}> {
  return await handleFetch(`/api/videos/search?q=${encodeURIComponent(queryText)}`, { method: 'GET' });
}

// Local Salted Auth API helpers
export async function checkLocalServerSession(): Promise<{
  authenticated: boolean;
  user?: { uid: string; email: string; name: string };
}> {
  return await handleFetch('/api/auth/session', { method: 'GET' });
}

export async function registerLocalAccount(params: {
  name: string;
  email: string;
  password: string;
}): Promise<{
  user: { uid: string; name: string; email: string };
  recoveryCode: string;
}> {
  return await handleFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function loginLocalAccount(params: {
  email: string;
  password: string;
}): Promise<{ user: { uid: string; name: string; email: string } }> {
  return await handleFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function resetLocalAccountPassword(params: {
  email: string;
  recoveryCode: string;
  newPassword: string;
}): Promise<{ success: boolean; newRecoveryCode: string }> {
  return await handleFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function logoutLocalAccount(): Promise<void> {
  await handleFetch('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
}

export async function deleteLocalAccountServer(): Promise<void> {
  await handleFetch('/api/auth/delete-account', { method: 'POST', body: JSON.stringify({}) });
}
