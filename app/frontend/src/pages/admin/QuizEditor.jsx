import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Sparkles, Users, CheckCircle2 } from "lucide-react";

export default function QuizEditor() {
  const { quizId } = useParams();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ text: "", options: ["", "", "", ""], correct_index: 0, difficulty: "medium", topic: "General" });
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ topic: "", difficulty: "medium", count: 5, details: "", question_type: "mcq" });
  const [aiLoading, setAiLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigned, setAssigned] = useState([]);

  const load = () => Promise.all([
    api.get(`/quizzes/${quizId}`).then(r => { setQuiz(r.data); setAssigned(r.data.assigned_to || []); }),
    api.get(`/quizzes/${quizId}/questions`).then(r => setQuestions(r.data)),
    api.get("/admin/users").then(r => setUsers(r.data)),
  ]);
  useEffect(() => { load(); }, [quizId]);

  const addQ = async () => {
    try {
      await api.post(`/quizzes/${quizId}/questions`, { ...form, correct_index: Number(form.correct_index) });
      setAddOpen(false);
      setForm({ text: "", options: ["", "", "", ""], correct_index: 0, difficulty: "medium", topic: "General" });
      load();
      toast.success("Question added");
    } catch (e) { toast.error("Failed"); }
  };

  const delQ = async (id) => {
    await api.delete(`/questions/${id}`);
    load();
  };

  const aiGen = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post("/questions/ai-generate", { quiz_id: quizId, ...aiForm, count: Number(aiForm.count) });
      toast.success(`Generated ${data.inserted} draft questions for approval`);
      setAiOpen(false);
      load();
    } catch (e) { toast.error("AI generation failed"); }
    finally { setAiLoading(false); }
  };

  const saveAssign = async () => {
    await api.post(`/quizzes/${quizId}/assign`, { user_ids: assigned });
    toast.success("Assignment saved");
    setAssignOpen(false);
    load();
  };

  const approveQ = async (id, approved = true) => {
    await api.post(`/questions/${id}/approve`, { approved });
    toast.success(approved ? "Question approved" : "Question moved to draft");
    load();
  };

  if (!quiz) return <div className="p-12 text-zinc-500">Loading...</div>;

  return (
    <div className="p-8 lg:p-12" data-testid="quiz-editor">
      <Button variant="ghost" size="sm" onClick={() => nav("/admin/quizzes")} className="rounded-sm" data-testid="back-to-quizzes">
        <ArrowLeft className="w-4 h-4 mr-2"/>Back
      </Button>
      <div className="mt-3 flex items-start justify-between gap-6">
        <div>
          <div className="label-mono">Quiz editor</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-1">{quiz.title}</h1>
          <p className="text-zinc-600 mt-2 max-w-2xl">{quiz.description}</p>
          <div className="mt-3 font-mono text-xs text-zinc-500">
            {quiz.duration_minutes} min - {quiz.approved_question_count ?? questions.filter(q => q.is_approved !== false).length} approved - {quiz.pending_question_count ?? questions.filter(q => q.is_approved === false).length} pending - {assigned.length} assigned
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-sm" data-testid="assign-button"><Users className="w-4 h-4 mr-2"/>Assign</Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm max-h-[80vh] overflow-auto">
              <DialogHeader><DialogTitle className="font-heading">Assign to candidates</DialogTitle></DialogHeader>
              <div className="space-y-2">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-3 border border-zinc-200 rounded-sm cursor-pointer hover:bg-zinc-50">
                    <input type="checkbox" checked={assigned.includes(u.id)}
                      onChange={(e) => setAssigned(e.target.checked ? [...assigned, u.id] : assigned.filter(x => x !== u.id))}
                      data-testid={`assign-check-${u.id}`}/>
                    <div className="flex-1"><div className="text-sm font-medium">{u.name}</div><div className="text-xs text-zinc-500">{u.email}</div></div>
                  </label>
                ))}
                <Button onClick={saveAssign} className="w-full rounded-sm bg-zinc-900 hover:bg-zinc-800" data-testid="save-assign-button">Save</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-sm" data-testid="ai-generate-button"><Sparkles className="w-4 h-4 mr-2"/>AI generate</Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm">
              <DialogHeader><DialogTitle className="font-heading">AI-generate questions</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Topic</Label><Input value={aiForm.topic} onChange={e => setAiForm({...aiForm, topic: e.target.value})} placeholder={quiz.topics?.join(", ") || "Use quiz details"} className="rounded-sm mt-1" data-testid="ai-topic-input"/></div>
                <div><Label>Extra details for this batch</Label><Textarea value={aiForm.details} onChange={e => setAiForm({...aiForm, details: e.target.value})} placeholder="Chapter, learning objectives, grade level, language, concepts to include or avoid" className="rounded-sm mt-1"/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={aiForm.difficulty} onValueChange={(v) => setAiForm({...aiForm, difficulty: v})}>
                      <SelectTrigger className="rounded-sm mt-1" data-testid="ai-difficulty-select"><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Count</Label><Input type="number" min="1" max="10" value={aiForm.count} onChange={e => setAiForm({...aiForm, count: e.target.value})} className="rounded-sm mt-1" data-testid="ai-count-input"/></div>
                </div>
                <Button onClick={aiGen} disabled={aiLoading} className="w-full rounded-sm bg-zinc-900 hover:bg-zinc-800" data-testid="ai-submit-button">
                  {aiLoading ? "Generating..." : "Generate draft questions"}
                </Button>
                <p className="text-xs text-zinc-500 font-mono">Uses the backend local Hugging Face model. Generated questions stay pending until approved.</p>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-sm bg-zinc-900 hover:bg-zinc-800" data-testid="add-question-button"><Plus className="w-4 h-4 mr-2"/>Add</Button>
            </DialogTrigger>
            <DialogContent className="rounded-sm max-h-[85vh] overflow-auto">
              <DialogHeader><DialogTitle className="font-heading">Add question</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Question</Label><Textarea value={form.text} onChange={e => setForm({...form, text: e.target.value})} className="rounded-sm mt-1" data-testid="q-text-input"/></div>
                {form.options.map((o, i) => (
                  <div key={i}><Label>Option {String.fromCharCode(65+i)}</Label>
                    <Input value={o} onChange={e => { const no = [...form.options]; no[i] = e.target.value; setForm({...form, options: no}); }} className="rounded-sm mt-1" data-testid={`q-option-${i}`}/></div>
                ))}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Correct</Label>
                    <Select value={String(form.correct_index)} onValueChange={(v) => setForm({...form, correct_index: Number(v)})}>
                      <SelectTrigger className="rounded-sm mt-1" data-testid="q-correct-select"><SelectValue/></SelectTrigger>
                      <SelectContent>{[0,1,2,3].map(i => <SelectItem key={i} value={String(i)}>{String.fromCharCode(65+i)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={(v) => setForm({...form, difficulty: v})}>
                      <SelectTrigger className="rounded-sm mt-1"><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Topic</Label><Input value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} className="rounded-sm mt-1"/></div>
                </div>
                <Button onClick={addQ} className="w-full rounded-sm bg-zinc-900 hover:bg-zinc-800" data-testid="submit-add-question">Save question</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="mt-8 border border-zinc-200">
        {questions.length === 0 && <div className="p-8 text-center text-zinc-500">No questions yet. Add manually or use AI.</div>}
        {questions.map((q, i) => {
          const isApproved = q.is_approved !== false;
          return (
          <div key={q.id} className={`p-5 ${i !== 0 ? "border-t border-zinc-200" : ""}`} data-testid={`question-row-${q.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="label-mono">Q{i + 1}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm bg-zinc-100 border border-zinc-200">{q.difficulty}</span>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm border ${isApproved ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>{isApproved ? "approved" : "pending"}</span>
                  {q.source === "ai" && <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm bg-violet-50 border border-violet-200 text-violet-700">AI</span>}
                  <span className="text-[10px] font-mono text-zinc-500">{q.topic}</span>
                </div>
                <div className="text-sm font-medium">{q.text}</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {q.options.map((opt, idx) => (
                    <div key={idx} className={`text-xs font-mono p-2 border rounded-sm ${idx === q.correct_index ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-zinc-200"}`}>
                      {String.fromCharCode(65+idx)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isApproved && (
                  <Button variant="ghost" size="icon" onClick={() => approveQ(q.id, true)} className="text-emerald-700 rounded-sm" data-testid={`approve-question-${q.id}`}>
                    <CheckCircle2 className="w-4 h-4"/>
                  </Button>
                )}
                {isApproved && q.source === "ai" && (
                  <Button variant="ghost" size="sm" onClick={() => approveQ(q.id, false)} className="rounded-sm text-amber-700">
                    Draft
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => delQ(q.id)} className="text-rose-600 rounded-sm" data-testid={`delete-question-${q.id}`}>
                  <Trash2 className="w-4 h-4"/>
                </Button>
              </div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}
