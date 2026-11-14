import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  RotateCcw,
  AlertCircle,
  FileCheck,
  TrendingUp,
  ChevronRight,
  Smartphone,
  Sliders,
  XCircle,
} from 'lucide-react';
import {
  generateInterviewQuestion,
  evaluateInterviewAnswer,
  generateInterviewScorecard,
  InterviewQuestionResponse,
  InterviewEvaluationResponse,
} from '../../services/api';
import { InterviewScorecard, UserProfile } from '../../types';
import { DevicePermissionsModal } from '../DevicePermissionsModal';

interface Props {
  userProfile?: UserProfile;
  onScoreRecorded?: (score: number) => void;
}

interface CompletedTurn {
  question: string;
  category: string;
  answer: string;
  evaluation: InterviewEvaluationResponse;
}

export const AIInterviewerView: React.FC<Props> = ({ userProfile, onScoreRecorded }) => {
  const [role, setRole] = useState(userProfile?.careerGoals?.dreamJob || 'Software Developer');
  const [customRole, setCustomRole] = useState('');
  const [difficulty, setDifficulty] = useState('Entry-Level (0-2 Yrs)');
  const [interviewType, setInterviewType] = useState<'Technical' | 'HR' | 'Aptitude' | 'Behavioral' | 'Coding' | 'Mixed'>('Technical');
  const [questionCountTarget, setQuestionCountTarget] = useState<3 | 5 | 8>(5);

  const [questionData, setQuestionData] = useState<InterviewQuestionResponse | null>(null);
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingScorecard, setGeneratingScorecard] = useState(false);

  const [currentEvaluation, setCurrentEvaluation] = useState<InterviewEvaluationResponse | null>(null);
  const [completedTurns, setCompletedTurns] = useState<CompletedTurn[]>([]);
  const [sessionScorecard, setSessionScorecard] = useState<InterviewScorecard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const roles = [
    'Software Developer',
    'Full-Stack Engineer',
    'AI / ML Engineer',
    'Data Analyst',
    'Cybersecurity Analyst',
    'DevOps & Cloud Engineer',
    'Product Manager',
    'Custom Target Role',
  ];

  const difficulties = ['College Fresher / Intern', 'Entry-Level (0-2 Yrs)', 'Mid-Level Engineer', 'Senior Architect'];
  const interviewTypes: ('Technical' | 'HR' | 'Aptitude' | 'Behavioral' | 'Coding' | 'Mixed')[] = [
    'Technical',
    'HR',
    'Aptitude',
    'Behavioral',
    'Coding',
    'Mixed',
  ];

  const effectiveRole = role === 'Custom Target Role' ? customRole.trim() || 'Software Developer' : role;

  const handleStartQuestion = async () => {
    setGenerating(true);
    setError(null);
    setCurrentEvaluation(null);
    setUserAnswer('');

    try {
      const data = await generateInterviewQuestion(effectiveRole, difficulty, interviewType, askedQuestions);
      setQuestionData(data);
      setAskedQuestions((prev) => [...prev, data.question]);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate interview question. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSpeechToggle = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser. Type your response below.');
      return;
    }
    if (isListening) {
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        setIsListening(false);
        setError(`Speech input notice: ${event?.error || 'Check microphone permission'}.`);
      };
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setUserAnswer((prev) => (prev ? `${prev} ${currentTranscript}` : currentTranscript));
      };
      recognition.start();
    } catch {
      setIsListening(false);
      setError('Could not access microphone.');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!questionData || !userAnswer.trim()) return;
    setEvaluating(true);
    setError(null);

    try {
      const evalResult = await evaluateInterviewAnswer(
        effectiveRole,
        difficulty,
        questionData.question,
        userAnswer.trim(),
        interviewType
      );
      setCurrentEvaluation(evalResult);

      const turn: CompletedTurn = {
        question: questionData.question,
        category: questionData.category,
        answer: userAnswer.trim(),
        evaluation: evalResult,
      };
      setCompletedTurns((prev) => [...prev, turn]);

      if (onScoreRecorded && evalResult.score) {
        onScoreRecorded(evalResult.score);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to evaluate interview answer.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleFinishSession = async () => {
    if (completedTurns.length === 0) return;
    setGeneratingScorecard(true);
    setError(null);
    try {
      const scorecard = await generateInterviewScorecard({
        role: effectiveRole,
        difficulty,
        interviewHistory: completedTurns.map((t) => ({
          question: t.question,
          answer: t.answer,
          score: t.evaluation.score,
          grade: t.evaluation.grade,
          category: t.category,
        })),
      });
      setSessionScorecard(scorecard);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate session scorecard.');
    } finally {
      setGeneratingScorecard(false);
    }
  };

  const handleResetSession = () => {
    setQuestionData(null);
    setAskedQuestions([]);
    setCurrentEvaluation(null);
    setUserAnswer('');
    setCompletedTurns([]);
    setSessionScorecard(null);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Mic className="w-4 h-4" />
            <span>AI Interview Trainer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
            AI Interview Simulator & Critique
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Practice Technical, HR, Aptitude, Coding, Behavioral, or Mixed rounds with non-repeating questions and rubric feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPermissionsModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:border-orange-500 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">Device Permissions</span>
          </button>

          {completedTurns.length > 0 && !sessionScorecard && (
            <button
              onClick={handleFinishSession}
              disabled={generatingScorecard}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>{generatingScorecard ? 'Scoring...' : 'View Scorecard'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Config */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Target Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Interview Type</label>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value as any)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              {interviewTypes.map((t) => (
                <option key={t} value={t}>{t} Round</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Difficulty Level</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              {difficulties.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Questions in Session</label>
            <select
              value={questionCountTarget}
              onChange={(e) => setQuestionCountTarget(Number(e.target.value) as 3 | 5 | 8)}
              disabled={!!questionData && !sessionScorecard}
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
            >
              <option value={3}>3 Questions (Quick Drill)</option>
              <option value={5}>5 Questions (Standard)</option>
              <option value={8}>8 Questions (Full Round)</option>
            </select>
          </div>
        </div>

        {role === 'Custom Target Role' && (
          <input
            type="text"
            value={customRole}
            onChange={(e) => setCustomRole(e.target.value)}
            placeholder="Enter custom target job role..."
            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500"
          />
        )}

        {!questionData && !sessionScorecard && (
          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Non-repeating AI questions tailored for {effectiveRole}
            </span>
            <button
              onClick={handleStartQuestion}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Drafting Question...' : 'Start Interview'}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-700 dark:text-red-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPermissionsModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-[11px] font-bold"
          >
            <Sliders className="w-3 h-3" /> Permissions
          </button>
        </div>
      )}

      {/* Active Question */}
      {questionData && !sessionScorecard && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-600 dark:text-amber-400 text-[11px] font-bold">
                Question {Math.min(completedTurns.length + 1, questionCountTarget)} of {questionCountTarget}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">• {questionData.category}</span>
            </div>
            <span className="text-xs text-zinc-400">{effectiveRole}</span>
          </div>

          <div className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-relaxed">
            {questionData.question}
          </div>

          {questionData.keyAspectsToLookFor?.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Evaluation Criteria</span>
              </div>
              <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5">
                {questionData.keyAspectsToLookFor.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Your Answer</label>
              <button
                type="button"
                onClick={handleSpeechToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  isListening
                    ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Explain concepts clearly, mention trade-offs or STAR details..."
              className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3.5 text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-orange-500 resize-none"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleStartQuestion}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                Skip Question
              </button>

              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={evaluating || !userAnswer.trim()}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : ''}`} />
                <span>{evaluating ? 'Evaluating...' : 'Submit Answer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Breakdown */}
      {currentEvaluation && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span className="font-extrabold text-sm text-zinc-900 dark:text-white">Rubric Feedback</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-orange-500/15 text-orange-600 dark:text-amber-400">
                {currentEvaluation.grade}
              </span>
              <span className="text-xl font-black text-orange-600 dark:text-amber-400">
                {currentEvaluation.score} / 100
              </span>
            </div>
          </div>

          {currentEvaluation.constructiveFeedback && (
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {currentEvaluation.constructiveFeedback}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Correct Points
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {(currentEvaluation.correctPoints || currentEvaluation.strengths || []).map((s, idx) => (
                  <li key={idx}>• {s}</li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Missing Information
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {(currentEvaluation.missingInformation || currentEvaluation.areasForImprovement || []).map((m, idx) => (
                  <li key={idx}>• {m}</li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1.5">
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Mistakes / Gaps
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {(currentEvaluation.mistakes?.length ? currentEvaluation.mistakes : currentEvaluation.areasForImprovement || []).map((m, idx) => (
                  <li key={idx}>• {m}</li>
                ))}
              </ul>
            </div>
          </div>

          {currentEvaluation.idealAnswerSummary && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1">
              <div className="text-xs font-bold text-orange-600 dark:text-amber-400">Model / Stronger Answer Outline</div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{currentEvaluation.idealAnswerSummary}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <span className="text-xs text-zinc-500">
              Completed {completedTurns.length} / {questionCountTarget} questions
            </span>
            <div className="flex items-center gap-2">
              {completedTurns.length < questionCountTarget && (
                <button
                  type="button"
                  onClick={handleStartQuestion}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-bold"
                >
                  <span>Next Question</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleFinishSession}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-500"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Generate Final Scorecard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scorecard */}
      {sessionScorecard && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] p-7 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase text-orange-600 dark:text-amber-400">Final Assessment</span>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Interview Session Scorecard</h2>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-orange-600 dark:text-amber-400">{sessionScorecard.overallScore} / 100</div>
              <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{sessionScorecard.readinessGrade}</div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{sessionScorecard.executiveSummary}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Strengths</div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {sessionScorecard.topStrengths?.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-orange-600 dark:text-amber-400">Areas to Focus</div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {sessionScorecard.areasToFocus?.map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            </div>
          </div>

          {sessionScorecard.recommendedStudyActions?.length > 0 && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-500" /> Next Preparation Actions
              </div>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                {sessionScorecard.recommendedStudyActions.map((act, idx) => (
                  <li key={idx}>{idx + 1}. {act}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleResetSession}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-500"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start New Interview
            </button>
          </div>
        </div>
      )}

      <DevicePermissionsModal isOpen={showPermissionsModal} onClose={() => setShowPermissionsModal(false)} />
    </div>
  );
};
