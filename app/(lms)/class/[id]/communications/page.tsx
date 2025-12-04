"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  MessageSquare,
  Phone,
  Mail,
  Users,
  Plus,
  Check,
  X,
  Loader2,
  Calendar,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getCourseCommunications,
  getLTContactStatus,
  createCommunication,
} from "@/lib/api/communications";
import type {
  CommunicationWithDetails,
  LTContactStatus,
  CommunicationType,
  ContactPeriod,
  Semester,
  CreateCommunicationInput,
} from "@/types/communications";
import {
  getCurrentAcademicYear,
  getCurrentSemester,
  getSemesterOptions,
  formatContactPeriod,
  formatCommunicationType,
} from "@/types/communications";

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
}

interface CourseInfo {
  id: string;
  course_type: "LT" | "IT" | "KCFS";
  teacher_id: string | null;
}

export default function ClassCommunicationsPage() {
  const params = useParams();
  const classId = params?.id as string;
  const { userPermissions } = useAuth();

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [courses, setCourses] = useState<CourseInfo[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseInfo | null>(null);
  const [communications, setCommunications] = useState<CommunicationWithDetails[]>([]);
  const [ltStatus, setLtStatus] = useState<LTContactStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Semester selection
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [semester, setSemester] = useState<Semester>(getCurrentSemester());
  const semesterOptions = getSemesterOptions();

  // New communication dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [newComm, setNewComm] = useState<Partial<CreateCommunicationInput>>({
    communication_type: "phone_call",
    contact_period: "ad_hoc",
    content: "",
  });
  const [saving, setSaving] = useState(false);

  // Students list for the dialog
  const [students, setStudents] = useState<{ id: string; full_name: string; student_id: string }[]>([]);

  const isLTCourse = selectedCourse?.course_type === "LT";

  // Fetch class and courses info
  useEffect(() => {
    async function fetchClassInfo() {
      if (!classId) return;

      try {
        // Get class info
        const { data: classData, error: classError } = await supabase
          .from("classes")
          .select("id, name, grade")
          .eq("id", classId)
          .single();

        if (classError) throw classError;
        setClassInfo(classData);

        // Get courses for this class
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("id, course_type, teacher_id")
          .eq("class_id", classId);

        if (coursesError) throw coursesError;
        setCourses(coursesData || []);

        // Auto-select course based on user's teacher type
        if (coursesData && coursesData.length > 0) {
          const userCourse = coursesData.find(
            (c) => c.course_type === userPermissions?.teacher_type
          );
          setSelectedCourse(userCourse ?? coursesData[0] ?? null);
        }

        // Get students in this class
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, full_name, student_id")
          .eq("class_id", classId)
          .order("full_name");

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
      } catch (err) {
        console.error("Failed to fetch class info:", err);
        setError(err instanceof Error ? err.message : "Failed to load class info");
      }
    }

    fetchClassInfo();
  }, [classId, userPermissions?.teacher_type]);

  // Fetch communications when course or semester changes
  const fetchCommunications = useCallback(async () => {
    if (!selectedCourse) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch communications
      const comms = await getCourseCommunications(
        selectedCourse.id,
        academicYear,
        semester
      );
      setCommunications(comms);

      // If LT course, also fetch contact status
      if (selectedCourse.course_type === "LT") {
        const status = await getLTContactStatus(
          selectedCourse.id,
          academicYear,
          semester
        );
        setLtStatus(status);
      } else {
        setLtStatus([]);
      }
    } catch (err) {
      console.error("Failed to fetch communications:", err);
      setError(err instanceof Error ? err.message : "Failed to load communications");
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, academicYear, semester]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  // Handle new communication
  const handleAddCommunication = async () => {
    if (!selectedCourse || !selectedStudent || !newComm.content) return;

    setSaving(true);
    try {
      await createCommunication({
        student_id: selectedStudent,
        course_id: selectedCourse.id,
        academic_year: academicYear,
        semester: semester,
        communication_type: newComm.communication_type || "phone_call",
        contact_period: newComm.contact_period || null,
        subject: newComm.subject || null,
        content: newComm.content,
        is_lt_required: isLTCourse && newComm.contact_period !== "ad_hoc",
      });

      // Refresh data
      await fetchCommunications();

      // Reset form
      setShowNewDialog(false);
      setSelectedStudent(null);
      setNewComm({
        communication_type: "phone_call",
        contact_period: "ad_hoc",
        content: "",
      });
    } catch (err) {
      console.error("Failed to create communication:", err);
      setError(err instanceof Error ? err.message : "Failed to save communication");
    } finally {
      setSaving(false);
    }
  };

  // Open dialog with pre-selected student
  const openNewDialog = (studentId?: string, period?: ContactPeriod) => {
    setSelectedStudent(studentId || null);
    setNewComm({
      communication_type: "phone_call",
      contact_period: period || "ad_hoc",
      content: "",
    });
    setShowNewDialog(true);
  };

  // Get communication type icon
  const getTypeIcon = (type: CommunicationType) => {
    switch (type) {
      case "phone_call":
        return <Phone className="w-4 h-4" />;
      case "email":
        return <Mail className="w-4 h-4" />;
      case "in_person":
        return <Users className="w-4 h-4" />;
      case "message":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Calculate LT completion stats
  const ltStats = {
    total: ltStatus.length,
    semesterStart: ltStatus.filter((s) => s.semester_start).length,
    midterm: ltStatus.filter((s) => s.midterm).length,
    final: ltStatus.filter((s) => s.final).length,
    complete: ltStatus.filter((s) => s.completed_count === 3).length,
  };

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <MessageSquare className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Communications - {classInfo?.name || "Loading..."}
              </h1>
              <p className="text-sm text-white/60">
                {isLTCourse
                  ? "Track parent phone calls and communications"
                  : "Student notes and memos"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => openNewDialog()}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New {isLTCourse ? "Call" : "Note"}
          </Button>
        </div>

        {/* Course and Semester Selectors */}
        <div className="flex gap-4">
          {/* Course Type Selector */}
          <div className="flex gap-2">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => setSelectedCourse(course)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCourse?.id === course.id
                    ? course.course_type === "LT"
                      ? "bg-green-500 text-white"
                      : course.course_type === "IT"
                      ? "bg-blue-500 text-white"
                      : "bg-purple-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {course.course_type}
              </button>
            ))}
          </div>

          {/* Semester Selector */}
          <Select
            value={`${academicYear}_${semester}`}
            onValueChange={(value) => {
              const parts = value.split("_");
              if (parts[0]) setAcademicYear(parts[0]);
              if (parts[1]) setSemester(parts[1] as Semester);
            }}
          >
            <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* LT Progress Cards (only for LT courses) */}
            {isLTCourse && (
              <div className="grid grid-cols-5 gap-4">
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-2xl font-bold text-white">{ltStats.total}</div>
                  <div className="text-xs text-white/40">Total Students</div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {ltStats.semesterStart}/{ltStats.total}
                  </div>
                  <div className="text-xs text-white/40">Semester Start</div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-2xl font-bold text-amber-400">
                    {ltStats.midterm}/{ltStats.total}
                  </div>
                  <div className="text-xs text-white/40">Midterm</div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {ltStats.final}/{ltStats.total}
                  </div>
                  <div className="text-xs text-white/40">Final</div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {Math.round((ltStats.complete / ltStats.total) * 100 || 0)}%
                  </div>
                  <div className="text-xs text-white/40">Complete (3/3)</div>
                </div>
              </div>
            )}

            {/* LT Contact Status Table */}
            {isLTCourse && ltStatus.length > 0 && (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">
                    Phone Call Progress
                  </h2>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-sm font-medium text-white/60">
                        Student
                      </th>
                      <th className="text-center p-4 text-sm font-medium text-white/60">
                        Semester Start
                      </th>
                      <th className="text-center p-4 text-sm font-medium text-white/60">
                        Midterm
                      </th>
                      <th className="text-center p-4 text-sm font-medium text-white/60">
                        Final
                      </th>
                      <th className="text-left p-4 text-sm font-medium text-white/60">
                        Latest Contact
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-white/60">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ltStatus.map((status) => (
                      <tr
                        key={status.student_id}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="p-4">
                          <div className="text-white font-medium">
                            {status.student_name}
                          </div>
                          <div className="text-xs text-white/40">
                            {status.student_number}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {status.semester_start ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <button
                              onClick={() =>
                                openNewDialog(status.student_id, "semester_start")
                              }
                              className="p-1 rounded hover:bg-white/10"
                            >
                              <X className="w-5 h-5 text-white/20 hover:text-red-400" />
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {status.midterm ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <button
                              onClick={() =>
                                openNewDialog(status.student_id, "midterm")
                              }
                              className="p-1 rounded hover:bg-white/10"
                            >
                              <X className="w-5 h-5 text-white/20 hover:text-red-400" />
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {status.final ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : (
                            <button
                              onClick={() =>
                                openNewDialog(status.student_id, "final")
                              }
                              className="p-1 rounded hover:bg-white/10"
                            >
                              <X className="w-5 h-5 text-white/20 hover:text-red-400" />
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-white/40 text-sm">
                          {status.latest_contact_date
                            ? new Date(status.latest_contact_date).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openNewDialog(status.student_id)}
                            className="text-purple-400 hover:text-purple-300"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* IT/KCFS Simple Notes List */}
            {!isLTCourse && (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">Student Notes</h2>
                </div>
                {students.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60">No students in this class</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {students.map((student) => {
                      const studentComms = communications.filter(
                        (c) => c.student_id === student.id
                      );
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-4 hover:bg-white/5"
                        >
                          <div>
                            <div className="text-white font-medium">
                              {student.full_name}
                            </div>
                            <div className="text-xs text-white/40">
                              {studentComms.length} note
                              {studentComms.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openNewDialog(student.id)}
                            className="text-purple-400 hover:text-purple-300"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Note
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Recent Communications */}
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  Recent Communications ({communications.length})
                </h2>
              </div>
              {communications.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No communications recorded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {communications.slice(0, 20).map((comm) => (
                    <div key={comm.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              comm.communication_type === "phone_call"
                                ? "bg-green-500/20 text-green-400"
                                : comm.communication_type === "email"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-purple-500/20 text-purple-400"
                            }`}
                          >
                            {getTypeIcon(comm.communication_type)}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {comm.student.full_name}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                              <span>{formatCommunicationType(comm.communication_type)}</span>
                              {comm.contact_period && (
                                <>
                                  <span>•</span>
                                  <span>{formatContactPeriod(comm.contact_period)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40">
                          <Calendar className="w-3 h-3" />
                          {new Date(comm.communication_date).toLocaleDateString()}
                        </div>
                      </div>
                      {comm.subject && (
                        <div className="text-sm text-white/80 font-medium mb-1">
                          {comm.subject}
                        </div>
                      )}
                      <p className="text-sm text-white/60 line-clamp-2">{comm.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* New Communication Dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">
                {isLTCourse ? "Record Phone Call" : "Add Student Note"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Student Selector */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Student</label>
                <Select
                  value={selectedStudent || ""}
                  onValueChange={setSelectedStudent}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name} ({student.student_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Communication Type */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Type</label>
                <Select
                  value={newComm.communication_type}
                  onValueChange={(value) =>
                    setNewComm({ ...newComm, communication_type: value as CommunicationType })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone_call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Period (LT only) */}
              {isLTCourse && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Contact Period
                  </label>
                  <Select
                    value={newComm.contact_period || "ad_hoc"}
                    onValueChange={(value) =>
                      setNewComm({ ...newComm, contact_period: value as ContactPeriod })
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semester_start">Semester Start</SelectItem>
                      <SelectItem value="midterm">Midterm</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="ad_hoc">Ad-hoc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject (Optional) */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">
                  Subject (Optional)
                </label>
                <Input
                  value={newComm.subject || ""}
                  onChange={(e) => setNewComm({ ...newComm, subject: e.target.value })}
                  placeholder="Brief subject or title"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Content */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">
                  {isLTCourse ? "Call Notes" : "Notes"} *
                </label>
                <Textarea
                  value={newComm.content || ""}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComm({ ...newComm, content: e.target.value })}
                  placeholder={
                    isLTCourse
                      ? "Summary of phone call with parent..."
                      : "Notes about the student..."
                  }
                  className="bg-white/5 border-white/10 text-white min-h-[120px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowNewDialog(false)}
                className="text-white/60"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCommunication}
                disabled={!selectedStudent || !newComm.content || saving}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
