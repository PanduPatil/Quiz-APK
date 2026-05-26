import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ChevronRight, Trash2 } from "lucide-react";

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [open, setOpen] = useState(false);
  const emptyForm = { title: "", description: "", duration_minutes: 30, total_questions: 10, topics: "", generation_instructions: "", question_type: "mcq", adaptive: true, max_violations: 3 };
  const [form, setForm] = useState(emptyForm);
  const nav = useNavigate();

  const load = () => api.get("/quizzes").then(r => setQuizzes(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await api.post("/quizzes", {
        ...form,
        topics: form.topics.split(",").map(s => s.trim()).filter(Boolean),
        duration_minutes: Number(form.duration_minutes),
        total_questions: Number(form.total_questions),
        max_violations: Number(form.max_violations),
      });
      setOpen(false);
      setForm(emptyForm);
      load();
      toast.success("Quiz created");
    } catch (e) { toast.error("Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this quiz and its questions?")) return;
    await api.delete(`/quizzes/${id}`);
    load();
  };

  return (
    <div className="p-8 lg:p-12" data-testid="admin-quizzes">
      <div className="flex items-center justify-between">
        <div>
          <div className="label-mono">Question banks</div>
          <h1 className="font-heading text-4xl font-bold tracking-tight mt-1">Quizzes</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-sm bg-zinc-900 hover:bg-zinc-800 h-11" data-testid="create-quiz-button">
              <Plus className="w-4 h-4 mr-2"/>New quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-sm max-h-[85vh] overflow-auto">
            <DialogHeader><DialogTitle className="font-heading">Create quiz</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="rounded-sm mt-1" data-testid="quiz-title-input"/></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="rounded-sm mt-1"/></div>
              <div><Label>AI generation details</Label><Textarea value={form.generation_instructions} onChange={e => setForm({...form, generation_instructions: e.target.value})} placeholder="Syllabus, grade, chapters, outcome, language, difficulty mix, examples to include or avoid" className="rounded-sm mt-1"/></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} className="rounded-sm mt-1"/></div>
                <div><Label>Questions</Label><Input type="number" value={form.total_questions} onChange={e => setForm({...form, total_questions: e.target.value})} className="rounded-sm mt-1"/></div>
                <div><Label>Max violations</Label><Input type="number" value={form.max_violations} onChange={e => setForm({...form, max_violations: e.target.value})} className="rounded-sm mt-1"/></div>
              </div>
              <div>
                <Label>Question type</Label>
                <Select value={form.question_type} onValueChange={(v) => setForm({...form, question_type: v})}>
                  <SelectTrigger className="rounded-sm mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="coding">Coding</SelectItem>
                    <SelectItem value="composite">Composite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Topics (comma-separated)</Label><Input value={form.topics} onChange={e => setForm({...form, topics: e.target.value})} placeholder="Python, JavaScript" className="rounded-sm mt-1"/></div>
              <Button onClick={create} className="w-full rounded-sm bg-zinc-900 hover:bg-zinc-800" data-testid="submit-create-quiz">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-10 border border-zinc-200">
        {quizzes.length === 0 && <div className="p-8 text-center text-zinc-500">No quizzes. Create your first one.</div>}
        {quizzes.map((q, i) => (
          <div key={q.id} className={`flex items-center justify-between p-5 ${i !== 0 ? "border-t border-zinc-200" : ""} hover:bg-zinc-50 btn-hover`} data-testid={`quiz-row-${q.id}`}>
            <div className="flex-1">
              <div className="label-mono mb-1">{q.topics?.join(" - ") || "General"}</div>
              <div className="font-heading text-lg font-semibold">{q.title}</div>
              <div className="text-xs text-zinc-500 font-mono mt-1">{q.duration_minutes} min - {q.approved_question_count ?? q.question_count}/{q.total_questions} approved - {q.pending_question_count || 0} pending - {q.assigned_to?.length || 0} assigned</div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => nav(`/admin/quizzes/${q.id}`)} className="rounded-sm" data-testid={`edit-quiz-${q.id}`}>
                Manage <ChevronRight className="w-4 h-4 ml-1"/>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => del(q.id)} className="text-rose-600 hover:text-rose-700 rounded-sm" data-testid={`delete-quiz-${q.id}`}>
                <Trash2 className="w-4 h-4"/>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
